import { SetMetadata } from '@nestjs/common';

export const SUBSCRIPTION_LIMIT_KEY = 'subscriptionLimit';

export type SubscriptionLimitType = 'branch' | 'table' | 'staff' | 'menu_item';

export const RequireSubscriptionLimit = (limitType: SubscriptionLimitType) =>
  SetMetadata(SUBSCRIPTION_LIMIT_KEY, limitType);

// Convenient decorators for common limits
export const RequireBranchLimit = () => RequireSubscriptionLimit('branch');
export const RequireTableLimit = () => RequireSubscriptionLimit('table');
export const RequireStaffLimit = () => RequireSubscriptionLimit('staff');
export const RequireMenuItemLimit = () => RequireSubscriptionLimit('menu_item');