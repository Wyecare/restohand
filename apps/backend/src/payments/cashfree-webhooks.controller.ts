import {
  BadRequestException,
  Controller,
  HttpCode,
  Post,
  Req,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { CashfreeService } from './cashfree.service';
import { OrdersService } from '../orders/orders.service';
import { CashfreeSubscriptionService } from '../subscriptions/cashfree-subscription.service';

@ApiTags('webhooks')
@Controller('webhooks/cashfree')
export class CashfreeWebhooksController {
  private readonly logger = new Logger(CashfreeWebhooksController.name);

  constructor(
    private readonly cashfreeService: CashfreeService,
    private readonly ordersService: OrdersService,
    private readonly cashfreeSubscriptionService: CashfreeSubscriptionService
  ) {}

  @Post('payments')
  @HttpCode(200)
  async handlePaymentWebhook(@Req() req: Request) {
    this.logger.log('=== CASHFREE PAYMENT WEBHOOK START ===');
    this.logger.log('Headers:', JSON.stringify(req.headers, null, 2));
    this.logger.log('Body exists:', !!req.body);
    this.logger.log('Body type:', typeof req.body);

    const signature = req.headers['x-webhook-signature'] as string | undefined;
    const timestamp = req.headers['x-webhook-timestamp'] as string | undefined;

    // Get the raw payload
    let payload: string;
    if ((req as any).rawBody) {
      payload = (req as any).rawBody;
    } else if (Buffer.isBuffer(req.body)) {
      payload = req.body.toString('utf8');
    } else {
      payload = JSON.stringify(req.body);
    }

    this.logger.log('Signature exists:', !!signature);
    this.logger.log('Payload exists:', !!payload);
    this.logger.log('Payload length:', payload?.length);

    if (!payload) {
      this.logger.log('ERROR: Missing payload');
      throw new BadRequestException('Missing payload');
    }

    const valid = this.cashfreeService.verifyWebhookSignature(
      payload,
      signature,
      timestamp
    );
    this.logger.log('Signature validation result:', valid);

    if (!valid) {
      this.logger.log('ERROR: Invalid signature');
      throw new BadRequestException('Invalid signature');
    }

    this.logger.log('Signature validation passed');

    let event: any;
    try {
      if (Buffer.isBuffer(req.body)) {
        event = JSON.parse(req.body.toString('utf8'));
      } else if (typeof req.body === 'string') {
        event = JSON.parse(req.body);
      } else {
        event = req.body;
      }
      this.logger.log('Parsed event:', JSON.stringify(event, null, 2));
    } catch (error) {
      this.logger.log('ERROR: Invalid payload JSON', error);
      throw new BadRequestException('Invalid payload JSON');
    }

    // Check if this is a subscription-related webhook
    const isSubscriptionWebhook = this.isSubscriptionRelatedEvent(event);

    if (isSubscriptionWebhook) {
      this.logger.log('Detected subscription webhook, routing to subscription service');
      // Handle subscription webhook
      await this.handleSubscriptionEvent(event);
    } else {
      const webhookId = `WEBHOOK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      this.logger.log('🌐 DETECTED REGULAR PAYMENT WEBHOOK:', {
        webhookId,
        eventType: event.type,
        eventData: event.data,
        orderId: event?.data?.order?.order_id,
        paymentId: event?.data?.payment?.cf_payment_id,
        amount: event?.data?.order?.order_amount,
        timestamp: new Date().toISOString()
      });

      // Handle regular payment webhook - delegate to OrdersService just like Razorpay
      await this.ordersService.handleCashfreeWebhook(event);

      this.logger.log('✅ WEBHOOK PROCESSING COMPLETED:', {
        webhookId,
        orderId: event?.data?.order?.order_id
      });
    }

    this.logger.log('=== CASHFREE PAYMENT WEBHOOK END ===');
    return { status: 'ok' };
  }

  @Post('settlements')
  @HttpCode(200)
  async handleSettlementWebhook(@Req() req: Request) {
    this.logger.log('=== CASHFREE SETTLEMENT WEBHOOK START ===');
    this.logger.log('Headers:', JSON.stringify(req.headers, null, 2));

    const signature = req.headers['x-webhook-signature'] as string | undefined;
    const timestamp = req.headers['x-webhook-timestamp'] as string | undefined;

    // Get the raw payload
    let payload: string;
    if ((req as any).rawBody) {
      payload = (req as any).rawBody;
    } else if (Buffer.isBuffer(req.body)) {
      payload = req.body.toString('utf8');
    } else {
      payload = JSON.stringify(req.body);
    }

    if (!payload) {
      this.logger.log('ERROR: Missing payload');
      throw new BadRequestException('Missing payload');
    }

    const valid = this.cashfreeService.verifyWebhookSignature(
      payload,
      signature,
      timestamp
    );
    if (!valid) {
      this.logger.log('ERROR: Invalid signature');
      throw new BadRequestException('Invalid signature');
    }

    let event: any;
    try {
      if (Buffer.isBuffer(req.body)) {
        event = JSON.parse(req.body.toString('utf8'));
      } else if (typeof req.body === 'string') {
        event = JSON.parse(req.body);
      } else {
        event = req.body;
      }
      this.logger.log(
        'Parsed settlement event:',
        JSON.stringify(event, null, 2)
      );
    } catch (error) {
      this.logger.log('ERROR: Invalid payload JSON', error);
      throw new BadRequestException('Invalid payload JSON');
    }

    // Handle settlement webhook - delegate to OrdersService
    await this.ordersService.handleCashfreeSettlementWebhook(event);

    this.logger.log('=== CASHFREE SETTLEMENT WEBHOOK END ===');
    return { status: 'ok' };
  }

  private isSubscriptionRelatedEvent(event: Record<string, unknown>): boolean {
    // Check if the order_id follows the Cashfree subscription pattern
    const orderId = event?.data?.order?.order_id;

    // Cashfree subscription order IDs typically follow pattern: cf_subscription_id_cycle_timestamp
    // Example: "10864334_825_1770405011136"
    const isSubscriptionOrderId = orderId && /^\d+_\d+_\d+$/.test(orderId);

    // Also check payment_group for subscription indicators
    const paymentGroup = event?.data?.payment?.payment_group;
    const isSubscriptionPaymentGroup = paymentGroup && paymentGroup.includes('subscription') || paymentGroup === 'npci_sbc_current';

    // Check payment message for subscription indicators
    const paymentMessage = event?.data?.payment?.payment_message;
    const isSubscriptionMessage = paymentMessage && (
      paymentMessage.includes('subscription') ||
      paymentMessage.includes('Emandate') ||
      paymentMessage.includes('auto-approved')
    );

    this.logger.log(`Subscription detection: orderId=${orderId}, pattern=${isSubscriptionOrderId}, paymentGroup=${paymentGroup}, groupMatch=${isSubscriptionPaymentGroup}, message=${paymentMessage}, messageMatch=${isSubscriptionMessage}`);

    return isSubscriptionOrderId || isSubscriptionPaymentGroup || isSubscriptionMessage;
  }

  private async handleSubscriptionEvent(event: Record<string, unknown>) {
    try {
      const eventType = event.type;
      this.logger.log(`Processing subscription event: ${eventType}`);

      // Map Cashfree payment webhook events to subscription events
      let subscriptionEventType: string;

      switch (eventType) {
        case 'PAYMENT_CHARGES_WEBHOOK': {
          const paymentStatus = (event?.data as any)?.payment?.payment_status;
          if (paymentStatus === 'SUCCESS') {
            // Check if this is authorization or recurring payment
            const paymentMessage = (event?.data as any)?.payment?.payment_message;
            if (paymentMessage && paymentMessage.includes('auto-approved')) {
              subscriptionEventType = 'SUBSCRIPTION_AUTHORIZATION_SUCCESS';
            } else {
              subscriptionEventType = 'SUBSCRIPTION_PAYMENT_SUCCESS';
            }
          } else {
            subscriptionEventType = 'SUBSCRIPTION_PAYMENT_FAILED';
          }
          break;
        }
        default:
          this.logger.log(`Unhandled subscription event type: ${eventType}`);
          return;
      }

      // Extract subscription ID from order ID pattern
      const orderId = (event?.data as any)?.order?.order_id;
      let subscriptionId = null;

      if (orderId) {
        // Parse Cashfree subscription order ID: "cf_subscription_id_cycle_timestamp"
        // Example: "10864334_710_1770417409353" -> cf_subscription_id = "10864334"
        const parts = orderId.split('_');
        if (parts.length >= 3) {
          const cfSubscriptionId = parts[0]; // "10864334"
          this.logger.log(`Looking for subscription with Cashfree ID starting with: ${cfSubscriptionId}`);

          // Try multiple lookup approaches:
          // 1. Direct cf_subscription_id match
          // 2. Look for subscription created around the same time
          // 3. Use customer email to match

          subscriptionId = cfSubscriptionId; // Just pass the CF ID directly
        }
      }

      if (!subscriptionId) {
        this.logger.warn('Could not extract subscription ID from order ID:', orderId);
        return;
      }

      // Call subscription service webhook handler
      await this.cashfreeSubscriptionService.handleSubscriptionWebhook(subscriptionEventType, {
        subscription: { subscription_id: subscriptionId },
        payment: (event?.data as any)?.payment,
        order: (event?.data as any)?.order,
        original_event: event
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to handle subscription event: ${errorMessage}`, errorStack);
    }
  }
}
