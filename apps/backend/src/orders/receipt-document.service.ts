import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ReceiptDocument,
  ReceiptDocumentDocument,
  ReceiptItem,
} from './schemas/receipt-document.schema';
import { Order, OrderDocument } from './schemas/order.schema';
import {
  Restaurant,
  RestaurantDocument,
} from '../restaurants/schemas/restaurant.schema';

@Injectable()
export class ReceiptDocumentService {
  private readonly logger = new Logger(ReceiptDocumentService.name);

  constructor(
    @InjectModel(ReceiptDocument.name)
    private receiptDocumentModel: Model<ReceiptDocumentDocument>,
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
  ) {}

  /**
   * Generate a unique receipt number
   */
  async generateReceiptNumber(restaurantId: string): Promise<string> {
    try {
      // Get restaurant info to create prefix
      const restaurant = await this.restaurantModel.findById(restaurantId);
      const prefix = restaurant?.name
        ? restaurant.name.substring(0, 3).toUpperCase()
        : 'RST';

      // Generate timestamp-based number (shorter format)
      const now = new Date();
      const timestamp = now.getTime().toString().slice(-6); // Last 6 digits
      const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');

      const receiptNumber = `${prefix}${timestamp}${random}`;

      // Ensure uniqueness
      const existing = await this.receiptDocumentModel.findOne({
        receiptNumber,
      });

      if (existing) {
        // If collision, add extra random digit
        const extraRandom = Math.floor(Math.random() * 10);
        return `${receiptNumber}${extraRandom}`;
      }

      return receiptNumber;
    } catch (error) {
      this.logger.error('Error generating receipt number:', error);
      // Fallback to simple format
      const timestamp = Date.now().toString().slice(-8);
      return `RCT${timestamp}`;
    }
  }

  /**
   * Create a receipt document for paid orders
   */
  async createReceiptDocument(
    restaurantId: string,
    orderIds: string[],
    paymentMethod: string,
    paymentProvider?: string,
    transactionId?: string,
    createdBy?: string,
  ): Promise<ReceiptDocumentDocument> {
    try {
      // Get all orders
      const orders = await this.orderModel
        .find({
          _id: { $in: orderIds.map(id => new Types.ObjectId(id)) },
          restaurantId: new Types.ObjectId(restaurantId),
        })
        .lean();

      if (orders.length === 0) {
        throw new Error('No orders found');
      }

      // Combine all items and calculate totals
      const combinedItems: ReceiptItem[] = [];
      const orderItemsMap = new Map<string, ReceiptItem>();

      orders.forEach(order => {
        order.items.forEach((item: any) => {
          const key = `${item.name}-${item.pricing.unitAmount}`;
          const lineTotal = item.pricing.unitAmount * item.quantity;
          const taxAmount = (item.pricing.taxAmount || 0) * item.quantity;
          const cgstAmount = (item.pricing.cgstAmount || 0) * item.quantity;
          const sgstAmount = (item.pricing.sgstAmount || 0) * item.quantity;
          const igstAmount = (item.pricing.igstAmount || 0) * item.quantity;

          if (orderItemsMap.has(key)) {
            const existing = orderItemsMap.get(key)!;
            existing.quantity += item.quantity;
            existing.lineTotal += lineTotal;
            existing.taxAmount += taxAmount;
            existing.cgstAmount += cgstAmount;
            existing.sgstAmount += sgstAmount;
            existing.igstAmount += igstAmount;
          } else {
            orderItemsMap.set(key, {
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.pricing.unitAmount,
              lineTotal,
              taxAmount,
              cgstAmount,
              sgstAmount,
              igstAmount,
            });
          }
        });
      });

      combinedItems.push(...Array.from(orderItemsMap.values()));

      // Calculate totals
      const subtotal = combinedItems.reduce((sum, item) => sum + item.lineTotal, 0);
      const taxAmount = combinedItems.reduce((sum, item) => sum + item.taxAmount, 0);
      const cgstAmount = combinedItems.reduce((sum, item) => sum + item.cgstAmount, 0);
      const sgstAmount = combinedItems.reduce((sum, item) => sum + item.sgstAmount, 0);
      const igstAmount = combinedItems.reduce((sum, item) => sum + item.igstAmount, 0);
      const totalBeforeRounding = subtotal + taxAmount;
      const roundOffAmount = Math.round(totalBeforeRounding) - totalBeforeRounding;
      const totalAmount = Math.round(totalBeforeRounding);

      // Generate receipt number
      const receiptNumber = await this.generateReceiptNumber(restaurantId);

      // Get customer info from first order
      const firstOrder = orders[0];

      // Create receipt document
      const receiptDoc = new this.receiptDocumentModel({
        receiptNumber,
        restaurantId: new Types.ObjectId(restaurantId),
        orderIds: orderIds.map(id => new Types.ObjectId(id)),
        createdBy: createdBy ? new Types.ObjectId(createdBy) : undefined,
        tableNumber: firstOrder.tableNumber,
        customerName: firstOrder.customerName,
        customerPhone: firstOrder.customerPhone,
        customerEmail: firstOrder.customerEmail,
        items: combinedItems,
        subtotal,
        taxAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        discountAmount: 0,
        roundOffAmount,
        totalAmount,
        paymentStatus: 'paid',
        paymentMethod,
        paymentProvider,
        transactionId,
        paidAt: new Date(),
        taxType: igstAmount > 0 ? 'inter-state' : 'intra-state',
        issuedAt: new Date(),
      });

      return await receiptDoc.save();
    } catch (error) {
      this.logger.error('Error creating receipt document:', error);
      throw error;
    }
  }

  /**
   * Find receipt by receipt number
   */
  async findByReceiptNumber(receiptNumber: string): Promise<ReceiptDocumentDocument | null> {
    return this.receiptDocumentModel
      .findOne({ receiptNumber })
      .populate('restaurantId', 'name address phone email gstin')
      .lean();
  }

  /**
   * Find receipt by order ID
   */
  async findByOrderId(orderId: string): Promise<ReceiptDocumentDocument | null> {
    return this.receiptDocumentModel
      .findOne({ orderIds: new Types.ObjectId(orderId) })
      .populate('restaurantId', 'name address phone email gstin')
      .lean();
  }

  /**
   * Find receipts by restaurant ID
   */
  async findByRestaurant(
    restaurantId: string,
    page = 1,
    limit = 50,
  ): Promise<{
    receipts: ReceiptDocumentDocument[];
    total: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [receipts, total] = await Promise.all([
      this.receiptDocumentModel
        .find({ restaurantId: new Types.ObjectId(restaurantId) })
        .populate('restaurantId', 'name address phone email gstin')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.receiptDocumentModel.countDocuments({
        restaurantId: new Types.ObjectId(restaurantId),
      }),
    ]);

    return {
      receipts,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}