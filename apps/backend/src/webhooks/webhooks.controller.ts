import { Controller, Post, Body, Headers, Logger, HttpException, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RazorpayService } from '../payments/razorpay.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { OrdersService } from '../orders/orders.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly razorpayService: RazorpayService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly ordersService: OrdersService,
  ) {}

  @Post('razorpay')
  @ApiOperation({ summary: 'Handle Razorpay webhook events' })
  async handleRazorpayWebhook(
    @Body() body: any,
    @Headers('x-razorpay-signature') signature: string,
    @Req() req: any,
  ) {
    try {
      // Get raw body for signature verification (critical for security)
      const rawBody = JSON.stringify(body);

      // Verify webhook signature
      const isValid = this.razorpayService.verifyWebhookSignature(rawBody, signature);

      if (!isValid) {
        this.logger.warn('Invalid Razorpay webhook signature', {
          signature: signature?.substring(0, 10) + '...',
          bodyLength: rawBody.length
        });
        return { error: 'Invalid signature' }; // Return 200 with error to avoid retries
      }

      // Extract event data according to Razorpay docs
      const { entity, event, payload } = body;

      if (entity !== 'event') {
        this.logger.warn(`Unexpected entity type: ${entity}`);
        return { error: 'Invalid entity type' };
      }

      this.logger.log(`Received Razorpay webhook: ${event}`, {
        event,
        contains: body.contains,
        accountId: body.account_id
      });

      // Handle different event types
      if (event.startsWith('subscription.')) {
        await this.subscriptionsService.handleSubscriptionWebhook(event, payload);
      }
      else if (event.startsWith('payment.')) {
        await this.handlePaymentEvent(event, payload);
      }
      else if (event.startsWith('order.')) {
        await this.handleOrderEvent(event, payload);
      }
      else if (event.startsWith('refund.')) {
        await this.handleRefundEvent(event, payload);
      }
      else if (event.startsWith('transfer.')) {
        await this.handleTransferEvent(event, payload);
      }
      else if (event.startsWith('settlement.')) {
        await this.handleSettlementEvent(event, payload);
      }
      else if (event.startsWith('invoice.')) {
        await this.handleInvoiceEvent(event, payload);
      }
      else {
        this.logger.log(`Unhandled webhook event: ${event}`);
      }

      // Return success response (must be 200 status code)
      return {
        status: 'success',
        event,
        processed_at: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`, {
        error: error.message,
        stack: error.stack,
        event: body?.event
      });

      // Return 200 status to prevent webhook retries for our internal errors
      // Only return 5xx for actual server issues
      return {
        status: 'error',
        message: 'Internal processing error',
        timestamp: new Date().toISOString()
      };
    }
  }

  private async handlePaymentEvent(event: string, payload: any) {
    this.logger.log(`Processing payment event: ${event}`, {
      event,
      paymentId: payload?.payment?.entity?.id,
      orderId: payload?.payment?.entity?.order_id
    });

    // Handle payment captured (successful payment)
    if (event === 'payment.captured') {
      if (!payload?.payment?.entity) {
        this.logger.error('Invalid payment.captured payload structure');
        return;
      }
      await this.handlePaymentCaptured(payload.payment.entity);
    }

    // Handle payment failed
    else if (event === 'payment.failed') {
      if (!payload?.payment?.entity) {
        this.logger.error('Invalid payment.failed payload structure');
        return;
      }
      await this.handlePaymentFailed(payload.payment.entity);
    }

    // Handle payment authorized (late authorization case)
    else if (event === 'payment.authorized') {
      if (!payload?.payment?.entity) {
        this.logger.error('Invalid payment.authorized payload structure');
        return;
      }
      // For now, log this - we might want to handle late authorization differently
      this.logger.log('Payment authorized (not yet captured)', {
        paymentId: payload.payment.entity.id,
        orderId: payload.payment.entity.order_id,
        amount: payload.payment.entity.amount
      });
    }
  }

  private async handleOrderEvent(event: string, payload: any) {
    this.logger.log(`Processing order event: ${event}`, {
      event,
      orderId: payload?.order?.entity?.id,
      paymentId: payload?.payment?.entity?.id
    });

    // Handle order paid (when all payments for an order are complete)
    if (event === 'order.paid') {
      if (!payload?.order?.entity) {
        this.logger.error('Invalid order.paid payload structure');
        return;
      }
      // order.paid includes both order and payment entities
      await this.handleOrderPaid(payload.order.entity, payload.payment?.entity);
    }
  }

  private async handlePaymentCaptured(payment: any) {
    try {
      this.logger.log(`Payment captured: ${payment.id}, Order: ${payment.order_id}, Amount: ${payment.amount}`);

      // Extract our order ID from payment notes or metadata
      const ourOrderId = payment.notes?.orderId || payment.notes?.order_id || payment.description?.match(/Order\s+(\w+)/)?.[1];

      if (!ourOrderId) {
        this.logger.warn(`No order ID found in payment ${payment.id}`);
        return;
      }

      // Update order payment status
      await this.ordersService.handlePaymentCaptured(
        ourOrderId,
        payment.id,
        {
          amount: payment.amount,
          currency: payment.currency,
          method: payment.method,
          status: payment.status,
          razorpay_payment_id: payment.id,
          razorpay_order_id: payment.order_id,
          captured_at: new Date(payment.captured_at * 1000),
        }
      );

      this.logger.log(`Order ${ourOrderId} payment updated successfully`);

    } catch (error) {
      this.logger.error(`Failed to handle payment captured: ${error.message}`, error);
      throw error;
    }
  }

  private async handlePaymentFailed(payment: any) {
    try {
      this.logger.log(`Payment failed: ${payment.id}, Order: ${payment.order_id}, Error: ${payment.error_description}`);

      const ourOrderId = payment.notes?.orderId || payment.notes?.order_id || payment.description?.match(/Order\s+(\w+)/)?.[1];

      if (!ourOrderId) {
        this.logger.warn(`No order ID found in failed payment ${payment.id}`);
        return;
      }

      // Log payment failure for tracking
      await this.ordersService.handlePaymentFailed(
        ourOrderId,
        payment.id,
        {
          error_code: payment.error_code,
          error_description: payment.error_description,
          amount: payment.amount,
          currency: payment.currency,
          method: payment.method,
          failed_at: new Date(payment.created_at * 1000),
        }
      );

      this.logger.log(`Order ${ourOrderId} payment failure recorded`);

    } catch (error) {
      this.logger.error(`Failed to handle payment failure: ${error.message}`, error);
      throw error;
    }
  }

  private async handleOrderPaid(order: any, payment?: any) {
    try {
      this.logger.log(`Order fully paid: ${order.id}, Amount: ${order.amount}`, {
        orderId: order.id,
        amountPaid: order.amount_paid,
        amountDue: order.amount_due,
        paymentId: payment?.id,
        paymentMethod: payment?.method
      });

      // Extract our order ID from order notes
      const ourOrderId = order.notes?.orderId || order.notes?.order_id;

      if (!ourOrderId) {
        this.logger.warn(`No order ID found in Razorpay order ${order.id}`, {
          notes: order.notes,
          receipt: order.receipt
        });
        return;
      }

      // Mark order as fully paid with additional payment details
      await this.ordersService.handleOrderFullyPaid(ourOrderId, {
        razorpay_order_id: order.id,
        total_amount_paid: order.amount_paid,
        amount_due: order.amount_due,
        payment_method: payment?.method,
        payment_id: payment?.id,
        paid_at: new Date(),
      });

      this.logger.log(`Order ${ourOrderId} marked as fully paid`);

    } catch (error) {
      this.logger.error(`Failed to handle order paid: ${error.message}`, error);
      throw error;
    }
  }

  // Refund Event Handlers - Critical for order cancellations and customer service
  private async handleRefundEvent(event: string, payload: any) {
    this.logger.log(`Processing refund event: ${event}`, {
      event,
      refundId: payload?.refund?.entity?.id,
      paymentId: payload?.refund?.entity?.payment_id,
      amount: payload?.refund?.entity?.amount
    });

    if (event === 'refund.created') {
      await this.handleRefundCreated(payload.refund?.entity, payload.payment?.entity);
    }
    else if (event === 'refund.processed') {
      await this.handleRefundProcessed(payload.refund?.entity, payload.payment?.entity);
    }
    else if (event === 'refund.failed') {
      await this.handleRefundFailed(payload.refund?.entity, payload.payment?.entity);
    }
    else if (event === 'refund.speed_changed') {
      await this.handleRefundSpeedChanged(payload.refund?.entity, payload.payment?.entity);
    }
  }

  private async handleRefundCreated(refund: any, payment: any) {
    try {
      this.logger.log(`Refund created: ${refund.id}, Payment: ${refund.payment_id}, Amount: ₹${refund.amount/100}`);

      // Extract order ID from payment notes
      const ourOrderId = payment?.notes?.orderId || payment?.notes?.order_id;

      if (ourOrderId) {
        await this.ordersService.handleRefundCreated(ourOrderId, {
          refund_id: refund.id,
          payment_id: refund.payment_id,
          amount: refund.amount,
          status: refund.status,
          created_at: new Date(refund.created_at * 1000),
        });
      }

    } catch (error) {
      this.logger.error(`Failed to handle refund created: ${error.message}`, error);
    }
  }

  private async handleRefundProcessed(refund: any, payment: any) {
    try {
      this.logger.log(`Refund processed: ${refund.id}, Amount: ₹${refund.amount/100}`);

      const ourOrderId = payment?.notes?.orderId || payment?.notes?.order_id;

      if (ourOrderId) {
        await this.ordersService.handleRefundProcessed(ourOrderId, {
          refund_id: refund.id,
          payment_id: refund.payment_id,
          amount: refund.amount,
          status: refund.status,
          processed_at: new Date(),
        });
      }

    } catch (error) {
      this.logger.error(`Failed to handle refund processed: ${error.message}`, error);
    }
  }

  private async handleRefundFailed(refund: any, payment: any) {
    try {
      this.logger.log(`Refund failed: ${refund.id}, Amount: ₹${refund.amount/100}`);

      const ourOrderId = payment?.notes?.orderId || payment?.notes?.order_id;

      if (ourOrderId) {
        await this.ordersService.handleRefundFailed(ourOrderId, {
          refund_id: refund.id,
          payment_id: refund.payment_id,
          amount: refund.amount,
          status: refund.status,
          failed_at: new Date(),
        });
      }

    } catch (error) {
      this.logger.error(`Failed to handle refund failed: ${error.message}`, error);
    }
  }

  private async handleRefundSpeedChanged(refund: any, payment: any) {
    try {
      this.logger.log(`Refund speed changed: ${refund.id}, New speed: ${refund.speed_processed}`);
      // Log for audit purposes - usually no action needed
    } catch (error) {
      this.logger.error(`Failed to handle refund speed change: ${error.message}`, error);
    }
  }

  // Transfer Event Handlers - Critical for restaurants with direct settlement
  private async handleTransferEvent(event: string, payload: any) {
    this.logger.log(`Processing transfer event: ${event}`, {
      event,
      transferId: payload?.transfer?.entity?.id,
      linkedAccountId: payload?.transfer?.entity?.linked_account,
      amount: payload?.transfer?.entity?.amount
    });

    if (event === 'transfer.processed') {
      await this.handleTransferProcessed(payload.transfer?.entity);
    }
    else if (event === 'transfer.failed') {
      await this.handleTransferFailed(payload.transfer?.entity);
    }
  }

  private async handleTransferProcessed(transfer: any) {
    try {
      this.logger.log(`Transfer processed: ${transfer.id}, Amount: ₹${transfer.amount/100} to ${transfer.linked_account}`);

      // Extract order ID from transfer notes
      const ourOrderId = transfer?.notes?.orderId || transfer?.notes?.order_id;

      if (ourOrderId) {
        await this.ordersService.handleTransferProcessed(ourOrderId, {
          transfer_id: transfer.id,
          linked_account_id: transfer.linked_account,
          amount: transfer.amount,
          processed_at: new Date(),
        });
      }

    } catch (error) {
      this.logger.error(`Failed to handle transfer processed: ${error.message}`, error);
    }
  }

  private async handleTransferFailed(transfer: any) {
    try {
      this.logger.log(`Transfer failed: ${transfer.id}, Amount: ₹${transfer.amount/100}`, {
        linkedAccount: transfer.linked_account,
        reason: transfer.failure_reason
      });

      const ourOrderId = transfer?.notes?.orderId || transfer?.notes?.order_id;

      if (ourOrderId) {
        await this.ordersService.handleTransferFailed(ourOrderId, {
          transfer_id: transfer.id,
          linked_account_id: transfer.linked_account,
          amount: transfer.amount,
          failure_reason: transfer.failure_reason,
          failed_at: new Date(),
        });
      }

    } catch (error) {
      this.logger.error(`Failed to handle transfer failed: ${error.message}`, error);
    }
  }

  // Settlement Event Handlers - For financial reconciliation
  private async handleSettlementEvent(event: string, payload: any) {
    this.logger.log(`Processing settlement event: ${event}`, {
      event,
      settlementId: payload?.settlement?.entity?.id,
      amount: payload?.settlement?.entity?.amount
    });

    if (event === 'settlement.processed') {
      await this.handleSettlementProcessed(payload.settlement?.entity);
    }
  }

  private async handleSettlementProcessed(settlement: any) {
    try {
      this.logger.log(`Settlement processed: ${settlement.id}, Amount: ₹${settlement.amount/100}`, {
        utr: settlement.utr,
        processedAt: new Date(settlement.processed_at * 1000)
      });

      // Record settlement for financial reconciliation
      // This would typically update restaurant financial records

    } catch (error) {
      this.logger.error(`Failed to handle settlement processed: ${error.message}`, error);
    }
  }

  // Invoice Event Handlers - For invoice-based payments
  private async handleInvoiceEvent(event: string, payload: any) {
    this.logger.log(`Processing invoice event: ${event}`, {
      event,
      invoiceId: payload?.invoice?.entity?.id,
      orderId: payload?.invoice?.entity?.order_id,
      status: payload?.invoice?.entity?.status
    });

    if (event === 'invoice.paid') {
      await this.handleInvoicePaid(payload.invoice?.entity, payload.payment?.entity);
    }
    else if (event === 'invoice.partially_paid') {
      await this.handleInvoicePartiallyPaid(payload.invoice?.entity, payload.payment?.entity);
    }
    else if (event === 'invoice.expired') {
      await this.handleInvoiceExpired(payload.invoice?.entity);
    }
  }

  private async handleInvoicePaid(invoice: any, payment: any) {
    try {
      this.logger.log(`Invoice paid: ${invoice.id}, Amount: ₹${invoice.amount/100}`);

      // Extract order ID from invoice notes or payment notes
      const ourOrderId = payment?.notes?.orderId || payment?.notes?.order_id ||
                        invoice?.notes?.orderId || invoice?.notes?.order_id;

      if (ourOrderId) {
        await this.ordersService.handleInvoicePaid(ourOrderId, {
          invoice_id: invoice.id,
          payment_id: payment?.id,
          amount: invoice.amount,
          paid_at: new Date(invoice.paid_at * 1000),
        });
      }

    } catch (error) {
      this.logger.error(`Failed to handle invoice paid: ${error.message}`, error);
    }
  }

  private async handleInvoicePartiallyPaid(invoice: any, payment: any) {
    try {
      this.logger.log(`Invoice partially paid: ${invoice.id}, Paid: ₹${invoice.amount_paid/100}, Due: ₹${invoice.amount_due/100}`);

      const ourOrderId = payment?.notes?.orderId || payment?.notes?.order_id ||
                        invoice?.notes?.orderId || invoice?.notes?.order_id;

      if (ourOrderId) {
        await this.ordersService.handleInvoicePartiallyPaid(ourOrderId, {
          invoice_id: invoice.id,
          payment_id: payment?.id,
          amount_paid: invoice.amount_paid,
          amount_due: invoice.amount_due,
          paid_at: new Date(),
        });
      }

    } catch (error) {
      this.logger.error(`Failed to handle invoice partially paid: ${error.message}`, error);
    }
  }

  private async handleInvoiceExpired(invoice: any) {
    try {
      this.logger.log(`Invoice expired: ${invoice.id}, Amount: ₹${invoice.amount/100}`);

      const ourOrderId = invoice?.notes?.orderId || invoice?.notes?.order_id;

      if (ourOrderId) {
        await this.ordersService.handleInvoiceExpired(ourOrderId, {
          invoice_id: invoice.id,
          amount: invoice.amount,
          expired_at: new Date(invoice.expired_at * 1000),
        });
      }

    } catch (error) {
      this.logger.error(`Failed to handle invoice expired: ${error.message}`, error);
    }
  }
}