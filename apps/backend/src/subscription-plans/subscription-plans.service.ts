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
        plan_recurring_amount: createPlanDto.plan_amount,
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

        // Business model required fields
        usage_limits: createPlanDto.usage_limits,
        pricing: createPlanDto.pricing,
        feature_access: createPlanDto.feature_access,
        target_market: createPlanDto.target_market,

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

      // DEBUG: Log the DTO values
      this.logger.log(`DEBUG DTO Values:`);
      this.logger.log(`createPlanDto.plan_amount: ${createPlanDto.plan_amount}`);
      this.logger.log(`createPlanDto.plan_max_amount: ${createPlanDto.plan_max_amount}`);
      this.logger.log(`createPlanDto.plan_type: ${createPlanDto.plan_type}`);

      // Prepare Cashfree plan data - Convert paisa to rupees for Cashfree
      const cashfreePlanData = {
        plan_id: uniquePlanId,
        plan_name: createPlanDto.plan_name,
        plan_type: createPlanDto.plan_type,
        plan_max_amount: Math.round(createPlanDto.plan_max_amount / 100), // Convert paisa to rupees
        plan_currency: createPlanDto.plan_currency || 'INR',
        plan_recurring_amount: Math.round(createPlanDto.plan_amount / 100), // Convert paisa to rupees
        plan_intervals: createPlanDto.plan_intervals,
        plan_interval_type: createPlanDto.plan_interval_type,
        ...(createPlanDto.plan_max_cycles && { plan_max_cycles: createPlanDto.plan_max_cycles }),
        ...(createPlanDto.plan_note && { plan_note: createPlanDto.plan_note.replace(/[^\w\s.-]/g, ' ').trim() }),
      };

      // DEBUG: Log the final cashfree data
      this.logger.log(`DEBUG Final Cashfree Data: ${JSON.stringify(cashfreePlanData, null, 2)}`);

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
      // STARTER PLAN - ₹999/month + 2% transaction fee
      {
        id: 'starter_monthly',
        name: 'Starter (Monthly)',
        plan_id: 'restohand_starter_monthly',
        plan_name: 'Restohand Starter Monthly Plan',
        plan_type: 'PERIODIC',
        plan_recurring_amount: 99900, // ₹999
        plan_max_amount: 99900,
        plan_max_cycles: 12,
        plan_intervals: 1,
        plan_currency: 'INR',
        plan_interval_type: 'MONTH',
        plan_note: 'Starter plan for small cafes and QSRs - ₹999/month + 2% transaction fee',
        tier: 'starter',
        display_name: 'Starter',
        description: 'Perfect for small cafes, QSRs, and family restaurants (40-60 seats)',
        features: [
          'qr_menu_ordering',
          'digital_receipts',
          'basic_pos',
          'order_management',
          'real_time_analytics'
        ],
        is_popular: false,
        usage_limits: {
          max_branches: 1,
          max_tables: 20,
          max_staff: 5,
          max_menu_items: 75
        },
        pricing: {
          base_subscription_fee: 99900, // ₹999 in paisa
          transaction_fee_percentage: 2.0,
          currency: 'INR'
        },
        feature_access: {
          qr_menu_ordering: true,
          digital_receipts: true,
          basic_pos: true,
          order_management: true,
          real_time_analytics: true,
          advanced_analytics: false,
          customer_crm: false,
          inventory_management: false,
          multi_location_management: false,
          priority_support: false,
          custom_integrations: false,
          api_access: false,
          white_label_options: false
        },
        target_market: {
          segment: 'Small cafes, QSRs, family restaurants',
          ideal_size: '40-60 seats',
          use_cases: [
            'QR-based self-ordering',
            'Digital payment acceptance',
            'Basic order management',
            'E-receipts',
            'Real-time order tracking'
          ]
        },
        metadata: {
          target_segment: 'Small cafes, QSRs, family restaurants',
          key_benefit: 'Complete POS + QR ordering solution'
        }
      },
      // PROFESSIONAL PLAN - ₹2,999/month + 2% transaction fee ⭐ MOST POPULAR
      {
        id: 'professional_monthly',
        name: 'Professional (Monthly)',
        plan_id: 'restohand_professional_monthly',
        plan_name: 'Restohand Professional Monthly Plan',
        plan_type: 'PERIODIC',
        plan_recurring_amount: 299900, // ₹2,999
        plan_max_amount: 299900,
        plan_max_cycles: 12,
        plan_intervals: 1,
        plan_currency: 'INR',
        plan_interval_type: 'MONTH',
        plan_note: 'Professional plan for growing restaurants - ₹2,999/month + 2% transaction fee',
        tier: 'professional',
        display_name: 'Professional',
        description: 'Best for multi-location chains and mid-size restaurants (100-130 seats)',
        features: [
          'qr_menu_ordering',
          'digital_receipts',
          'basic_pos',
          'order_management',
          'real_time_analytics',
          'advanced_analytics',
          'customer_crm',
          'inventory_management',
          'multi_location_management'
        ],
        is_popular: true,
        usage_limits: {
          max_branches: 3,
          max_tables: 50,
          max_staff: 15,
          max_menu_items: 200
        },
        pricing: {
          base_subscription_fee: 299900, // ₹2,999 in paisa
          transaction_fee_percentage: 2.0,
          currency: 'INR'
        },
        feature_access: {
          qr_menu_ordering: true,
          digital_receipts: true,
          basic_pos: true,
          order_management: true,
          real_time_analytics: true,
          advanced_analytics: true,
          customer_crm: true,
          inventory_management: true,
          multi_location_management: true,
          priority_support: true,
          custom_integrations: false,
          api_access: false,
          white_label_options: false
        },
        target_market: {
          segment: 'Multi-location chains, mid-size restaurants',
          ideal_size: '100-130 seats',
          use_cases: [
            'Multi-branch management',
            'Advanced analytics & reports',
            'Customer relationship management',
            'Inventory tracking',
            'Priority customer support'
          ]
        },
        metadata: {
          target_segment: 'Multi-location chains, mid-size restaurants',
          key_benefit: 'Complete business management solution'
        }
      },
      // ENTERPRISE PLAN - ₹5,999/month + 2% transaction fee
      {
        id: 'enterprise_monthly',
        name: 'Enterprise (Monthly)',
        plan_id: 'restohand_enterprise_monthly',
        plan_name: 'Restohand Enterprise Monthly Plan',
        plan_type: 'PERIODIC',
        plan_recurring_amount: 599900, // ₹5,999
        plan_max_amount: 599900,
        plan_max_cycles: 12,
        plan_intervals: 1,
        plan_currency: 'INR',
        plan_interval_type: 'MONTH',
        plan_note: 'Enterprise plan for large chains and franchises - ₹5,999/month + 2% transaction fee',
        tier: 'enterprise',
        display_name: 'Enterprise',
        description: 'For large chains, fine dining groups, and franchises',
        features: [
          'qr_menu_ordering',
          'digital_receipts',
          'basic_pos',
          'order_management',
          'real_time_analytics',
          'advanced_analytics',
          'customer_crm',
          'inventory_management',
          'multi_location_management',
          'custom_integrations',
          'api_access',
          'white_label_options'
        ],
        is_popular: false,
        usage_limits: {
          max_branches: -1, // Unlimited
          max_tables: -1, // Unlimited
          max_staff: -1, // Unlimited
          max_menu_items: -1 // Unlimited
        },
        pricing: {
          base_subscription_fee: 599900, // ₹5,999 in paisa
          transaction_fee_percentage: 2.0,
          currency: 'INR'
        },
        feature_access: {
          qr_menu_ordering: true,
          digital_receipts: true,
          basic_pos: true,
          order_management: true,
          real_time_analytics: true,
          advanced_analytics: true,
          customer_crm: true,
          inventory_management: true,
          multi_location_management: true,
          priority_support: true,
          custom_integrations: true,
          api_access: true,
          white_label_options: true
        },
        target_market: {
          segment: 'Large chains, fine dining groups, franchises',
          ideal_size: 'Unlimited locations',
          use_cases: [
            'Franchise management',
            'White-label solutions',
            'Custom API integrations',
            'Advanced business intelligence',
            'Dedicated account management'
          ]
        },
        metadata: {
          target_segment: 'Large chains, fine dining groups, franchises',
          key_benefit: 'Enterprise-grade solution with unlimited scalability'
        }
      }
    ];
  }

  async createPlanLegacy(planData: any) {
    try {
      // Create plan in Cashfree first
      const cashfreeData = {
        plan_id: planData.plan_name, // Use plan_name as the ID
        plan_name: planData.plan_name,
        plan_type: planData.plan_type,
        plan_amount: planData.plan_amount,
        plan_max_amount: planData.plan_max_amount,
        plan_max_cycles: planData.plan_max_cycles,
        plan_intervals: planData.plan_intervals,
        plan_currency: planData.plan_currency,
        plan_interval_type: planData.plan_interval_type,
        plan_note: planData.plan_note || '',
      };

      // Create plan in Cashfree
      const cashfreePlan = await this.cashfreeService.createSubscriptionPlan(cashfreeData);

      // Create plan in our database with business model fields
      const newPlan = new this.subscriptionPlanModel({
        // Core Cashfree fields
        cashfree_plan_id: cashfreePlan.plan_id,
        plan_name: planData.plan_name,
        plan_type: planData.plan_type,
        plan_recurring_amount: planData.plan_amount,
        plan_max_amount: planData.plan_max_amount,
        plan_max_cycles: planData.plan_max_cycles,
        plan_intervals: planData.plan_intervals,
        plan_currency: planData.plan_currency,
        plan_interval_type: planData.plan_interval_type,
        plan_note: planData.plan_note || '',
        plan_status: 'ACTIVE',
        is_active: true,

        // Business Model fields
        tier: planData.tier,
        display_name: planData.display_name,
        description: planData.description,
        features: planData.features,
        is_popular: planData.is_popular || false,
        usage_limits: planData.usage_limits,
        pricing: planData.pricing,
        feature_access: planData.feature_access,
        target_market: planData.target_market,

        // Legacy metadata for backward compatibility
        plan_metadata: planData.plan_metadata || {
          tier: planData.tier,
          features: planData.features?.join(','),
          display_name: planData.display_name,
          is_popular: planData.is_popular || false
        },

        // Tracking fields
        created_at: new Date(),
        updated_at: new Date(),
        cashfree_sync_status: 'SYNCED',
        last_synced_at: new Date()
      });

      const savedPlan = await newPlan.save();

      this.logger.log(`Created new business model subscription plan: ${savedPlan.cashfree_plan_id}`);

      return savedPlan;
    } catch (error) {
      this.logger.error(`Failed to create subscription plan: ${error.message}`);
      throw error;
    }
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