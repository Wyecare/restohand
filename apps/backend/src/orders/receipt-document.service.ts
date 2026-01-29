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

  /**
   * Find active receipt for a table (to group multiple orders)
   */
  async findActiveTableReceipt(
    restaurantId: string,
    tableId: string
  ): Promise<ReceiptDocumentDocument | null> {
    try {
      // Get all orders from this table that are paid
      const tableOrders = await this.orderModel
        .find({
          restaurantId: new Types.ObjectId(restaurantId),
          tableId: new Types.ObjectId(tableId),
          paymentStatus: 'paid',
        })
        .select('_id')
        .lean();

      if (!tableOrders.length) {
        return null;
      }

      const orderIds = tableOrders.map(o => o._id.toString());

      // Find receipt that contains any of these orders and was created recently (within last 4 hours)
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

      const receipt = await this.receiptDocumentModel
        .findOne({
          restaurantId: new Types.ObjectId(restaurantId),
          orderIds: { $in: orderIds },
          createdAt: { $gte: fourHoursAgo }, // Only recent receipts
        })
        .sort({ createdAt: -1 })
        .lean();

      return receipt;
    } catch (error) {
      this.logger.error('Error finding active table receipt:', error);
      return null;
    }
  }

  /**
   * Add an order to existing receipt
   */
  async addOrderToReceipt(
    receiptId: string,
    orderId: string,
    updatedBy?: string
  ): Promise<ReceiptDocumentDocument | null> {
    try {
      console.log('=== ADD ORDER TO RECEIPT DEBUG ===');
      console.log('Receipt ID:', receiptId);
      console.log('Order ID:', orderId);
      console.log('Updated By:', updatedBy);

      // Get the order details
      const order = await this.orderModel
        .findById(orderId)
        .populate('restaurantId')
        .lean();

      console.log('Order found:', !!order);
      if (order) {
        console.log('Order details:', {
          id: order._id,
          tableId: order.tableId,
          items: order.items.length,
          subTotalAmount: order.subTotalAmount,
          taxAmount: order.taxAmount,
          totalAmount: order.totalAmount
        });
      }

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Get current receipt
      const receipt = await this.receiptDocumentModel.findById(receiptId);

      console.log('Receipt found:', !!receipt);
      if (receipt) {
        console.log('Current receipt details:', {
          receiptNumber: receipt.receiptNumber,
          currentOrderIds: receipt.orderIds,
          currentSubtotal: receipt.subtotal,
          currentTaxAmount: receipt.taxAmount,
          currentTotalAmount: receipt.totalAmount,
          currentItemsCount: receipt.items.length
        });
      }

      if (!receipt) {
        throw new Error(`Receipt ${receiptId} not found`);
      }

      // Check if order is already in this receipt
      if (receipt.orderIds.includes(orderId)) {
        console.log('Order already exists in receipt, skipping');
        this.logger.warn(`Order ${orderId} already exists in receipt ${receiptId}`);
        return receipt;
      }

      // Add order to receipt
      const orderItems: ReceiptItem[] = order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.pricing.unitAmount,
        lineTotal: item.pricing.unitAmount * item.quantity,
      }));

      console.log('Order items to add:', orderItems);

      console.log('Updating receipt with increments:', {
        newOrderId: orderId,
        addSubtotal: order.subTotalAmount,
        addTaxAmount: order.taxAmount,
        addTotalAmount: order.totalAmount,
        addItems: orderItems.length
      });

      // Update receipt with new order
      const updateQuery = {
        $push: { orderIds: orderId },
        $inc: {
          subtotal: order.subTotalAmount,
          taxAmount: order.taxAmount,
          totalAmount: order.totalAmount,
        },
        $set: {
          updatedAt: new Date(),
          ...(updatedBy && { updatedBy: new Types.ObjectId(updatedBy) }),
        },
        $addToSet: {
          items: { $each: orderItems }
        }
      };

      console.log('MongoDB update query:', JSON.stringify(updateQuery, null, 2));

      const updatedReceipt = await this.receiptDocumentModel.findByIdAndUpdate(
        receiptId,
        updateQuery,
        { new: true }
      );

      console.log('Update result:', !!updatedReceipt);
      if (updatedReceipt) {
        console.log('Updated receipt details:', {
          receiptNumber: updatedReceipt.receiptNumber,
          finalOrderIds: updatedReceipt.orderIds,
          finalSubtotal: updatedReceipt.subtotal,
          finalTaxAmount: updatedReceipt.taxAmount,
          finalTotalAmount: updatedReceipt.totalAmount,
          finalItemsCount: updatedReceipt.items.length
        });
      }

      console.log('=== END ADD ORDER TO RECEIPT DEBUG ===');

      this.logger.log(`Successfully added order ${orderId} to receipt ${receiptId}`);
      return updatedReceipt;
    } catch (error) {
      console.log('=== ADD ORDER TO RECEIPT ERROR ===');
      console.log('Error details:', error);
      console.log('Error message:', error.message);
      console.log('Error stack:', error.stack);
      console.log('=== END ADD ORDER ERROR ===');

      this.logger.error(`Error adding order ${orderId} to receipt ${receiptId}:`, error);
      throw error;
    }
  }
}