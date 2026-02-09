import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionEnforcementService } from '../subscription-enforcement.service';
import { FEATURE_ACCESS_KEY, FeatureAccessType } from '../decorators/feature-access.decorator';

@Injectable()
export class FeatureAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionEnforcement: SubscriptionEnforcementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<FeatureAccessType>(
      FEATURE_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!feature) {
      return true; // No feature access requirement
    }

    const request = context.switchToHttp().getRequest();
    const restaurantId = this.extractRestaurantId(request);

    if (!restaurantId) {
      throw new Error('Restaurant ID is required for feature access checks');
    }

    // Check if restaurant has access to the feature
    await this.subscriptionEnforcement.checkFeatureAccess(restaurantId, feature);

    return true;
  }

  private extractRestaurantId(request: any): string | null {
    // Try different common patterns for restaurant ID
    return (
      request.params?.restaurantId ||
      request.body?.restaurantId ||
      request.user?.restaurantId ||
      null
    );
  }
}