import { useFacilityTimezone } from './useFacilityTimezone';
import {
  formatDateTime as baseFormatDateTime,
  formatDate as baseFormatDate,
  formatTime as baseFormatTime,
  formatDateTimeLong as baseFormatDateTimeLong,
  toZonedDate as baseToZonedDate,
  formatDateForApi as baseFormatDateForApi,
} from '@/lib/time';

/**
 * Hook that provides timezone-aware time formatting functions
 * Automatically uses the current user's facility timezone
 */
export const useTimezone = () => {
  const facilityTimezone = useFacilityTimezone();

  return {
    facilityTimezone,
    formatDateTime: (
      input: Date | string,
      options: Intl.DateTimeFormatOptions
    ) => baseFormatDateTime(input, options, facilityTimezone),

    formatDate: (input: Date | string) =>
      baseFormatDate(input, facilityTimezone),

    formatTime: (input: Date | string) =>
      baseFormatTime(input, facilityTimezone),

    formatDateTimeLong: (input: Date | string) =>
      baseFormatDateTimeLong(input, facilityTimezone),

    toZonedDate: (input: Date | string) =>
      baseToZonedDate(input, facilityTimezone),

    formatDateForApi: (input: Date | string) =>
      baseFormatDateForApi(input, facilityTimezone),
  };
};

/**
 * Hook for timezone-aware date utilities with additional context
 */
export const useTimezoneUtils = () => {
  const facilityTimezone = useFacilityTimezone();
  const timezone = useTimezone();

  return {
    ...timezone,

    /**
     * Get the current time in facility timezone
     */
    now: () => new Date(),

    /**
     * Check if current date is within business hours (example utility)
     */
    isWithinBusinessHours: (time?: Date) => {
      const checkTime = time || new Date();
      const timeString = timezone.formatTime(checkTime);
      const hour = parseInt(timeString.split(':')[0]);
      return hour >= 8 && hour <= 18; // 8 AM to 6 PM
    },

    /**
     * Format relative time (e.g., "2 hours ago", "in 30 minutes")
     */
    formatRelativeTime: (input: Date | string) => {
      const date = typeof input === 'string' ? new Date(input) : input;
      const now = new Date();
      const diffMs = date.getTime() - now.getTime();
      const diffMinutes = Math.round(diffMs / (1000 * 60));

      if (Math.abs(diffMinutes) < 1) return 'now';
      if (diffMinutes > 0) {
        if (diffMinutes < 60) return `in ${diffMinutes} minutes`;
        const hours = Math.round(diffMinutes / 60);
        return `in ${hours} hours`;
      } else {
        const absMinutes = Math.abs(diffMinutes);
        if (absMinutes < 60) return `${absMinutes} minutes ago`;
        const hours = Math.round(absMinutes / 60);
        return `${hours} hours ago`;
      }
    },
  };
};