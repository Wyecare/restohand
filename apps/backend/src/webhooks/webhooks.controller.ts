import { Controller, Post, Body, Headers, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RazorpayService } from '../payments/razorpay.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly razorpayService: RazorpayService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Post('razorpay')
  @ApiOperation({ summary: 'Handle Razorpay webhook events' })
  async handleRazorpayWebhook(
    @Body() payload: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    try {
      // Verify webhook signature
      const isValid = this.razorpayService.verifyWebhookSignature(
        JSON.stringify(payload),
        signature
      );

      if (!isValid) {
        this.logger.warn('Invalid Razorpay webhook signature');
        throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
      }

      const { event, payload: eventPayload } = payload;
      this.logger.log(`Received Razorpay webhook: ${event}`);

      // Handle subscription events
      if (event.startsWith('subscription.')) {
        await this.subscriptionsService.handleSubscriptionWebhook(event, eventPayload);
      }

      // Handle payment events if needed
      if (event.startsWith('payment.')) {
        this.logger.log(`Payment event received: ${event}`);
        // TODO: Handle payment events if needed
      }

      return { status: 'success' };

    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`, error);
      throw new HttpException('Webhook processing failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}