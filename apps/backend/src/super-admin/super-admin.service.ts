import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { VatConfiguration, VatConfigurationDocument } from './schemas/vat-configuration.schema';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateSuperAdminDto } from './dtos/create-super-admin.dto';
import { CreateCashfreePlanDto } from './dtos/create-cashfree-plan.dto';
import { UpdateCashfreePlanDto } from './dtos/update-cashfree-plan.dto';
import {
  CreateVatConfigurationDto,
  UpdateVatConfigurationDto,
  BulkStateVatRateDto
} from './dtos/vat-configuration.dto';
import { SubscriptionPlansService } from '../subscription-plans/subscription-plans.service';
import { CreateSubscriptionPlanDto } from '../subscription-plans/dtos/create-subscription-plan.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(VatConfiguration.name) private vatConfigurationModel: Model<VatConfigurationDocument>,
    private readonly subscriptionPlansService: SubscriptionPlansService
  ) {}

  async getDashboardOverview() {
    const [totalRestaurants, totalOrders, pendingSettlements] = await Promise.all([
      this.restaurantModel.countDocuments({ isActive: true }),
      this.orderModel.countDocuments({ paymentStatus: 'paid' }),
      this.calculateTotalPendingSettlements()
    ]);

    return {
      totalRestaurants,
      totalOrders,
      pendingSettlements,
      lastUpdated: new Date().toISOString()
    };
  }

  async getAllRestaurants(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const restaurants = await this.restaurantModel
      .find({}, {
        name: 1,
        email: 1,
        phone: 1,
        address: 1,
        isActive: 1,
        createdAt: 1
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await this.restaurantModel.countDocuments();

    return {
      restaurants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getRestaurantDetails(restaurantId: string) {
    const restaurant = await this.restaurantModel.findById(restaurantId).lean();
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const [orderStats, revenue] = await Promise.all([
      this.getRestaurantOrderStats(restaurantId),
      this.getRestaurantRevenue(restaurantId)
    ]);

    return {
      restaurant,
      orderStats,
      revenue
    };
  }

  async getPendingSettlements() {
    // Get all restaurants with pending settlements (paid orders without settlement)
    const pendingSettlements = await this.orderModel.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          isSettled: { $ne: true }
        }
      },
      {
        $group: {
          _id: '$restaurantId',
          orderCount: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          oldestOrder: { $min: '$paidAt' },
          latestOrder: { $max: '$paidAt' }
        }
      },
      {
        $lookup: {
          from: 'restaurants',
          localField: '_id',
          foreignField: '_id',
          as: 'restaurant'
        }
      },
      {
        $unwind: '$restaurant'
      },
      {
        $project: {
          restaurantId: '$_id',
          restaurantName: '$restaurant.name',
          orderCount: 1,
          totalAmount: 1,
          oldestOrder: 1,
          latestOrder: 1
        }
      }
    ]);

    return pendingSettlements;
  }

  async getSettlementHistory(page = 1, limit = 50) {
    // This would require a settlements collection - placeholder for now
    return {
      settlements: [],
      pagination: { page, limit, total: 0, totalPages: 0 }
    };
  }

  async calculateSettlement(restaurantId: string) {
    const pendingOrders = await this.orderModel.find({
      restaurantId,
      paymentStatus: 'paid',
      isSettled: { $ne: true }
    }).lean();

    const totalAmount = pendingOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const commission = totalAmount * 0.03; // 3% commission
    const netAmount = totalAmount - commission;

    return {
      restaurantId,
      orderCount: pendingOrders.length,
      totalAmount,
      commission,
      netAmount,
      orderIds: pendingOrders.map(order => order._id.toString())
    };
  }

  async executeSettlement(restaurantId: string, settlementData: any, adminId: string) {
    // Placeholder - would integrate with Razorpay transfers
    this.logger.log(`Settlement executed for restaurant ${restaurantId} by admin ${adminId}`);
    return {
      success: true,
      message: 'Settlement executed successfully',
      settlementId: 'settlement_' + Date.now()
    };
  }

  async getAnalyticsOverview() {
    const [dailyOrders, monthlyRevenue, topRestaurants] = await Promise.all([
      this.getDailyOrderStats(),
      this.getMonthlyRevenueStats(),
      this.getTopRestaurants()
    ]);

    return {
      dailyOrders,
      monthlyRevenue,
      topRestaurants
    };
  }

  async getSuperAdmins() {
    const superAdmins = await this.userModel
      .find(
        { roles: UserRole.SuperAdmin },
        { name: 1, email: 1, createdAt: 1, isActive: 1 }
      )
      .sort({ createdAt: -1 })
      .lean();

    return { superAdmins };
  }

  async createSuperAdmin(createSuperAdminDto: CreateSuperAdminDto, createdBy: string) {
    const { email, name, password } = createSuperAdminDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create super admin user
    const superAdmin = new this.userModel({
      email,
      name,
      password: hashedPassword,
      roles: [UserRole.SuperAdmin],
      restaurantId: null, // No restaurant association
      isActive: true,
      createdBy
    });

    await superAdmin.save();

    this.logger.log(`Super admin created: ${email} by ${createdBy}`);

    return {
      id: superAdmin._id.toString(),
      email: superAdmin.email,
      name: superAdmin.name,
      roles: superAdmin.roles,
      createdAt: superAdmin.createdAt
    };
  }

  // Helper methods
  private async calculateTotalPendingSettlements() {
    const result = await this.orderModel.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          isSettled: { $ne: true }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);

    return result[0]?.total || 0;
  }

  private async getRestaurantOrderStats(restaurantId: string) {
    const stats = await this.orderModel.aggregate([
      { $match: { restaurantId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    return stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});
  }

  private async getRestaurantRevenue(restaurantId: string) {
    const result = await this.orderModel.aggregate([
      {
        $match: {
          restaurantId,
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    return result[0]?.totalRevenue || 0;
  }

  private async getDailyOrderStats() {
    // Get orders from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          orderCount: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  }

  private async getMonthlyRevenueStats() {
    // Get revenue from last 12 months
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    return this.orderModel.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          paidAt: { $gte: oneYearAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$paidAt" }
          },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  }

  private async getTopRestaurants() {
    return this.orderModel.aggregate([
      {
        $match: {
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: '$restaurantId',
          orderCount: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      {
        $lookup: {
          from: 'restaurants',
          localField: '_id',
          foreignField: '_id',
          as: 'restaurant'
        }
      },
      {
        $unwind: '$restaurant'
      },
      {
        $project: {
          restaurantName: '$restaurant.name',
          orderCount: 1,
          revenue: 1
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);
  }

  // ============= CASHFREE SUBSCRIPTION PLAN MANAGEMENT =============

  async getCashfreeSubscriptionPlans() {
    try {
      const response = await this.subscriptionPlansService.getAllPlans();
      this.logger.log(`Retrieved ${response.length || 0} subscription plans`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to retrieve subscription plans: ${error.message}`, error.stack);
      throw new Error(`Failed to retrieve subscription plans: ${error.message}`);
    }
  }

  async getCashfreeSubscriptionPlan(planId: string) {
    try {
      const response = await this.subscriptionPlansService.getPlanById(planId);
      this.logger.log(`Retrieved subscription plan: ${planId}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to retrieve plan ${planId}: ${error.message}`, error.stack);
      throw new NotFoundException(`Plan not found: ${error.message}`);
    }
  }

  async createCashfreeSubscriptionPlan(createPlanDto: CreateCashfreePlanDto, adminId: string) {
    try {
      // Convert CreateCashfreePlanDto to CreateSubscriptionPlanDto format
      const subscriptionPlanDto = {
        plan_name: createPlanDto.plan_name,
        plan_type: createPlanDto.plan_type,
        plan_amount: createPlanDto.plan_amount, // Keep same field name
        plan_max_amount: createPlanDto.plan_max_amount,
        plan_max_cycles: createPlanDto.plan_max_cycles,
        plan_intervals: createPlanDto.plan_intervals,
        plan_currency: createPlanDto.plan_currency,
        plan_interval_type: createPlanDto.plan_interval_type,
        plan_note: createPlanDto.plan_note,

        // Business model fields
        tier: createPlanDto.tier,
        display_name: createPlanDto.display_name,
        description: createPlanDto.description,
        features: createPlanDto.features,
        is_popular: createPlanDto.is_popular,
        usage_limits: createPlanDto.usage_limits,
        pricing: createPlanDto.pricing,
        feature_access: createPlanDto.feature_access,
        target_market: createPlanDto.target_market,
        metadata: createPlanDto.plan_metadata,
      };

      // Use the subscription plans service with proper DTO and adminId
      const response = await this.subscriptionPlansService.createPlan(subscriptionPlanDto as CreateSubscriptionPlanDto, adminId);
      this.logger.log(`Subscription plan created: ${response._id} by admin ${adminId}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to create subscription plan: ${error.message}`, error.stack);
      throw new Error(`Failed to create subscription plan: ${error.message}`);
    }
  }

  async updateCashfreeSubscriptionPlan(planId: string, updatePlanDto: UpdateCashfreePlanDto, adminId: string) {
    try {
      const updateData: any = {};

      if (updatePlanDto.plan_amount !== undefined) {
        updateData.plan_recurring_amount = updatePlanDto.plan_amount;
      }
      if (updatePlanDto.plan_max_amount !== undefined) {
        updateData.plan_max_amount = updatePlanDto.plan_max_amount;
      }
      if (updatePlanDto.plan_note !== undefined) {
        updateData.plan_note = updatePlanDto.plan_note;
        updateData.description = updatePlanDto.plan_note;
      }
      if (updatePlanDto.plan_metadata !== undefined) {
        updateData.metadata = updatePlanDto.plan_metadata;
        if (updatePlanDto.plan_metadata.tier) {
          updateData.tier = updatePlanDto.plan_metadata.tier;
        }
        if (updatePlanDto.plan_metadata.display_name) {
          updateData.display_name = updatePlanDto.plan_metadata.display_name;
        }
        if (updatePlanDto.plan_metadata.is_popular !== undefined) {
          updateData.is_popular = updatePlanDto.plan_metadata.is_popular;
        }
        if (updatePlanDto.plan_metadata.features) {
          updateData.features = updatePlanDto.plan_metadata.features.split(',');
        }
      }

      const response = await this.subscriptionPlansService.updatePlan(planId, updateData, adminId);
      this.logger.log(`Subscription plan updated: ${planId} by admin ${adminId}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to update subscription plan ${planId}: ${error.message}`, error.stack);
      throw new Error(`Failed to update subscription plan: ${error.message}`);
    }
  }

  async deleteCashfreeSubscriptionPlan(planId: string, adminId: string) {
    try {
      const response = await this.subscriptionPlansService.deletePlanFromDatabase(planId, adminId);
      this.logger.log(`Subscription plan deleted from database only: ${planId} by admin ${adminId}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to delete subscription plan ${planId}: ${error.message}`, error.stack);
      throw new Error(`Failed to delete subscription plan: ${error.message}`);
    }
  }

  async getRecommendedCashfreePlanTemplates() {
    return await this.subscriptionPlansService.getRecommendedTemplates();
  }

  async importCashfreePlan(cashfreePlanId: string, adminId: string) {
    try {
      const response = await this.subscriptionPlansService.importCashfreePlan(cashfreePlanId, adminId);
      this.logger.log(`Imported Cashfree plan: ${cashfreePlanId} by admin ${adminId}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to import Cashfree plan ${cashfreePlanId}: ${error.message}`, error.stack);
      throw new Error(`Failed to import Cashfree plan: ${error.message}`);
    }
  }

  // ============= VAT CONFIGURATION MANAGEMENT =============

  async getAllVatConfigurations(activeOnly = false) {
    try {
      const filter = activeOnly ? { isActive: true } : {};
      const configurations = await this.vatConfigurationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .lean();

      this.logger.log(`Retrieved ${configurations.length} VAT configurations (activeOnly: ${activeOnly})`);
      return configurations.map(config => ({
        ...config,
        id: config._id.toString(),
      }));
    } catch (error) {
      this.logger.error(`Failed to get VAT configurations: ${error.message}`, error.stack);
      throw new Error(`Failed to retrieve VAT configurations: ${error.message}`);
    }
  }

  async getVatConfiguration(id: string) {
    try {
      const configuration = await this.vatConfigurationModel.findById(id).lean();
      if (!configuration) {
        throw new NotFoundException(`VAT configuration with ID ${id} not found`);
      }

      return {
        ...configuration,
        id: configuration._id.toString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get VAT configuration ${id}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) throw error;
      throw new Error(`Failed to retrieve VAT configuration: ${error.message}`);
    }
  }

  async createVatConfiguration(createDto: CreateVatConfigurationDto, adminId: string) {
    try {
      // Check if configuration name already exists
      const existingConfig = await this.vatConfigurationModel.findOne({
        configurationName: createDto.configurationName
      });

      if (existingConfig) {
        throw new Error(`VAT configuration with name "${createDto.configurationName}" already exists`);
      }

      const newConfiguration = new this.vatConfigurationModel({
        ...createDto,
        createdBy: adminId,
        lastModifiedBy: adminId,
      });

      const savedConfig = await newConfiguration.save();
      this.logger.log(`Created VAT configuration: ${savedConfig.configurationName} by admin ${adminId}`);

      return {
        ...savedConfig.toObject(),
        id: savedConfig._id.toString(),
      };
    } catch (error) {
      this.logger.error(`Failed to create VAT configuration: ${error.message}`, error.stack);
      throw new Error(`Failed to create VAT configuration: ${error.message}`);
    }
  }

  async updateVatConfiguration(id: string, updateDto: UpdateVatConfigurationDto, adminId: string) {
    try {
      const existingConfig = await this.vatConfigurationModel.findById(id);
      if (!existingConfig) {
        throw new NotFoundException(`VAT configuration with ID ${id} not found`);
      }

      // If updating name, check for duplicates
      if (updateDto.configurationName && updateDto.configurationName !== existingConfig.configurationName) {
        const duplicateConfig = await this.vatConfigurationModel.findOne({
          configurationName: updateDto.configurationName,
          _id: { $ne: id }
        });

        if (duplicateConfig) {
          throw new Error(`VAT configuration with name "${updateDto.configurationName}" already exists`);
        }
      }

      const updatedConfig = await this.vatConfigurationModel.findByIdAndUpdate(
        id,
        {
          ...updateDto,
          lastModifiedBy: adminId,
          updatedAt: new Date(),
        },
        { new: true }
      ).lean();

      this.logger.log(`Updated VAT configuration: ${id} by admin ${adminId}`);
      return {
        ...updatedConfig,
        id: updatedConfig._id.toString(),
      };
    } catch (error) {
      this.logger.error(`Failed to update VAT configuration ${id}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) throw error;
      throw new Error(`Failed to update VAT configuration: ${error.message}`);
    }
  }

  async deleteVatConfiguration(id: string, adminId: string) {
    try {
      const configuration = await this.vatConfigurationModel.findById(id);
      if (!configuration) {
        throw new NotFoundException(`VAT configuration with ID ${id} not found`);
      }

      // Don't allow deletion of active configurations
      if (configuration.isActive) {
        throw new Error('Cannot delete active VAT configuration. Deactivate it first.');
      }

      await this.vatConfigurationModel.findByIdAndDelete(id);
      this.logger.log(`Deleted VAT configuration: ${id} by admin ${adminId}`);

      return { message: 'VAT configuration deleted successfully' };
    } catch (error) {
      this.logger.error(`Failed to delete VAT configuration ${id}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) throw error;
      throw new Error(`Failed to delete VAT configuration: ${error.message}`);
    }
  }

  async activateVatConfiguration(id: string, adminId: string) {
    try {
      const configuration = await this.vatConfigurationModel.findById(id);
      if (!configuration) {
        throw new NotFoundException(`VAT configuration with ID ${id} not found`);
      }

      // Deactivate all other configurations
      await this.vatConfigurationModel.updateMany(
        { _id: { $ne: id } },
        { isActive: false, lastModifiedBy: adminId, updatedAt: new Date() }
      );

      // Activate the selected configuration
      const activatedConfig = await this.vatConfigurationModel.findByIdAndUpdate(
        id,
        { isActive: true, lastModifiedBy: adminId, updatedAt: new Date() },
        { new: true }
      ).lean();

      this.logger.log(`Activated VAT configuration: ${id} by admin ${adminId}`);
      return {
        message: 'VAT configuration activated successfully',
        configuration: {
          ...activatedConfig,
          id: activatedConfig._id.toString(),
        }
      };
    } catch (error) {
      this.logger.error(`Failed to activate VAT configuration ${id}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) throw error;
      throw new Error(`Failed to activate VAT configuration: ${error.message}`);
    }
  }

  async bulkUpdateStateVatRates(id: string, bulkUpdateDto: BulkStateVatRateDto, adminId: string) {
    try {
      const configuration = await this.vatConfigurationModel.findById(id);
      if (!configuration) {
        throw new NotFoundException(`VAT configuration with ID ${id} not found`);
      }

      // Update or add state configurations
      for (const stateName of bulkUpdateDto.stateNames) {
        const existingStateIndex = configuration.stateConfigurations.findIndex(
          state => state.stateName === stateName
        );

        const stateConfig = {
          stateName,
          stateCode: this.getStateCode(stateName),
          alcoholVatRates: bulkUpdateDto.alcoholVatRates,
          defaultVatRate: bulkUpdateDto.defaultVatRate,
          isActive: true,
          lastUpdated: new Date(),
        };

        if (existingStateIndex >= 0) {
          // Update existing state
          configuration.stateConfigurations[existingStateIndex] = stateConfig;
        } else {
          // Add new state
          configuration.stateConfigurations.push(stateConfig);
        }
      }

      configuration.lastModifiedBy = adminId;
      configuration.updatedAt = new Date();
      const updatedConfig = await configuration.save();

      this.logger.log(`Bulk updated VAT rates for ${bulkUpdateDto.stateNames.length} states in configuration ${id} by admin ${adminId}`);
      return {
        message: 'State VAT rates updated successfully',
        updatedStates: bulkUpdateDto.stateNames,
        configuration: {
          ...updatedConfig.toObject(),
          id: updatedConfig._id.toString(),
        }
      };
    } catch (error) {
      this.logger.error(`Failed to bulk update VAT rates for configuration ${id}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) throw error;
      throw new Error(`Failed to bulk update state VAT rates: ${error.message}`);
    }
  }

  async getStateVatRate(id: string, stateName: string, alcoholType?: string) {
    try {
      const configuration = await this.vatConfigurationModel.findById(id);
      if (!configuration) {
        throw new NotFoundException(`VAT configuration with ID ${id} not found`);
      }

      const stateConfig = configuration.stateConfigurations.find(
        state => state.stateName.toLowerCase() === stateName.toLowerCase()
      );

      if (!stateConfig) {
        return {
          stateName,
          alcoholType: alcoholType || 'general',
          vatRate: configuration.globalDefaultVatRate,
          source: 'global'
        };
      }

      if (alcoholType && alcoholType !== 'general') {
        const alcoholRate = stateConfig.alcoholVatRates.find(
          rate => rate.alcoholType === alcoholType
        );

        if (alcoholRate) {
          return {
            stateName,
            alcoholType,
            vatRate: alcoholRate.vatRate,
            source: 'specific'
          };
        }
      }

      return {
        stateName,
        alcoholType: alcoholType || 'general',
        vatRate: stateConfig.defaultVatRate,
        source: 'default'
      };
    } catch (error) {
      this.logger.error(`Failed to get VAT rate for ${stateName}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) throw error;
      throw new Error(`Failed to get state VAT rate: ${error.message}`);
    }
  }

  async getActiveVatConfiguration() {
    try {
      const activeConfig = await this.vatConfigurationModel.findOne({ isActive: true }).lean();

      if (!activeConfig) {
        this.logger.warn('No active VAT configuration found');
        return null;
      }

      return {
        ...activeConfig,
        id: activeConfig._id.toString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get active VAT configuration: ${error.message}`, error.stack);
      throw new Error(`Failed to retrieve active VAT configuration: ${error.message}`);
    }
  }

  // Helper method to get state codes (this should ideally be a separate service or config)
  private getStateCode(stateName: string): string {
    const stateCodes: Record<string, string> = {
      'Andhra Pradesh': 'AP',
      'Arunachal Pradesh': 'AR',
      'Assam': 'AS',
      'Bihar': 'BR',
      'Chhattisgarh': 'CG',
      'Goa': 'GA',
      'Gujarat': 'GJ',
      'Haryana': 'HR',
      'Himachal Pradesh': 'HP',
      'Jharkhand': 'JH',
      'Karnataka': 'KA',
      'Kerala': 'KL',
      'Madhya Pradesh': 'MP',
      'Maharashtra': 'MH',
      'Manipur': 'MN',
      'Meghalaya': 'ML',
      'Mizoram': 'MZ',
      'Nagaland': 'NL',
      'Odisha': 'OR',
      'Punjab': 'PB',
      'Rajasthan': 'RJ',
      'Sikkim': 'SK',
      'Tamil Nadu': 'TN',
      'Telangana': 'TG',
      'Tripura': 'TR',
      'Uttar Pradesh': 'UP',
      'Uttarakhand': 'UK',
      'West Bengal': 'WB',
      'Delhi': 'DL',
      'Jammu and Kashmir': 'JK',
      'Ladakh': 'LA',
      'Lakshadweep': 'LD',
      'Puducherry': 'PY',
      'Andaman and Nicobar Islands': 'AN',
      'Chandigarh': 'CH',
      'Dadra and Nagar Haveli and Daman and Diu': 'DN'
    };

    return stateCodes[stateName] || stateName.substring(0, 2).toUpperCase();
  }
}