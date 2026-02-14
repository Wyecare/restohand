import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CashfreePaymentService, CreateSessionPaymentIntentDto } from './cashfree-payment.service';

@ApiTags('Cashfree Public')
@Controller('public/restaurants/:slug')
export class CashfreePublicController {
  constructor(private readonly cashfreePaymentService: CashfreePaymentService) {}

  @Post('orders/:orderId/payment-intent')
  @ApiOperation({
    summary: 'Create public Cashfree payment intent',
    description: 'Public endpoint for customers to create payment intent for an order. Replaces Razorpay public payment-intent endpoint.'
  })
  @ApiParam({ name: 'slug', description: 'Restaurant slug' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({
    status: 201,
    description: 'Public payment intent created successfully',
    schema: {
      properties: {
        paymentSessionId: { type: 'string', description: 'Cashfree payment session ID for checkout' },
        cashfreeOrderId: { type: 'string' },
        orderId: { type: 'string' },
        amount: { type: 'number', description: 'Amount in paise' },
        currency: { type: 'string', example: 'INR' },
        restaurantInfo: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            vendorId: { type: 'string' },
            canReceiveSettlements: { type: 'boolean' }
          }
        },
        settlementType: { type: 'string', enum: ['split_payment', 'manual_settlement'] }
      }
    }
  })
  async createPublicOrderPaymentIntent(
    @Param('slug') restaurantSlug: string,
    @Param('orderId') orderId: string,
    @Body() customerDetails?: {
      customerId?: string;
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
    }
  ) {
    try {
      return await this.cashfreePaymentService.createPublicOrderPaymentIntent(
        restaurantSlug,
        orderId,
        customerDetails
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException('Restaurant or order not found');
      }
      throw new BadRequestException('Failed to create payment intent');
    }
  }

  @Post('table/:tableId/session/payment-intent')
  @ApiOperation({
    summary: 'Create session payment intent for table',
    description: 'Create consolidated payment intent for all unpaid orders at a table. Replaces Razorpay session payment-intent endpoint.'
  })
  @ApiParam({ name: 'slug', description: 'Restaurant slug' })
  @ApiParam({ name: 'tableId', description: 'Table ID' })
  @ApiResponse({
    status: 201,
    description: 'Session payment intent created successfully',
    schema: {
      properties: {
        paymentSessionId: { type: 'string', description: 'Cashfree payment session ID' },
        cashfreeOrderId: { type: 'string' },
        orderId: { type: 'string', description: 'Session order ID' },
        amount: { type: 'number', description: 'Total amount in paise' },
        currency: { type: 'string', example: 'INR' },
        orderIds: { type: 'array', items: { type: 'string' }, description: 'Individual order IDs included' },
        orderCount: { type: 'number', description: 'Number of orders consolidated' },
        totalAmount: { type: 'number', description: 'Total amount in paise' },
        restaurantInfo: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            vendorId: { type: 'string' },
            canReceiveSettlements: { type: 'boolean' }
          }
        },
        settlementType: { type: 'string', enum: ['split_payment', 'manual_settlement'] }
      }
    }
  })
  async createSessionPaymentIntent(
    @Param('slug') restaurantSlug: string,
    @Param('tableId') tableId: string,
    @Body() body: {
      customerSessionId: string; // Required for session-based payment
      customerDetails?: {
        customerId?: string;
        customerName?: string;
        customerEmail?: string;
        customerPhone?: string;
      };
    }
  ) {
    try {
      const dto: CreateSessionPaymentIntentDto = {
        restaurantSlug,
        tableId,
        customerSessionId: body.customerSessionId,
        customerDetails: body.customerDetails
      };

      return await this.cashfreePaymentService.createSessionPaymentIntent(dto);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException('Restaurant not found');
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create session payment intent');
    }
  }

  @Get('table/:tableId/session/consolidated-bill')
  @ApiOperation({
    summary: 'Get consolidated bill for table session',
    description: 'Get consolidated bill details for all orders at a table'
  })
  @ApiParam({ name: 'slug', description: 'Restaurant slug' })
  @ApiParam({ name: 'tableId', description: 'Table ID' })
  async getConsolidatedBill(
    @Param('slug') restaurantSlug: string,
    @Param('tableId') tableId: string
  ) {
    // This would integrate with your existing consolidated bill service
    // For now, return a placeholder that matches your existing structure
    throw new BadRequestException('Consolidated bill endpoint needs integration with existing service');
  }

  @Post('orders/:orderId/verify-payment')
  @ApiOperation({
    summary: 'Verify public order payment',
    description: 'Public endpoint to verify payment status for an order'
  })
  @ApiParam({ name: 'slug', description: 'Restaurant slug' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  async verifyPublicOrderPayment(
    @Param('slug') restaurantSlug: string,
    @Param('orderId') orderId: string,
    @Body() verificationData?: {
      cashfreePaymentId?: string;
      paymentSessionId?: string;
    }
  ) {
    try {
      const paymentStatus = await this.cashfreePaymentService.getPaymentStatus(orderId);

      const isSuccessful = paymentStatus.orderStatus === 'PAID' && paymentStatus.paymentStatus === 'paid';

      return {
        orderId,
        paymentStatus: paymentStatus.paymentStatus,
        verified: isSuccessful,
        message: isSuccessful ? 'Payment verified successfully' : 'Payment verification failed',
        settlementStatus: paymentStatus.splitStatus || 'pending'
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException('Order not found or no payment initiated');
      }
      throw new BadRequestException('Payment verification failed');
    }
  }

  @Get('orders/:orderId/payment-status')
  @ApiOperation({
    summary: 'Get public order payment status',
    description: 'Get payment status for an order (public endpoint)'
  })
  @ApiParam({ name: 'slug', description: 'Restaurant slug' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  async getPublicOrderPaymentStatus(
    @Param('slug') restaurantSlug: string,
    @Param('orderId') orderId: string
  ) {
    return this.cashfreePaymentService.getPaymentStatus(orderId);
  }
}