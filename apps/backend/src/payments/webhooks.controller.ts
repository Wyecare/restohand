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

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly razorpayService: RazorpayService,
    private readonly ordersService: OrdersService
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

    await this.ordersService.handleRazorpayWebhook(event);
    return { status: 'ok' };
  }
}