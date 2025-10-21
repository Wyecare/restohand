import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { AuthUser } from '@/store/slices/authSlice';

/**
 * Hook to get the current user's facility timezone
 * Priority: Region timezone > Organization timezone > App default timezone
 */
export const useFacilityTimezone = (): string => {
  const { user, organization } = useSelector((state: RootState) => state.auth);
  const defaultTimezone = import.meta.env.VITE_APP_TIMEZONE || 'UTC';

  if (!user) {
    return defaultTimezone;
  }

  // For tenant users, get timezone from region or organization
  if ('organizationId' in user) {
    const tenantUser = user as AuthUser;

    // Check if region has timezone override
    if (tenantUser.region && (tenantUser.region as any).timezone) {
      return (tenantUser.region as any).timezone;
    }

    // Check organization timezone
    if (organization?.timezone) {
      return organization.timezone;
    }
  }

  // Fallback to default timezone
  return defaultTimezone;
};

/**
 * Hook to get user context with timezone information
 */
export const useUserContext = () => {
  const { user, organization } = useSelector((state: RootState) => state.auth);
  const facilityTimezone = useFacilityTimezone();

  return {
    user,
    organization,
    facilityTimezone,
    hasTimezoneOverride: facilityTimezone !== (import.meta.env.VITE_APP_TIMEZONE || 'UTC')
  };
};