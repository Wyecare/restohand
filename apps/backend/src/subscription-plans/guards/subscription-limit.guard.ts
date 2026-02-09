import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionEnforcementService } from '../subscription-enforcement.service';
import { SUBSCRIPTION_LIMIT_KEY, SubscriptionLimitType } from '../decorators/subscription-limit.decorator';

@Injectable()
export class SubscriptionLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionEnforcement: SubscriptionEnforcementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limitType = this.reflector.getAllAndOverride<SubscriptionLimitType>(
      SUBSCRIPTION_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!limitType) {
      return true; // No subscription limit required
    }

    const request = context.switchToHttp().getRequest();
    const restaurantId = this.extractRestaurantId(request);

    if (!restaurantId) {
      throw new Error('Restaurant ID is required for subscription limit checks');
    }

    // Check the appropriate limit based on the limit type
    switch (limitType) {
      case 'branch':
        await this.subscriptionEnforcement.checkBranchLimit(restaurantId);
        break;
      case 'table':
        await this.subscriptionEnforcement.checkTableLimit(restaurantId, request.body.branchId);
        break;
      case 'staff':
        await this.subscriptionEnforcement.checkStaffLimit(restaurantId);
        break;
      case 'menu_item':
        await this.subscriptionEnforcement.checkMenuItemLimit(restaurantId);
        break;
      default:
        throw new Error(`Unknown subscription limit type: ${limitType}`);
    }

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