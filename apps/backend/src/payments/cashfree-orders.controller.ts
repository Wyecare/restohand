import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CashfreePaymentService, CreatePaymentIntentDto } from './cashfree-payment.service';

@ApiTags('Cashfree Orders')
@Controller('restaurants/:restaurantId/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CashfreeOrdersController {
  constructor(private readonly cashfreePaymentService: CashfreePaymentService) {}

  @Post(':orderId/payment-intent')
  @Roles(UserRole.Manager, UserRole.Waiter)
  @ApiOperation({
    summary: 'Create Cashfree payment intent for order',
    description: 'Replaces the Razorpay payment-intent endpoint. Creates a Cashfree payment session with automatic split payment configuration.'
  })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({
    status: 201,
    description: 'Payment intent created successfully',
    schema: {
      properties: {
        paymentSessionId: { type: 'string', description: 'Cashfree payment session ID for frontend' },
        cashfreeOrderId: { type: 'string', description: 'Cashfree order ID' },
        orderId: { type: 'string', description: 'Internal order ID' },
        amount: { type: 'number', description: 'Payment amount in paise' },
        currency: { type: 'string', example: 'INR' },
        restaurantInfo: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            vendorId: { type: 'string' },
            canReceiveSettlements: { type: 'boolean' }
          }
        },
        settlementType: {
          type: 'string',
          enum: ['split_payment', 'manual_settlement'],
          description: 'How the payment will be settled to restaurant'
        }
      }
    }
  })
  async createPaymentIntent(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
    @Body() customerDetails?: { customerName?: string; customerEmail?: string; customerPhone?: string }
  ) {
    const dto: CreatePaymentIntentDto = {
      orderId,
      restaurantId,
      customerDetails: customerDetails || {}
    };

    return this.cashfreePaymentService.createOrderPaymentIntent(dto);
  }

  @Post(':orderId/verify-payment')
  @Roles(UserRole.Manager, UserRole.Waiter)
  @ApiOperation({
    summary: 'Verify Cashfree payment',
    description: 'Verify payment status from Cashfree. Note: Webhooks handle automatic verification, this is for manual verification or status checks.'
  })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment verification result',
    schema: {
      properties: {
        orderId: { type: 'string' },
        paymentStatus: { type: 'string' },
        cashfreeOrderId: { type: 'string' },
        settlementStatus: { type: 'string' },
        verified: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  async verifyPayment(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
    @Body() verificationData?: {
      cashfreePaymentId?: string;
      paymentSessionId?: string;
    }
  ) {
    try {
      const paymentStatus = await this.cashfreePaymentService.getPaymentStatus(orderId);

      // Check if payment is successful
      const isSuccessful = paymentStatus.orderStatus === 'PAID' && paymentStatus.paymentStatus === 'paid';

      return {
        orderId,
        paymentStatus: paymentStatus.paymentStatus,
        cashfreeOrderId: paymentStatus.cashfreeOrderId,
        settlementStatus: paymentStatus.splitStatus || 'pending',
        verified: isSuccessful,
        message: isSuccessful ? 'Payment verified successfully' : 'Payment verification failed',
        settlementType: paymentStatus.settlementType
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException('Order not found or no payment initiated');
      }
      throw new BadRequestException('Payment verification failed');
    }
  }

  @Get(':orderId/payment-status')
  @Roles(UserRole.Manager, UserRole.Waiter)
  @ApiOperation({
    summary: 'Get payment status',
    description: 'Get current payment and settlement status for an order'
  })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  async getPaymentStatus(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string
  ) {
    return this.cashfreePaymentService.getPaymentStatus(orderId);
  }
}