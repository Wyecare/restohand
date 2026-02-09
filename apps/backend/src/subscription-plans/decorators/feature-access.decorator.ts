import { SetMetadata } from '@nestjs/common';

export const FEATURE_ACCESS_KEY = 'featureAccess';

export type FeatureAccessType =
  | 'qr_menu_ordering'
  | 'digital_receipts'
  | 'basic_pos'
  | 'order_management'
  | 'real_time_analytics'
  | 'advanced_analytics'
  | 'customer_crm'
  | 'inventory_management'
  | 'multi_location_management'
  | 'priority_support'
  | 'custom_integrations'
  | 'api_access'
  | 'white_label_options';

export const RequireFeatureAccess = (feature: FeatureAccessType) =>
  SetMetadata(FEATURE_ACCESS_KEY, feature);

// Convenient decorators for common features
export const RequireAdvancedAnalytics = () => RequireFeatureAccess('advanced_analytics');
export const RequireCustomerCRM = () => RequireFeatureAccess('customer_crm');
export const RequireInventoryManagement = () => RequireFeatureAccess('inventory_management');
export const RequireMultiLocationManagement = () => RequireFeatureAccess('multi_location_management');
export const RequireAPIAccess = () => RequireFeatureAccess('api_access');
export const RequireWhiteLabelOptions = () => RequireFeatureAccess('white_label_options');