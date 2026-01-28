import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { OrderResponseDto } from './dtos/order-response.dto';
import { GenerateReceiptQrDto } from './dtos/generate-receipt-qr.dto';
import * as jwt from 'jsonwebtoken';
import * as QRCode from 'qrcode';

@ApiTags('public-orders')
@Controller('orders')
export class PublicOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('combined-receipt/public')
  @ApiQuery({
    name: 'token',
    description: 'Access token for the combined receipt',
  })
  @ApiOkResponse({ type: [OrderResponseDto] })
  async getCombinedReceiptPublic(
    @Query('token') token: string
  ): Promise<OrderResponseDto[]> {
    if (!token) {
      throw new UnauthorizedException('Access token is required');
    }

    try {
      // Verify the JWT token
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as any;

      // Check if token is for combined receipt
      if (payload.type !== 'combined-receipt' || !payload.orderIds) {
        throw new UnauthorizedException('Invalid token for combined receipt');
      }

      // Get all orders
      const orders = await Promise.all(
        payload.orderIds.map((orderId) => this.ordersService.findById(orderId))
      );

      // Filter out any null orders (in case some orders were deleted)
      const validOrders = orders.filter((order) => order !== null);

      if (validOrders.length === 0) {
        throw new NotFoundException('No valid orders found');
      }

      return validOrders.map((order) => this.ordersService.toDto(order));
    } catch (error) {
      if (
        error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError'
      ) {
        throw new UnauthorizedException('Invalid or expired token');
      }
      throw error;
    }
  }

  @Get(':orderId/public')
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiQuery({ name: 'token', description: 'Access token for the order' })
  @ApiOkResponse({ type: OrderResponseDto })
  async getOrderPublic(
    @Param('orderId') orderId: string,
    @Query('token') token: string
  ): Promise<OrderResponseDto> {
    if (!token) {
      throw new UnauthorizedException('Access token is required');
    }

    try {
      // Verify the JWT token
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as any;

      // Check if token is for this specific order
      if (payload.type !== 'receipt' || payload.orderId !== orderId) {
        throw new UnauthorizedException('Invalid token for this order');
      }

      // Get the order
      const order = await this.ordersService.findById(orderId);
      if (!order) {
        throw new NotFoundException(`Order ${orderId} not found`);
      }

      return this.ordersService.toDto(order);
    } catch (error) {
      if (
        error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError'
      ) {
        throw new UnauthorizedException('Invalid or expired token');
      }
      throw error;
    }
  }

  @Get(':orderId/receipt-qr')
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiOkResponse({ type: GenerateReceiptQrDto })
  async generateReceiptQr(
    @Param('orderId') orderId: string
  ): Promise<GenerateReceiptQrDto> {
    // Verify order exists
    const order = await this.ordersService.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Generate JWT token for receipt access
    const token = jwt.sign(
      {
        orderId,
        type: 'receipt',
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '30d' } // Token valid for 30 days
    );

    // Use customer frontend domain for receipt URL
    const baseUrl =
      process.env.CUSTOMER_FRONTEND_URL ??
      process.env.USER_FRONTENT_URL ??
      'http://localhost:4200';
    const receiptUrl = `${baseUrl.replace(
      /\/$/,
      ''
    )}/receipt/${orderId}?token=${token}`;

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(receiptUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 8,
      width: 300,
    });

    return {
      orderId,
      orderNumber: order.orderNumber,
      receiptUrl,
      qrCodeDataUrl,
      token,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    };
  }
}
