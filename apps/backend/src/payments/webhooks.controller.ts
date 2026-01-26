import {
  BadRequestException,
  Controller,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { RawBodyRequest } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RazorpayService } from './razorpay.service';
import { OrdersService } from '../orders/orders.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly razorpayService: RazorpayService,
    private readonly ordersService: OrdersService,
    private readonly subscriptionsService: SubscriptionsService
  ) {}

  @Post('razorpay')
  @HttpCode(200)
  async handleRazorpayWebhook(@Req() req: Request) {
    console.log('=== WEBHOOK DEBUG START ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body exists:', !!req.body);
    console.log('Body type:', typeof req.body);
    console.log('Body length:', req.body?.length);

    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const payload = req.body?.toString();

    console.log('Signature exists:', !!signature);
    console.log('Signature value:', signature);
    console.log('Payload exists:', !!payload);
    console.log('Payload length:', payload?.length);

    if (!payload) {
      console.log('ERROR: Missing payload');
      throw new BadRequestException('Missing payload');
    }

    const valid = this.razorpayService.verifyWebhookSignature(payload, signature);
    console.log('Signature validation result:', valid);

    if (!valid) {
      console.log('ERROR: Invalid signature');
      throw new BadRequestException('Invalid signature');
    }

    console.log('Signature validation passed');

    let event: any;
    try {
      event = JSON.parse(payload);
      console.log('Parsed event:', JSON.stringify(event, null, 2));
    } catch (error) {
      console.log('ERROR: Invalid payload JSON', error);
      throw new BadRequestException('Invalid payload JSON');
    }

    // Check if this is a subscription payment or order payment
    const paymentEntity = event?.payload?.payment?.entity;
    const notes = paymentEntity?.notes || {};

    console.log('Payment entity:', JSON.stringify(paymentEntity, null, 2));
    console.log('Notes:', JSON.stringify(notes, null, 2));

    if (notes.type === 'subscription') {
      console.log('Processing subscription payment');
      // Handle subscription payment
      const restaurantId = notes.restaurantId;
      const paymentStatus = event.event === 'payment.captured' ? 'success' : 'failed';

      await this.subscriptionsService.handleSubscriptionPayment(
        restaurantId,
        paymentEntity.order_id,
        paymentStatus
      );
    } else {
      // Check if this is a subscription authentication payment
      if (event.event === 'payment.authorized' && paymentEntity?.description === 'Subscription Authentication Payment' && paymentEntity?.customer_id) {
        console.log(`🎯 Detected subscription authentication payment: ${paymentEntity.id}`);

        try {
          // Find subscription by customer ID
          const subscriptions = await this.subscriptionsService.getSubscriptionsByCustomerId(paymentEntity.customer_id);
          console.log(`Found ${subscriptions.length} subscriptions for customer ${paymentEntity.customer_id}`);

          if (subscriptions && subscriptions.length > 0) {
            // Update the most recent 'created' subscription to 'authenticated'
            const createdSubscription = subscriptions.find(sub => sub.status === 'created');
            console.log(`Found created subscription:`, createdSubscription ? createdSubscription.razorpaySubscriptionId : 'none');

            if (createdSubscription) {
              await this.subscriptionsService.updateSubscriptionStatus(
                createdSubscription.id,
                'authenticated'
              );

              console.log(`✅ Subscription ${createdSubscription.razorpaySubscriptionId} authenticated via payment ${paymentEntity.id}`);
            } else {
              console.warn(`No 'created' subscription found for customer ${paymentEntity.customer_id}`);
            }
          } else {
            console.warn(`No subscriptions found for customer ${paymentEntity.customer_id}`);
          }
        } catch (error) {
          console.error(`Error updating subscription status for payment ${paymentEntity.id}:`, error);
        }
      } else {
        console.log('Processing order payment');
        // Handle order payment
        await this.ordersService.handleRazorpayWebhook(event);
      }
    }

    console.log('=== WEBHOOK DEBUG END ===');
    return { status: 'ok' };
  }
}