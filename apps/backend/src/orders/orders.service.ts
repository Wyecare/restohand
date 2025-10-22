import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { OrderProgressStage } from '../common/enums/order-progress.enum';
import { OrderStatus } from '../common/enums/order-status.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { CreateOrderDto } from './dtos/create-order.dto';
import { OrderListResponseDto } from './dtos/order-list-response.dto';
import { OrderResponseDto } from './dtos/order-response.dto';
import { QueryOrdersDto } from './dtos/query-orders.dto';
import { UpdateOrderPaymentDto } from './dtos/update-order-payment.dto';
import { UpdateOrderStatusDto } from './dtos/update-order-status.dto';
import { CreateOrderItemDto } from './dtos/create-order-item.dto';
import { Order, OrderDocument } from './schemas/order.schema';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';
import { OrderEvent, OrderEventDocument } from './schemas/order-event.schema';
import { OrderEventResponseDto } from './dtos/order-event-response.dto';
import { OrdersGateway } from './orders.gateway';

interface CalculatedTotals {
  subTotal: number;
  tax: number;
  discount: number;
  total: number;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
    @InjectModel(OrderEvent.name)
    private readonly eventModel: Model<OrderEventDocument>,
    private readonly ordersGateway: OrdersGateway
  ) {}

  async create(
    restaurantId: string,
    dto: CreateOrderDto
  ): Promise<OrderResponseDto> {
    const orderNumber = await this.generateOrderNumber(restaurantId);
    const totals = this.calculateTotals(dto.items);
    const paymentMethod = dto.paymentMethod ?? 'upi';

    const restaurant = await this.restaurantModel
      .findById(restaurantId, { upi: 1, name: 1, slug: 1 })
      .lean();

    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${restaurantId} not found`);
    }

    const created = await this.orderModel.create({
      ...dto,
      restaurantId,
      orderNumber,
      status: OrderStatus.Pending,
      paymentStatus: PaymentStatus.Pending,
      progress: OrderProgressStage.NotStarted,
      subTotalAmount: totals.subTotal,
      taxAmount: totals.tax,
      discountAmount: totals.discount,
      totalAmount: totals.total,
      paymentMethod,
    });

    const response = this.toDto(created);
    await this.recordEvent(created._id.toString(), restaurantId, 'order.created', {
      totalAmount: response.totalAmount,
      paymentMethod: response.paymentMethod,
    });

    if (paymentMethod === 'upi') {
      const amount = totals.total.toFixed(2);
      const params = new URLSearchParams({
        pa: restaurant.upi.vpa,
        pn: restaurant.upi.displayName,
        am: amount,
        cu: 'INR',
        tn: `Order ${response.orderNumber}`,
      });
      response.paymentIntentUrl = `upi://pay?${params.toString()}`;
    }

    this.ordersGateway.emitOrderCreated(response);
    return response;
  }

  async findAll(
    restaurantId: string,
    query: QueryOrdersDto
  ): Promise<OrderListResponseDto> {
    const filter: FilterQuery<OrderDocument> = {
      restaurantId,
      isArchived: false,
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.paymentStatus) {
      filter.paymentStatus = query.paymentStatus;
    }

    if (query.from || query.to) {
      filter.createdAt = {} as any;
      if (query.from) {
        filter.createdAt.$gte = new Date(query.from);
      }
      if (query.to) {
        filter.createdAt.$lte = new Date(query.to);
      }
    }

    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or = [
        { orderNumber: regex },
        { customerName: regex },
        { customerPhone: regex },
      ];
    }

    const page = Number(query.page ?? '1');
    const limit = Math.min(Number(query.limit ?? '20'), 100);
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.orderModel.countDocuments(filter),
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return {
      data: items.map((item) => this.toDto(item)),
      total,
      page,
      limit,
    };
  }

  async findOne(
    restaurantId: string,
    orderId: string
  ): Promise<OrderResponseDto> {
    const order = await this.orderModel.findOne({
      _id: orderId,
      restaurantId,
    });
    if (!order) {
      throw new NotFoundException(
        `Order ${orderId} not found for restaurant ${restaurantId}`
      );
    }
    return this.toDto(order);
  }

  async updateStatus(
    restaurantId: string,
    orderId: string,
    dto: UpdateOrderStatusDto
  ): Promise<OrderResponseDto> {
    const updateDoc: Record<string, unknown> = {};

    if (dto.status) {
      updateDoc.status = dto.status;
    }

    if (dto.progress !== undefined) {
      updateDoc.progress = dto.progress;
      if (dto.progress === OrderProgressStage.Done) {
        updateDoc.readyAt = new Date();
      }
    }

    if (dto.statusNote !== undefined) {
      updateDoc.statusNote = dto.statusNote;
    }

    const updated = await this.orderModel.findOneAndUpdate(
      { _id: orderId, restaurantId },
      { $set: updateDoc },
      { new: true }
    );

    if (!updated) {
      throw new NotFoundException(
        `Order ${orderId} not found for restaurant ${restaurantId}`
      );
    }

    const response = this.toDto(updated);
    await this.recordEvent(orderId, restaurantId, 'order.status.updated', {
      status: response.status,
      progress: response.progress,
      statusNote: response.statusNote,
    });
    this.ordersGateway.emitOrderUpdated(response);
    return response;
  }

  async updatePayment(
    restaurantId: string,
    orderId: string,
    dto: UpdateOrderPaymentDto
  ): Promise<OrderResponseDto> {
    const updateDoc: Record<string, unknown> = {};

    if (dto.paymentStatus) {
      updateDoc.paymentStatus = dto.paymentStatus;
      if (dto.paymentStatus === PaymentStatus.Paid) {
        updateDoc.paidAt = new Date();
      }
    }

    if (dto.provider !== undefined) {
      updateDoc.paymentProvider = dto.provider;
    }

    if (dto.transactionId !== undefined) {
      updateDoc.paymentTransactionId = dto.transactionId;
    }

    const updated = await this.orderModel.findOneAndUpdate(
      { _id: orderId, restaurantId },
      { $set: updateDoc },
      { new: true }
    );

    if (!updated) {
      throw new NotFoundException(
        `Order ${orderId} not found for restaurant ${restaurantId}`
      );
    }

    const response = this.toDto(updated);
    await this.recordEvent(orderId, restaurantId, 'order.payment.updated', {
      paymentStatus: response.paymentStatus,
      paymentMethod: response.paymentMethod,
      paidAt: response.paidAt,
    });
    this.ordersGateway.emitOrderUpdated(response);
    return response;
  }

  async listEvents(
    restaurantId: string,
    orderId: string
  ): Promise<OrderEventResponseDto[]> {
    const events = await this.eventModel
      .find({ orderId, restaurantId })
      .sort({ createdAt: -1 })
      .lean();

    return events.map((event) => ({
      id: event._id.toString(),
      type: event.type,
      payload: event.payload ?? undefined,
      createdAt: event.createdAt
        ? event.createdAt.toISOString()
        : new Date().toISOString(),
    }));
  }

  async generateInvoiceHtml(
    restaurantId: string,
    orderId: string
  ): Promise<{ filename: string; html: string }> {
    const order = await this.orderModel
      .findOne({ _id: orderId, restaurantId })
      .populate([{ path: 'restaurantId', select: ['name'] }])
      .lean();

    if (!order) {
      throw new NotFoundException(
        `Order ${orderId} not found for restaurant ${restaurantId}`
      );
    }

    const restaurantName =
      (order.restaurantId as any)?.name ?? 'Restohand Restaurant';
    const itemsRows = order.items
      .map(
        (item) =>
          `<tr><td>${item.name}</td><td style="text-align:right;">${item.quantity}</td><td style="text-align:right;">₹${item.pricing.unitAmount.toFixed(
            2
          )}</td></tr>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Invoice #${order.orderNumber}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; color: #111827; }
      h1 { margin-bottom: 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 24px; }
      th, td { padding: 8px 4px; border-bottom: 1px solid #E5E7EB; }
      th { text-align: left; background-color: #F3F4F6; }
      .totals { margin-top: 24px; }
    </style>
  </head>
  <body>
    <h1>${restaurantName}</h1>
    <p>Ticket #${order.orderNumber}</p>
    <p>Placed on ${new Date(order.createdAt).toLocaleString()}</p>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align:right;">Qty</th>
          <th style="text-align:right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>
    <div class="totals">
      <p><strong>Subtotal:</strong> ₹${order.subTotalAmount?.toFixed(2) ?? order.totalAmount.toFixed(2)}</p>
      <p><strong>Total:</strong> ₹${order.totalAmount.toFixed(2)}</p>
      <p><strong>Payment method:</strong> ${order.paymentMethod}</p>
      <p><strong>Status:</strong> ${order.paymentStatus}</p>
    </div>
  </body>
</html>`;

    return {
      filename: `invoice-${order.orderNumber}.html`,
      html,
    };
  }

  private async recordEvent(
    orderId: string,
    restaurantId: string,
    type: string,
    payload?: Record<string, unknown>
  ) {
    await this.eventModel.create({
      orderId,
      restaurantId,
      type,
      payload,
    });
  }

  private calculateTotals(items: CreateOrderItemDto[]): CalculatedTotals {
    return items.reduce(
      (acc, item) => {
        const lineAmount = item.pricing.unitAmount * item.quantity;
        const tax = item.pricing.taxAmount ?? 0;
        const discount = item.pricing.discountAmount ?? 0;

        acc.subTotal += lineAmount;
        acc.tax += tax;
        acc.discount += discount;
        acc.total += lineAmount + tax - discount;
        return acc;
      },
      { subTotal: 0, tax: 0, discount: 0, total: 0 }
    );
  }

  private async generateOrderNumber(restaurantId: string): Promise<string> {
    const count = await this.orderModel.countDocuments({ restaurantId });
    return `ORD-${(count + 1).toString().padStart(4, '0')}`;
  }

  private toDto(doc: OrderDocument): OrderResponseDto {
    return {
      id: doc._id.toString(),
      restaurantId: doc.restaurantId.toString(),
      sessionId: doc.sessionId?.toString(),
      createdBy: doc.createdBy?.toString(),
      orderNumber: doc.orderNumber,
      tableNumber: doc.tableNumber,
      customerName: doc.customerName,
      customerPhone: doc.customerPhone,
      status: doc.status,
      paymentStatus: doc.paymentStatus,
      paymentMethod: doc.paymentMethod,
      progress: doc.progress,
      items: doc.items.map((item) => ({
        menuItemId: item.menuItemId?.toString(),
        name: item.name,
        quantity: item.quantity,
        pricing: {
          unitAmount: item.pricing.unitAmount,
          currency: item.pricing.currency,
          taxAmount: item.pricing.taxAmount,
          discountAmount: item.pricing.discountAmount,
        },
        notes: item.notes,
      })),
      subTotalAmount: doc.subTotalAmount,
      taxAmount: doc.taxAmount,
      discountAmount: doc.discountAmount,
      totalAmount: doc.totalAmount,
      notes: doc.notes,
      statusNote: doc.statusNote,
      paidAt: doc.paidAt?.toISOString(),
      paymentProvider: doc.paymentProvider,
      paymentTransactionId: doc.paymentTransactionId,
      readyAt: doc.readyAt?.toISOString(),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}
