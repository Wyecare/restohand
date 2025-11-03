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
  async handleRazorpayWebhook(@Req() req: RawBodyRequest<Request>) {
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const payload = req.rawBody?.toString();

    if (!payload) {
      throw new BadRequestException('Missing payload');
    }

    const valid = this.razorpayService.verifyWebhookSignature(payload, signature);
    if (!valid) {
      throw new BadRequestException('Invalid signature');
    }

    let event: any;
    try {
      event = JSON.parse(payload);
    } catch (error) {
      throw new BadRequestException('Invalid payload JSON');
    }

    // Check if this is a subscription payment or order payment
    const paymentEntity = event?.payload?.payment?.entity;
    const notes = paymentEntity?.notes || {};

    if (notes.type === 'subscription') {
      // Handle subscription payment
      const restaurantId = notes.restaurantId;
      const paymentStatus = event.event === 'payment.captured' ? 'success' : 'failed';

      await this.subscriptionsService.handleSubscriptionPayment(
        restaurantId,
        paymentEntity.order_id,
        paymentStatus
      );
    } else {
      // Handle order payment
      await this.ordersService.handleRazorpayWebhook(event);
    }

    return { status: 'ok' };
  }
}