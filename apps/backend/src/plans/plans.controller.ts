import { Controller, Get, Logger, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { RazorpayService } from '../payments/razorpay.service';

@ApiTags('plans')
@Controller('plans')
export class PlansController {
  private readonly logger = new Logger(PlansController.name);

  constructor(private readonly razorpayService: RazorpayService) {}

  private parseFeatures(featuresString: string): string[] {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(featuresString);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      // If it's an object, extract values
      if (typeof parsed === 'object' && parsed !== null) {
        return Object.keys(parsed);
      }
      // If it's a string, return as single item array
      return [String(parsed)];
    } catch (error) {
      // If JSON parsing fails, treat as comma-separated string or single string
      if (featuresString.includes(',')) {
        return featuresString.split(',').map((f) => f.trim());
      }
      // Single feature string
      return [featuresString];
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all available subscription plans' })
  @ApiResponse({ status: 200, description: 'List of available plans' })
  @ApiQuery({
    name: 'testMode',
    required: false,
    type: 'boolean',
    description:
      'Filter plans by test mode (true for test plans, false for production plans)',
  })
  @ApiQuery({
    name: 'tier',
    required: false,
    type: 'string',
    description: 'Filter plans by tier (starter, professional, enterprise)',
  })
  async getPlans(
    @Query('testMode') testMode?: string,
    @Query('tier') tier?: string
  ) {
    try {
      this.logger.log('Fetching plans with filters:', { testMode, tier });

      const isDevMode = process.env.NODE_ENV === 'local';

      // Get all plans directly from Razorpay
      const response = await this.razorpayService.getAllPlans({ count: 100 });
      const allPlans = response.items || [];

      // Filter plans based on query parameters
      let filteredPlans = allPlans.filter((plan) => {
        // Filter by test mode
        if (testMode !== undefined) {
          const isTestPlan = plan.notes?.test_mode === 'true';
          const requestedTestMode = testMode === 'true';
          if (isTestPlan !== requestedTestMode) {
            return false;
          }
        } else {
          // Default behavior: in dev show test plans, in prod show production plans
          const isTestPlan = plan.notes?.test_mode === 'true';
          if (isDevMode && !isTestPlan) return false;
          if (!isDevMode && isTestPlan) return false;
        }

        // Filter by tier
        if (tier && plan.notes?.tier !== tier) {
          return false;
        }

        return true;
      });

      // Transform to frontend-friendly format
      const plans = filteredPlans.map((plan) => ({
        id: plan.id,
        name: plan.item.name,
        description: plan.item.description,
        amount: plan.item.amount,
        currency: plan.item.currency,
        period: plan.period,
        interval: plan.interval,
        tier: plan.notes?.tier || 'unknown',
        isTestPlan: plan.notes?.test_mode === 'true',
        billingCycle: plan.notes?.billing_cycle,
        features: plan.notes?.features
          ? this.parseFeatures(plan.notes.features)
          : [],
        popular: plan.notes?.popular === 'true',
        createdAt: plan.created_at,
      }));

      this.logger.log(
        `Returning ${plans.length} plans (dev mode: ${isDevMode})`
      );

      return {
        plans,
        total: plans.length,
        isDevMode,
      };
    } catch (error) {
      this.logger.error('Failed to fetch plans:', error);
      throw error;
    }
  }

  @Get('tiers')
  @ApiOperation({ summary: 'Get plans grouped by tier' })
  @ApiResponse({ status: 200, description: 'Plans grouped by tier' })
  async getPlansByTier() {
    try {
      // Get all plans directly from Razorpay and group by tier
      const response = await this.razorpayService.getAllPlans({ count: 100 });
      const allPlans = response.items || [];

      // Group plans by tier
      const tieredPlans = allPlans.reduce((acc, plan) => {
        const tier = plan.notes?.tier || 'unknown';
        if (!acc[tier]) acc[tier] = [];
        acc[tier].push(plan);
        return acc;
      }, {});
      const isDevMode = process.env.NODE_ENV !== 'production';

      // Transform each tier's plans
      const result = Object.keys(tieredPlans).reduce((acc, tier) => {
        const plans = tieredPlans[tier]
          .filter((plan) => {
            // In dev mode, prefer test plans; in prod, prefer production plans
            const isTestPlan = plan.notes?.test_mode === 'true';
            return isDevMode ? isTestPlan : !isTestPlan;
          })
          .map((plan) => ({
            id: plan.id,
            name: plan.item.name,
            description: plan.item.description,
            amount: plan.item.amount,
            currency: plan.item.currency,
            period: plan.period,
            interval: plan.interval,
            isTestPlan: plan.notes?.test_mode === 'true',
            billingCycle: plan.notes?.billing_cycle,
            features: plan.notes?.features
              ? this.parseFeatures(plan.notes.features)
              : [],
            popular: plan.notes?.popular === 'true',
          }));

        if (plans.length > 0) {
          acc[tier] = plans;
        }
        return acc;
      }, {});

      return {
        tiers: result,
        isDevMode,
      };
    } catch (error) {
      this.logger.error('Failed to fetch plans by tier:', error);
      throw error;
    }
  }
}
