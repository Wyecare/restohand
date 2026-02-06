import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubscriptionPlan, SubscriptionPlanDocument } from './schemas/subscription-plan.schema';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { CashfreeService } from '../payments/cashfree.service';

@Injectable()
export class SubscriptionPlansService {
  private readonly logger = new Logger(SubscriptionPlansService.name);

  constructor(
    @InjectModel(SubscriptionPlan.name)
    private subscriptionPlanModel: Model<SubscriptionPlanDocument>,
    private cashfreeService: CashfreeService,
  ) {}

  async createPlan(createPlanDto: CreateSubscriptionPlanDto, adminId: string): Promise<SubscriptionPlan> {
    let createdPlan: SubscriptionPlanDocument | null = null;

    try {
      this.logger.log(`Creating subscription plan: ${createPlanDto.plan_name}`);

      // First, create plan in our database to get a unique MongoDB ObjectId
      createdPlan = new this.subscriptionPlanModel({
        plan_name: createPlanDto.plan_name,
        plan_type: createPlanDto.plan_type,
        plan_currency: createPlanDto.plan_currency || 'INR',
        plan_recurring_amount: createPlanDto.plan_recurring_amount,
        plan_max_amount: createPlanDto.plan_max_amount,
        plan_max_cycles: createPlanDto.plan_max_cycles,
        plan_intervals: createPlanDto.plan_intervals,
        plan_interval_type: createPlanDto.plan_interval_type,
        plan_note: createPlanDto.plan_note,
        plan_status: 'INACTIVE', // Mark as inactive until Cashfree creation succeeds

        // Our custom fields
        tier: createPlanDto.tier,
        display_name: createPlanDto.display_name || createPlanDto.plan_name,
        description: createPlanDto.description,
        features: createPlanDto.features || [],
        is_popular: createPlanDto.is_popular || false,
        metadata: createPlanDto.metadata || {},

        // Audit fields
        created_by: adminId,
        cashfree_sync_status: 'PENDING',
        is_active: false, // Will be activated after Cashfree creation
      });

      const savedPlan = await createdPlan.save();
      this.logger.log(`Created plan in database with ID: ${savedPlan._id}`);

      // Use MongoDB ObjectId for unique Cashfree plan_id
      const uniquePlanId = `restohand_${savedPlan._id.toString()}`;

      // Prepare Cashfree plan data - Convert paisa to rupees for Cashfree
      const cashfreePlanData = {
        plan_id: uniquePlanId,
        plan_name: createPlanDto.plan_name,
        plan_type: createPlanDto.plan_type,
        plan_max_amount: Math.round(createPlanDto.plan_max_amount / 100), // Convert paisa to rupees
        plan_currency: createPlanDto.plan_currency || 'INR',
        ...(createPlanDto.plan_type === 'PERIODIC' && {
          plan_recurring_amount: Math.round(createPlanDto.plan_recurring_amount / 100), // Convert paisa to rupees
          plan_intervals: createPlanDto.plan_intervals,
          plan_interval_type: createPlanDto.plan_interval_type,
        }),
        ...(createPlanDto.plan_max_cycles && { plan_max_cycles: createPlanDto.plan_max_cycles }),
        ...(createPlanDto.plan_note && { plan_note: createPlanDto.plan_note }),
      };

      // Create plan in Cashfree
      let cashfreeResponse;
      try {
        cashfreeResponse = await this.cashfreeService.createSubscriptionPlan(cashfreePlanData);
        this.logger.log(`Cashfree plan created successfully: ${cashfreeResponse.plan_id}`);
      } catch (error) {
        this.logger.error(`Failed to create plan in Cashfree: ${error.message}`);

        // Delete the plan from our database if Cashfree creation fails
        await this.subscriptionPlanModel.findByIdAndDelete(savedPlan._id);
        this.logger.log(`Cleaned up database plan due to Cashfree failure: ${savedPlan._id}`);

        throw error;
      }

      // Update the existing plan with Cashfree data
      const updatedPlan = await this.subscriptionPlanModel.findByIdAndUpdate(
        savedPlan._id,
        {
          cashfree_plan_id: cashfreeResponse.plan_id,
          plan_status: cashfreeResponse.plan_status || 'ACTIVE',
          is_active: true,
          cashfree_sync_status: 'SYNCED',
          last_synced_at: new Date(),
        },
        { new: true }
      );

      this.logger.log(`Subscription plan activated and synced: ${updatedPlan._id}`);

      return updatedPlan;
    } catch (error) {
      this.logger.error(`Failed to create subscription plan: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getAllPlans(): Promise<SubscriptionPlan[]> {
    try {
      return await this.subscriptionPlanModel
        .find({ is_active: true })
        .sort({ is_popular: -1, created_at: -1 })
        .exec();
    } catch (error) {
      this.logger.error(`Failed to fetch subscription plans: ${error.message}`);
      throw error;
    }
  }

  async getPlanById(planId: string): Promise<SubscriptionPlan> {
    try {
      const plan = await this.subscriptionPlanModel.findById(planId);
      if (!plan) {
        throw new NotFoundException(`Subscription plan not found: ${planId}`);
      }
      return plan;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch subscription plan: ${error.message}`);
      throw error;
    }
  }

  async getPlanByCashfreePlanId(cashfreePlanId: string): Promise<SubscriptionPlan> {
    try {
      const plan = await this.subscriptionPlanModel.findOne({
        cashfree_plan_id: cashfreePlanId
      });
      if (!plan) {
        throw new NotFoundException(`Subscription plan not found: ${cashfreePlanId}`);
      }
      return plan;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch subscription plan: ${error.message}`);
      throw error;
    }
  }

  async updatePlan(
    planId: string,
    updateData: Partial<SubscriptionPlan>,
    adminId: string
  ): Promise<SubscriptionPlan> {
    try {
      const plan = await this.getPlanById(planId);

      const updatedPlan = await this.subscriptionPlanModel.findByIdAndUpdate(
        planId,
        {
          ...updateData,
          updated_by: adminId,
          updated_at: new Date(),
        },
        { new: true }
      );

      this.logger.log(`Subscription plan updated: ${planId} by admin ${adminId}`);
      return updatedPlan;
    } catch (error) {
      this.logger.error(`Failed to update subscription plan: ${error.message}`);
      throw error;
    }
  }

  async deactivatePlan(planId: string, adminId: string): Promise<SubscriptionPlan> {
    try {
      return await this.updatePlan(planId, {
        is_active: false,
        plan_status: 'INACTIVE'
      }, adminId);
    } catch (error) {
      this.logger.error(`Failed to deactivate subscription plan: ${error.message}`);
      throw error;
    }
  }

  // Method to delete plan from database only (not from Cashfree)
  async deletePlanFromDatabase(planId: string, adminId: string): Promise<{ success: boolean }> {
    try {
      const plan = await this.getPlanById(planId);

      if (!plan) {
        throw new NotFoundException(`Subscription plan not found: ${planId}`);
      }

      // Delete plan from database only
      await this.subscriptionPlanModel.findByIdAndDelete(planId);

      this.logger.log(`Deleted plan from database only: ${plan.cashfree_plan_id} by admin ${adminId}. Plan still exists in Cashfree.`);

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete subscription plan from database: ${error.message}`);
      throw error;
    }
  }

  async getRecommendedTemplates() {
    return [
      // BASIC PLAN - "STARTER"
      {
        id: 'basic_monthly_starter',
        name: 'Basic Starter (Monthly)',
        plan_id: 'restohand_basic_starter_monthly',
        plan_name: 'Basic Starter Monthly Plan',
        plan_type: 'PERIODIC',
        plan_recurring_amount: 59900, // ₹599
        plan_max_amount: 59900,
        plan_max_cycles: 12,
        plan_intervals: 1,
        plan_currency: 'INR',
        plan_interval_type: 'MONTH',
        plan_note: 'Basic plan with essential QR dining features - Monthly billing at Rs 599. Perfect for small cafes and single-location restaurants.',
        tier: 'basic',
        display_name: 'Basic Starter',
        description: 'Most affordable smart POS in market - Perfect for small cafes, single-location restaurants, street food vendors',
        features: [
          'qr_menu_ordering',
          'digital_receipts',
          'basic_pos',
          'order_management',
          'upi_card_payments',
          'basic_reports',
          'email_chat_support'
        ],
        is_popular: false,
        metadata: {
          max_locations: 1,
          max_tables: 15,
          max_staff: 3,
          max_monthly_orders: 500,
          target_segment: 'Small cafes, street food vendors',
          key_benefit: '50% cheaper than competitors'
        }
      },
      {
        id: 'basic_annual_starter',
        name: 'Basic Starter (Annual)',
        plan_id: 'restohand_basic_starter_annual',
        plan_name: 'Basic Starter Annual Plan',
        plan_type: 'PERIODIC',
        plan_recurring_amount: 499900, // ₹4,999 (30% discount)
        plan_max_amount: 499900,
        plan_max_cycles: 5,
        plan_intervals: 1,
        plan_currency: 'INR',
        plan_interval_type: 'YEAR',
        plan_note: 'Basic plan with annual billing - Save 30% at Rs 4999 per year. Perfect for cost-conscious small restaurants.',
        tier: 'basic',
        display_name: 'Basic Starter (Annual - Save 30%)',
        description: 'Annual savings on basic features - Perfect for budget-conscious small restaurants',
        features: [
          'qr_menu_ordering',
          'digital_receipts',
          'basic_pos',
          'order_management',
          'upi_card_payments',
          'basic_reports',
          'email_chat_support'
        ],
        is_popular: false,
        metadata: {
          max_locations: 1,
          max_tables: 15,
          max_staff: 3,
          max_monthly_orders: 500,
          savings_percent: 30,
          target_segment: 'Budget-conscious small restaurants'
        }
      },

      // PROFESSIONAL PLAN - "GROWTH" ⭐ MOST POPULAR
      {
        id: 'professional_monthly_growth',
        name: 'Professional Growth (Monthly)',
        plan_id: 'restohand_professional_growth_monthly',
        plan_name: 'Professional Growth Monthly Plan',
        plan_type: 'PERIODIC',
        plan_recurring_amount: 149900, // ₹1,499
        plan_max_amount: 149900,
        plan_max_cycles: 12,
        plan_intervals: 1,
        plan_currency: 'INR',
        plan_interval_type: 'MONTH',
        plan_note: 'Professional plan with advanced features - Monthly billing at Rs 1499. Best value for scaling businesses with multi-location support.',
        tier: 'professional',
        display_name: 'Professional Growth',
        description: 'Best value for scaling businesses - Growing restaurants, multi-location chains, QSRs',
        features: [
          'unlimited_orders',
          'advanced_analytics',
          'inventory_management',
          'staff_management',
          'kitchen_display_system',
          'multi_location_dashboard',
          'whatsapp_integration',
          'zomato_swiggy_sync',
          'customer_database',
          'marketing_tools',
          'priority_phone_support'
        ],
        is_popular: true,
        metadata: {
          max_locations: 5,
          max_tables: 100,
          max_staff: 15,
          max_monthly_orders: -1, // unlimited
          target_segment: 'Growing restaurants, multi-location chains',
          key_benefit: '85% cheaper than competitors + delivery platform integration'
        }
      },
      {
        id: 'professional_annual_growth',
        name: 'Professional Growth (Annual)',
        plan_id: 'restohand_professional_growth_annual',
        plan_name: 'Professional Growth Annual Plan',
        plan_type: 'PERIODIC',
        plan_recurring_amount: 1249900, // ₹12,499 (31% discount)
        plan_max_amount: 1249900,
        plan_max_cycles: 5,
        plan_intervals: 1,
        plan_currency: 'INR',
        plan_interval_type: 'YEAR',
        plan_note: 'Professional plan with annual billing - Save 31% at Rs 12499 per year. Best value for professional features with annual savings.',
        tier: 'professional',
        display_name: 'Professional Growth (Annual - Save 31%)',
        description: 'Best value annually - Professional features with significant annual savings',
        features: [
          'unlimited_orders',
          'advanced_analytics',
          'inventory_management',
          'staff_management',
          'kitchen_display_system',
          'multi_location_dashboard',
          'whatsapp_integration',
          'zomato_swiggy_sync',
          'customer_database',
          'marketing_tools',
          'priority_phone_support'
        ],
        is_popular: true,
        metadata: {
          max_locations: 5,
          max_tables: 100,
          max_staff: 15,
          max_monthly_orders: -1, // unlimited
          savings_percent: 31,
          target_segment: 'Cost-conscious scaling businesses'
        }
      },

      // ENTERPRISE PLAN - "SCALE"
      {
        id: 'enterprise_monthly_scale',
        name: 'Enterprise Scale (Monthly)',
        plan_id: 'restohand_enterprise_scale_monthly',
        plan_name: 'Enterprise Scale Monthly Plan',
        plan_type: 'PERIODIC',
        plan_recurring_amount: 299900, // ₹2,999
        plan_max_amount: 299900,
        plan_max_cycles: 12,
        plan_intervals: 1,
        plan_currency: 'INR',
        plan_interval_type: 'MONTH',
        plan_note: 'Enterprise plan with complete restaurant tech stack - Monthly billing at Rs 2999. Perfect for large restaurant chains and hotels.',
        tier: 'enterprise',
        display_name: 'Enterprise Scale',
        description: 'Complete restaurant tech stack - Large restaurant chains, fine dining, hotels',
        features: [
          'unlimited_everything',
          'advanced_inventory_multi_location',
          'franchise_management',
          'custom_api_integrations',
          'advanced_reports_bi',
          'customer_loyalty_program',
          'table_reservation_system',
          'recipe_cost_management',
          'procurement_vendor_management',
          'predictive_analytics',
          'dedicated_account_manager',
          '24x7_phone_support',
          'custom_white_label_branding'
        ],
        is_popular: false,
        metadata: {
          max_locations: -1, // unlimited
          max_tables: -1, // unlimited
          max_staff: -1, // unlimited
          max_monthly_orders: -1, // unlimited
          target_segment: 'Large chains, fine dining, hotels',
          key_benefit: '75% cheaper than enterprise solutions'
        }
      },
      {
        id: 'enterprise_annual_scale',
        name: 'Enterprise Scale (Annual)',
        plan_id: 'restohand_enterprise_scale_annual',
        plan_name: 'Enterprise Scale Annual Plan',
        plan_type: 'PERIODIC',
        plan_recurring_amount: 2499900, // ₹24,999 (31% discount)
        plan_max_amount: 2499900,
        plan_max_cycles: 5,
        plan_intervals: 1,
        plan_currency: 'INR',
        plan_interval_type: 'YEAR',
        plan_note: 'Enterprise plan with annual billing - Save 31% at Rs 24999 per year. Complete solution for large restaurant operations.',
        tier: 'enterprise',
        display_name: 'Enterprise Scale (Annual - Save 31%)',
        description: 'Complete enterprise solution with annual savings - Maximum value for large operations',
        features: [
          'unlimited_everything',
          'advanced_inventory_multi_location',
          'franchise_management',
          'custom_api_integrations',
          'advanced_reports_bi',
          'customer_loyalty_program',
          'table_reservation_system',
          'recipe_cost_management',
          'procurement_vendor_management',
          'predictive_analytics',
          'dedicated_account_manager',
          '24x7_phone_support',
          'custom_white_label_branding'
        ],
        is_popular: false,
        metadata: {
          max_locations: -1, // unlimited
          max_tables: -1, // unlimited
          max_staff: -1, // unlimited
          max_monthly_orders: -1, // unlimited
          savings_percent: 31,
          target_segment: 'Enterprise with annual commitment'
        }
      }
    ];
  }

  async getPlansByTier(tier: string): Promise<SubscriptionPlan[]> {
    try {
      return await this.subscriptionPlanModel
        .find({ tier, is_active: true })
        .sort({ is_popular: -1, created_at: -1 })
        .exec();
    } catch (error) {
      this.logger.error(`Failed to fetch plans by tier: ${error.message}`);
      throw error;
    }
  }

  async syncPlanWithCashfree(planId: string): Promise<SubscriptionPlan> {
    try {
      const plan = await this.getPlanById(planId);

      // Fetch latest data from Cashfree
      const cashfreeData = await this.cashfreeService.getSubscriptionPlan(plan.cashfree_plan_id);

      // Update our database with latest Cashfree data
      const updatedPlan = await this.subscriptionPlanModel.findByIdAndUpdate(
        planId,
        {
          plan_status: cashfreeData.plan_status,
          cashfree_sync_status: 'SYNCED',
          last_synced_at: new Date(),
        },
        { new: true }
      );

      this.logger.log(`Plan synced with Cashfree: ${plan.cashfree_plan_id}`);
      return updatedPlan;
    } catch (error) {
      // Mark sync as failed
      await this.subscriptionPlanModel.findByIdAndUpdate(planId, {
        cashfree_sync_status: 'FAILED',
        cashfree_sync_error: error.message,
      });

      this.logger.error(`Failed to sync plan with Cashfree: ${error.message}`);
      throw error;
    }
  }

  // Method to match Cashfree plan to template data based on plan characteristics
  private matchPlanToTemplate(cashfreeData: any, templates: any[]) {
    // Try to find exact match by plan_id
    let matchedTemplate = templates.find(template => template.plan_id === cashfreeData.plan_id);

    if (matchedTemplate) {
      this.logger.log(`Found exact plan_id match: ${cashfreeData.plan_id}`);
      return matchedTemplate;
    }

    // Try to match by amount and billing cycle
    const amount = cashfreeData.plan_recurring_amount || cashfreeData.plan_max_amount;
    const intervalType = cashfreeData.plan_interval_type;

    matchedTemplate = templates.find(template =>
      template.plan_recurring_amount === amount &&
      template.plan_interval_type === intervalType
    );

    if (matchedTemplate) {
      this.logger.log(`Found amount/cycle match: ${amount} ${intervalType}`);
      return matchedTemplate;
    }

    // Fallback: try to match by amount range and determine tier
    if (amount <= 100000) { // Up to ₹1000
      // Basic tier
      matchedTemplate = templates.find(template =>
        template.tier === 'basic' && template.plan_interval_type === intervalType
      );
    } else if (amount <= 200000) { // Up to ₹2000
      // Professional tier
      matchedTemplate = templates.find(template =>
        template.tier === 'professional' && template.plan_interval_type === intervalType
      );
    } else {
      // Enterprise tier
      matchedTemplate = templates.find(template =>
        template.tier === 'enterprise' && template.plan_interval_type === intervalType
      );
    }

    if (matchedTemplate) {
      this.logger.log(`Found tier-based match: ${matchedTemplate.tier} ${intervalType}`);
      return matchedTemplate;
    }

    // If no match found, return first basic template as default
    this.logger.warn(`No template match found for ${cashfreePlanId}, using basic template`);
    return templates.find(template => template.tier === 'basic') || templates[0];
  }

  // Method to import an existing Cashfree plan into our database with full template details
  async importCashfreePlan(cashfreePlanId: string, adminId: string): Promise<SubscriptionPlan> {
    try {
      // Check if plan already exists in our database
      const existingPlan = await this.subscriptionPlanModel.findOne({
        cashfree_plan_id: cashfreePlanId
      });

      if (existingPlan) {
        this.logger.log(`Plan already exists in database: ${cashfreePlanId}`);
        return existingPlan;
      }

      // Fetch plan data from Cashfree
      const cashfreeData = await this.cashfreeService.getSubscriptionPlan(cashfreePlanId);

      // Get all template data to match against
      const templates = await this.getRecommendedTemplates();

      // Find matching template based on plan characteristics
      const matchedTemplate = this.matchPlanToTemplate(cashfreeData, templates);

      // Create plan in our database with full template details
      const subscriptionPlan = new this.subscriptionPlanModel({
        cashfree_plan_id: cashfreeData.plan_id,
        plan_name: cashfreeData.plan_name,
        plan_type: cashfreeData.plan_type,
        plan_currency: cashfreeData.plan_currency,
        plan_recurring_amount: cashfreeData.plan_recurring_amount,
        plan_max_amount: cashfreeData.plan_max_amount,
        plan_max_cycles: cashfreeData.plan_max_cycles,
        plan_intervals: cashfreeData.plan_intervals,
        plan_interval_type: cashfreeData.plan_interval_type,
        plan_note: cashfreeData.plan_note,
        plan_status: cashfreeData.plan_status || 'ACTIVE',

        // Apply full template details
        tier: matchedTemplate.tier,
        display_name: matchedTemplate.display_name,
        description: matchedTemplate.description,
        features: matchedTemplate.features,
        is_popular: matchedTemplate.is_popular,
        metadata: matchedTemplate.metadata,

        // Audit fields
        is_active: true,
        created_by: adminId,
        cashfree_sync_status: 'SYNCED',
        last_synced_at: new Date(),
      });

      const savedPlan = await subscriptionPlan.save();
      this.logger.log(`Imported Cashfree plan with template details: ${savedPlan._id} (template: ${matchedTemplate.id})`);

      return savedPlan;
    } catch (error) {
      this.logger.error(`Failed to import Cashfree plan: ${error.message}`, error.stack);
      throw error;
    }
  }
}