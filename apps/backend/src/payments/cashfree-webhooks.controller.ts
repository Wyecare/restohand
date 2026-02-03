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

@ApiTags('webhooks')
@Controller('webhooks/cashfree')
export class CashfreeWebhooksController {
  private readonly logger = new Logger(CashfreeWebhooksController.name);

  constructor(
    private readonly cashfreeService: CashfreeService,
    private readonly ordersService: OrdersService,
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

    const valid = this.cashfreeService.verifyWebhookSignature(payload, signature, timestamp);
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

    // Handle payment webhook - delegate to OrdersService just like Razorpay
    await this.ordersService.handleCashfreeWebhook(event);

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

    const valid = this.cashfreeService.verifyWebhookSignature(payload, signature, timestamp);
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
      this.logger.log('Parsed settlement event:', JSON.stringify(event, null, 2));
    } catch (error) {
      this.logger.log('ERROR: Invalid payload JSON', error);
      throw new BadRequestException('Invalid payload JSON');
    }

    // Handle settlement webhook - delegate to OrdersService
    await this.ordersService.handleCashfreeSettlementWebhook(event);

    this.logger.log('=== CASHFREE SETTLEMENT WEBHOOK END ===');
    return { status: 'ok' };
  }
}