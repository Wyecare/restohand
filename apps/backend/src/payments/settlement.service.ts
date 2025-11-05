import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Restaurant } from '../restaurants/schemas/restaurant.schema';
import { RazorpayService } from './razorpay.service';

export interface SettlementCalculation {
  orderTotal: number;
  processingFee: number; // Only Razorpay processing fee (2-3%)
  restaurantAmount: number;
  notes?: string;
}

export interface SettlementRequest {
  restaurantId: string;
  orderId: string;
  orderTotal: number; // in paise
  notes?: Record<string, string>;
}

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    @InjectModel(Restaurant.name) private restaurantModel: Model<Restaurant>,
    private readonly razorpayService: RazorpayService
  ) {}

  /**
   * Calculate settlement amounts - 100% to restaurant (minus only processing fees)
   */
  calculateSettlement(orderTotal: number): SettlementCalculation {
    // Only deduct Razorpay processing fee (2.95% + GST ≈ 3.5%)
    // Platform revenue comes from monthly subscription, not per-order fees
    const processingFeePercent = 3.5; // Razorpay processing fee
    const processingFee = Math.round((orderTotal * processingFeePercent) / 100);
    const restaurantAmount = orderTotal - processingFee;

    return {
      orderTotal,
      processingFee,
      restaurantAmount,
      notes: `Processing fee: ${processingFeePercent}% (payment gateway charges only)`
    };
  }

  /**
   * Settle payment to restaurant using Razorpay Payouts
   */
  async settleToRestaurant(request: SettlementRequest): Promise<{
    success: boolean;
    payoutId?: string;
    calculation: SettlementCalculation;
    error?: string;
  }> {
    try {
      const restaurant = await this.restaurantModel.findById(request.restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      // Calculate settlement - 100% to restaurant minus processing fees only
      const calculation = this.calculateSettlement(request.orderTotal);

      this.logger.log(`Settling ₹${calculation.restaurantAmount/100} to restaurant ${restaurant.name} (Order: ${request.orderId}) - Full amount minus processing fees`);

      // Check if restaurant has fund account set up
      if (!restaurant.paymentConfig?.razorpayFundAccountId) {
        // Auto-create fund account if bank details are available
        if (restaurant.bankAccount?.accountNumber && restaurant.bankAccount?.ifscCode) {
          this.logger.log(`Creating fund account for restaurant ${restaurant.id}`);

          const { fundAccount } = await this.razorpayService.createFundAccountForRestaurant(
            restaurant.id,
            {
              accountNumber: restaurant.bankAccount.accountNumber,
              ifscCode: restaurant.bankAccount.ifscCode,
              accountHolderName: restaurant.bankAccount.accountHolderName || restaurant.name
            }
          );

          // Update restaurant with fund account ID
          await this.restaurantModel.findByIdAndUpdate(restaurant.id, {
            'paymentConfig.razorpayFundAccountId': fundAccount.id
          });

          restaurant.paymentConfig.razorpayFundAccountId = fundAccount.id;
        } else {
          throw new Error('Restaurant bank account details not configured');
        }
      }

      // Create payout - restaurant gets almost full amount
      const payout = await this.razorpayService.createPayout({
        fundAccountId: restaurant.paymentConfig.razorpayFundAccountId,
        amount: calculation.restaurantAmount,
        currency: 'INR',
        purpose: 'payout',
        notes: {
          order_id: request.orderId,
          restaurant_id: request.restaurantId,
          restaurant_name: restaurant.name,
          processing_fee: calculation.processingFee.toString(),
          settlement_type: 'full_amount_minus_processing',
          ...request.notes
        }
      });

      this.logger.log(`Payout created successfully: ${payout.id}`);

      return {
        success: true,
        payoutId: payout.id,
        calculation
      };

    } catch (error) {
      this.logger.error(`Settlement failed for restaurant ${request.restaurantId}: ${error.message}`, error);

      return {
        success: false,
        calculation: this.calculateSettlement(request.orderTotal),
        error: error.message
      };
    }
  }

  /**
   * Batch settle multiple orders (daily/weekly settlement)
   */
  async batchSettle(settlements: SettlementRequest[]): Promise<{
    successful: number;
    failed: number;
    results: Array<{ orderId: string; success: boolean; error?: string }>;
  }> {
    this.logger.log(`Processing batch settlement for ${settlements.length} orders`);

    const results = [];
    let successful = 0;
    let failed = 0;

    for (const settlement of settlements) {
      try {
        const result = await this.settleToRestaurant(settlement);
        if (result.success) {
          successful++;
          results.push({ orderId: settlement.orderId, success: true });
        } else {
          failed++;
          results.push({ orderId: settlement.orderId, success: false, error: result.error });
        }
      } catch (error) {
        failed++;
        results.push({ orderId: settlement.orderId, success: false, error: error.message });
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.logger.log(`Batch settlement completed: ${successful} successful, ${failed} failed`);

    return { successful, failed, results };
  }

  /**
   * Get settlement history for a restaurant
   */
  async getSettlementHistory(restaurantId: string, fromDate?: Date, toDate?: Date): Promise<any[]> {
    // This would typically query a settlements table/collection
    // For now, return empty array - implement based on your needs
    this.logger.log(`Getting settlement history for restaurant ${restaurantId}`);
    return [];
  }

  /**
   * Calculate total pending settlements for a restaurant
   */
  async getPendingSettlements(restaurantId: string): Promise<{
    totalAmount: number;
    orderCount: number;
    orders: string[];
  }> {
    // This would query orders that haven't been settled yet
    // Implementation depends on your orders schema
    this.logger.log(`Getting pending settlements for restaurant ${restaurantId}`);

    return {
      totalAmount: 0,
      orderCount: 0,
      orders: []
    };
  }
}