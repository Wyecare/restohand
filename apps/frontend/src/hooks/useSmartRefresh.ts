import { useLocation } from 'react-router-dom';
import { useAppDispatch } from '@/store/hooks';
import { useCallback } from 'react';
import { baseApi } from '@/store/api/baseApi';

/**
 * Smart refresh hook that invalidates relevant RTK Query tags based on current page location
 */
export const useSmartRefresh = () => {
  const location = useLocation();
  const dispatch = useAppDispatch();

  const refresh = useCallback(() => {
    const currentPath = location.pathname;

    // Define tag invalidation rules based on URL patterns
    // Using actual tag names from baseApi.ts
    const invalidationRules = [
      // Dashboard pages
      {
        pattern: /^\/(dashboard|$)/,
        tags: ['Shifts', 'Dashboard', 'Users', 'NotificationInbox'],
        description: 'Dashboard - Refresh shifts, users, and notifications'
      },

      // Shifts pages
      {
        pattern: /^\/shifts/,
        tags: ['Shifts', 'Scheduling', 'Users', 'StaffAvailability'],
        description: 'Shifts - Refresh all shift-related data'
      },

      // Time tracking pages
      {
        pattern: /^\/time-tracking/,
        tags: ['Shifts', 'Timesheets', 'Users'],
        description: 'Time Tracking - Refresh attendance and timesheet data'
      },

      // Users/Staff pages
      {
        pattern: /^\/users/,
        tags: ['Users', 'Roles', 'StaffAvailability', 'ModernAvailability'],
        description: 'Users - Refresh user and availability data'
      },

      // Residents pages
      {
        pattern: /^\/residents/,
        tags: ['Residents', 'Resident Care Plans', 'Resident Tasks', 'Task Recording Templates'],
        description: 'Residents - Refresh resident and care data'
      },

      // Time off pages
      {
        pattern: /^\/time-off/,
        tags: ['TimeOff', 'Users', 'Shifts'],
        description: 'Time Off - Refresh leave and shift data'
      },

      // Payroll pages
      {
        pattern: /^\/payroll/,
        tags: ['Payroll', 'Shifts', 'Timesheets', 'Users'],
        description: 'Payroll - Refresh financial and timesheet data'
      },

      // Platform admin pages
      {
        pattern: /^\/platform/,
        tags: ['Organizations', 'Users', 'Roles'],
        description: 'Platform - Refresh platform admin data'
      },

      // Settings pages
      {
        pattern: /^\/organization/,
        tags: ['Organizations', 'Users', 'Roles', 'NotificationDevices'],
        description: 'Settings - Refresh configuration data'
      },

      // Availability pages
      {
        pattern: /^\/availability/,
        tags: ['StaffAvailability', 'ModernAvailability', 'Users', 'Shifts'],
        description: 'Availability - Refresh availability and shift data'
      },

      // Fallback for unmatched pages - refresh core data
      {
        pattern: /.*/,
        tags: ['Dashboard', 'Users', 'NotificationInbox'],
        description: 'General - Refresh core application data'
      }
    ];

    // Find the first matching rule
    const matchingRule = invalidationRules.find(rule => rule.pattern.test(currentPath));

    if (matchingRule) {
      console.log(`🔄 Smart Refresh: ${matchingRule.description}`);

      // Invalidate the relevant tags using RTK Query util
      dispatch(baseApi.util.invalidateTags(matchingRule.tags));

      return {
        success: true,
        tags: matchingRule.tags,
        description: matchingRule.description
      };
    }

    return {
      success: false,
      tags: [],
      description: 'No matching refresh rule found'
    };
  }, [location.pathname, dispatch]);

  return { refresh, currentPath: location.pathname };
};

/**
 * Alternative: Global refresh hook for invalidating all major tags
 * Use this if you prefer the "refresh everything" approach
 */
export const useGlobalRefresh = () => {
  const dispatch = useAppDispatch();

  const refresh = useCallback(() => {
    // Using actual tag names from baseApi.ts
    const allTags = [
      'Authentication',
      'Users',
      'Organizations',
      'Roles',
      'Documents',
      'Shifts',
      'Scheduling',
      'Residents',
      'Resident Care Plans',
      'Resident Tasks',
      'Task Recording Templates',
      'TimeOff',
      'Payroll',
      'Dashboard',
      'StaffAvailability',
      'ModernAvailability',
      'Timesheets',
      'NotificationDevices',
      'NotificationInbox',
    ];

    console.log('🔄 Global Refresh: Invalidating all tags');

    // Invalidate all tags using RTK Query util
    dispatch(baseApi.util.invalidateTags(allTags));

    return {
      success: true,
      tags: allTags,
      description: 'Global refresh - all data invalidated'
    };
  }, [dispatch]);

  return { refresh };
};
