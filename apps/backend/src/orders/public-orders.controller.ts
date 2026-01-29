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
import { ReceiptDocumentService } from './receipt-document.service';
import { OrderResponseDto } from './dtos/order-response.dto';
import { GenerateReceiptQrDto } from './dtos/generate-receipt-qr.dto';
import * as jwt from 'jsonwebtoken';
import * as QRCode from 'qrcode';

@ApiTags('public-orders')
@Controller('orders')
export class PublicOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly receiptDocumentService: ReceiptDocumentService
  ) {}

  @Get('combined-receipt/public')
  @ApiQuery({
    name: 'token',
    description: 'Access token for the combined receipt',
  })
  @ApiOkResponse({ description: 'Accumulated receipt for multiple orders' })
  async getCombinedReceiptPublic(
    @Query('token') token: string
  ): Promise<any> {
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

      // Create accumulated receipt with combined calculations
      const accumulatedReceipt = this.createAccumulatedReceipt(validOrders, payload.tableNumber);
      return accumulatedReceipt;
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

  private createAccumulatedReceipt(orders: any[], tableNumber?: string) {
    // Combine all items from all orders
    const allItems = [];
    const orderNumbers = [];

    orders.forEach(order => {
      orderNumbers.push(order.orderNumber);
      order.items.forEach(item => {
        // Check if item already exists in accumulated list
        const existingItem = allItems.find(accItem =>
          accItem.name === item.name &&
          accItem.pricing?.unitAmount === item.pricing?.unitAmount
        );

        if (existingItem) {
          // Add to existing item quantity
          existingItem.quantity += item.quantity;
        } else {
          // Add new item
          allItems.push({
            ...item,
            // Keep the original item structure
          });
        }
      });
    });

    // Recalculate totals based on combined items (proper GST calculation)
    const subtotal = allItems.reduce((sum, item) => {
      return sum + (item.pricing.unitAmount * item.quantity);
    }, 0);

    // Calculate GST on combined subtotal (correct tax treatment)
    const gstRate = 0.05; // 5% GST (or get from configuration)
    const cgstRate = 0.025; // 2.5% CGST
    const sgstRate = 0.025; // 2.5% SGST

    const taxAmount = subtotal * gstRate;
    const cgstAmount = subtotal * cgstRate;
    const sgstAmount = subtotal * sgstRate;
    const totalAmount = subtotal + taxAmount;
    const roundOffAmount = Math.round(totalAmount) - totalAmount;
    const finalAmount = Math.round(totalAmount);

    // Create accumulated receipt structure
    return {
      id: `combined-${orders.map(o => o.id).join('-')}`,
      type: 'combined-receipt',
      orderNumbers: orderNumbers,
      tableNumber: tableNumber,
      orderCount: orders.length,
      customerName: orders[0]?.customerName,
      customerPhone: orders[0]?.customerPhone,
      items: allItems,
      subTotalAmount: subtotal,
      taxAmount: taxAmount,
      cgstAmount: cgstAmount,
      sgstAmount: sgstAmount,
      igstAmount: 0,
      discountAmount: 0,
      grossAmount: subtotal,
      totalAmount: finalAmount,
      roundOffAmount: roundOffAmount,
      paymentStatus: 'paid',
      createdAt: orders[0]?.createdAt,
      updatedAt: new Date().toISOString(),
    };
  }

  @Get('receipt/:receiptNumber/public')
  @ApiParam({ name: 'receiptNumber', description: 'Receipt number' })
  @ApiQuery({ name: 'token', description: 'Access token for the receipt' })
  @ApiOkResponse({ description: 'Receipt document data' })
  async getReceiptByNumber(
    @Param('receiptNumber') receiptNumber: string,
    @Query('token') token: string
  ): Promise<any> {
    if (!token) {
      throw new UnauthorizedException('Access token is required');
    }

    try {
      // Verify the JWT token
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as any;

      // Check if token is for this specific receipt
      if (payload.type !== 'receipt' || payload.receiptNumber !== receiptNumber) {
        throw new UnauthorizedException('Invalid token for this receipt');
      }

      // Get the receipt
      const receipt = await this.receiptDocumentService.findByReceiptNumber(receiptNumber);
      if (!receipt) {
        throw new NotFoundException(`Receipt ${receiptNumber} not found`);
      }

      return {
        receiptNumber: receipt.receiptNumber,
        restaurantId: receipt.restaurantId,
        restaurant: receipt.restaurantId ? {
          name: receipt.restaurantId.name || 'Restaurant',
          address: receipt.restaurantId.address,
          phone: receipt.restaurantId.phone,
          email: receipt.restaurantId.email,
          gstin: receipt.restaurantId.gstin,
        } : null,
        orderIds: receipt.orderIds,
        tableNumber: receipt.tableNumber,
        customerName: receipt.customerName,
        customerPhone: receipt.customerPhone,
        customerEmail: receipt.customerEmail,
        items: receipt.items,
        subtotal: receipt.subtotal,
        subTotalAmount: receipt.subtotal,
        taxAmount: receipt.taxAmount,
        cgstAmount: receipt.cgstAmount,
        sgstAmount: receipt.sgstAmount,
        igstAmount: receipt.igstAmount,
        discountAmount: receipt.discountAmount,
        roundOffAmount: receipt.roundOffAmount,
        totalAmount: receipt.totalAmount,
        paymentStatus: receipt.paymentStatus,
        paymentMethod: receipt.paymentMethod,
        paymentProvider: receipt.paymentProvider,
        transactionId: receipt.transactionId,
        paidAt: receipt.paidAt,
        taxType: receipt.taxType,
        issuedAt: receipt.issuedAt,
        createdAt: receipt.createdAt,
        id: receipt._id,
        // For compatibility with existing Receipt component
        orderNumber: receipt.receiptNumber,
      };
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

  @Get('receipt/:receiptNumber/receipt-qr')
  @ApiParam({ name: 'receiptNumber', description: 'Receipt number' })
  @ApiOkResponse({ description: 'Receipt QR code data' })
  async generateReceiptQrByReceiptNumber(
    @Param('receiptNumber') receiptNumber: string
  ): Promise<any> {
    // Verify receipt exists
    const receipt = await this.receiptDocumentService.findByReceiptNumber(receiptNumber);
    if (!receipt) {
      throw new NotFoundException(`Receipt ${receiptNumber} not found`);
    }

    // Generate JWT token for receipt access
    const token = jwt.sign(
      {
        receiptNumber,
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
    )}/receipt/${receiptNumber}?token=${token}`;

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(receiptUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 8,
      width: 300,
    });

    return {
      receiptNumber,
      receiptId: receipt._id,
      receiptUrl,
      qrCodeDataUrl,
      token,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    };
  }
}
