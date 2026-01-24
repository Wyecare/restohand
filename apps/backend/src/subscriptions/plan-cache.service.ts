import { Injectable, Logger } from '@nestjs/common';
import { RazorpayService } from '../payments/razorpay.service';
import { SubscriptionPlan } from './schemas/subscription.schema';

interface CachedPlan {
  id: string;
  entity: string;
  interval: number;
  period: string;
  item: {
    id: string;
    active: boolean;
    name: string;
    description: string;
    amount: number;
    unit_amount: number;
    currency: string;
    type: string;
    created_at: number;
    updated_at: number;
  };
  notes: Record<string, string>;
  created_at: number;
}

interface PlanCacheEntry {
  plans: CachedPlan[];
  lastFetched: number;
  ttl: number; // Time to live in milliseconds
}

@Injectable()
export class PlanCacheService {
  private readonly logger = new Logger(PlanCacheService.name);
  private readonly cache = new Map<string, PlanCacheEntry>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  private readonly SYNC_INTERVAL = 10 * 60 * 1000; // 10 minutes sync interval

  constructor(private readonly razorpayService: RazorpayService) {
    // Set up periodic sync
    setInterval(() => {
      this.syncPlansFromRazorpay().catch(error => {
        this.logger.error('Periodic sync failed:', error);
      });
    }, this.SYNC_INTERVAL);
  }

  async getAllPlans(forceRefresh = false): Promise<CachedPlan[]> {
    const cacheKey = 'all_plans';
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    // Check if cache is valid
    if (!forceRefresh && cached && (now - cached.lastFetched) < cached.ttl) {
      this.logger.debug('Returning cached plans');
      return cached.plans;
    }

    // Fetch fresh data from Razorpay
    try {
      this.logger.log('Fetching plans from Razorpay...');
      const response = await this.razorpayService.getAllPlans({ count: 100 });
      const plans: CachedPlan[] = response.items || [];

      // Cache the results
      this.cache.set(cacheKey, {
        plans,
        lastFetched: now,
        ttl: this.DEFAULT_TTL,
      });

      this.logger.log(`Cached ${plans.length} plans from Razorpay`);
      return plans;
    } catch (error) {
      this.logger.error(`Failed to fetch plans from Razorpay: ${error.message}`);

      // Return cached data if available, even if stale
      if (cached) {
        this.logger.warn('Returning stale cached plans due to fetch failure');
        return cached.plans;
      }

      throw error;
    }
  }

  async getPlan(planId: string, forceRefresh = false): Promise<CachedPlan | null> {
    const cacheKey = `plan_${planId}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    // Check if cache is valid
    if (!forceRefresh && cached && (now - cached.lastFetched) < cached.ttl) {
      this.logger.debug(`Returning cached plan ${planId}`);
      return cached.plans[0] || null;
    }

    // Fetch fresh data from Razorpay
    try {
      this.logger.log(`Fetching plan ${planId} from Razorpay...`);
      const plan: CachedPlan = await this.razorpayService.getPlan(planId);

      // Cache the result
      this.cache.set(cacheKey, {
        plans: [plan],
        lastFetched: now,
        ttl: this.DEFAULT_TTL,
      });

      this.logger.log(`Cached plan ${planId} from Razorpay`);
      return plan;
    } catch (error) {
      this.logger.error(`Failed to fetch plan ${planId} from Razorpay: ${error.message}`);

      // Return cached data if available, even if stale
      if (cached && cached.plans[0]) {
        this.logger.warn(`Returning stale cached plan ${planId} due to fetch failure`);
        return cached.plans[0];
      }

      return null;
    }
  }

  /**
   * Map Razorpay plans to internal plan types based on notes.tier
   */
  async getPlansGroupedByTier(): Promise<Record<string, CachedPlan[]>> {
    const plans = await this.getAllPlans();
    const grouped: Record<string, CachedPlan[]> = {};

    plans.forEach(plan => {
      const tier = plan.notes?.tier || 'unknown';
      if (!grouped[tier]) {
        grouped[tier] = [];
      }
      grouped[tier].push(plan);
    });

    return grouped;
  }

  /**
   * Find plans that match specific criteria
   */
  async findPlans(criteria: {
    tier?: string;
    period?: string;
    testMode?: boolean;
  }): Promise<CachedPlan[]> {
    const plans = await this.getAllPlans();

    return plans.filter(plan => {
      if (criteria.tier && plan.notes?.tier !== criteria.tier) {
        return false;
      }
      if (criteria.period && plan.period !== criteria.period) {
        return false;
      }
      if (criteria.testMode !== undefined) {
        const isTestPlan = plan.notes?.test_mode === 'true';
        if (criteria.testMode !== isTestPlan) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Map legacy SubscriptionPlan enum to actual Razorpay plan IDs
   */
  async mapLegacyPlanToRazorpayId(legacyPlan: SubscriptionPlan): Promise<string | null> {
    const plans = await this.getAllPlans();

    // Mapping logic based on plan characteristics
    const mapping = {
      [SubscriptionPlan.STARTER_MONTHLY]: { tier: 'starter', period: 'monthly' },
      [SubscriptionPlan.STARTER_YEARLY]: { tier: 'starter', period: 'yearly' },
      [SubscriptionPlan.PROFESSIONAL_MONTHLY]: { tier: 'professional', period: 'monthly' },
      [SubscriptionPlan.PROFESSIONAL_YEARLY]: { tier: 'professional', period: 'yearly' },
      [SubscriptionPlan.ENTERPRISE_MONTHLY]: { tier: 'enterprise', period: 'monthly' },
      [SubscriptionPlan.ENTERPRISE_YEARLY]: { tier: 'enterprise', period: 'yearly' },
      [SubscriptionPlan.FOUNDING_MEMBER]: { tier: 'founding_member', period: 'monthly' },
      [SubscriptionPlan.EARLY_ADOPTER]: { tier: 'early_adopter', period: 'monthly' },
    };

    const criteria = mapping[legacyPlan];
    if (!criteria) {
      return null;
    }

    const matchingPlans = await this.findPlans(criteria);

    // Prefer production plans over test plans
    const productionPlan = matchingPlans.find(p => p.notes?.test_mode !== 'true');
    if (productionPlan) {
      return productionPlan.id;
    }

    // Fallback to test plan if no production plan found
    return matchingPlans[0]?.id || null;
  }

  /**
   * Get plan for testing (daily/weekly billing)
   */
  async getTestPlan(tier: 'starter' | 'professional' | 'enterprise'): Promise<CachedPlan | null> {
    const testPlans = await this.findPlans({
      tier,
      testMode: true,
    });

    // Prefer daily plans for testing, then weekly
    const dailyPlan = testPlans.find(p => p.period === 'daily');
    if (dailyPlan) {
      return dailyPlan;
    }

    const weeklyPlan = testPlans.find(p => p.period === 'weekly');
    if (weeklyPlan) {
      return weeklyPlan;
    }

    return testPlans[0] || null;
  }

  /**
   * Force refresh all cached plans
   */
  async syncPlansFromRazorpay(): Promise<void> {
    this.logger.log('Starting plan sync from Razorpay...');

    try {
      await this.getAllPlans(true);
      this.logger.log('Plan sync completed successfully');
    } catch (error) {
      this.logger.error('Plan sync failed:', error);
      throw error;
    }
  }

  /**
   * Clear all cached plans
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('Plan cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { totalEntries: number; entries: Array<{ key: string; age: number }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      age: now - value.lastFetched,
    }));

    return {
      totalEntries: this.cache.size,
      entries,
    };
  }
}