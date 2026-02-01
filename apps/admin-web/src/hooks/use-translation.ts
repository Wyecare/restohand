import { useTranslation as useI18nextTranslation } from 'react-i18next';
import type { NamespaceKeys } from '@/lib/i18n';

// Type-safe translation hook for specific namespaces
export function useTranslation(namespace?: NamespaceKeys) {
  const { t, i18n } = useI18nextTranslation(namespace);

  // Helper function for currency formatting
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(i18n.language === 'ml' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Helper function for number formatting
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat(i18n.language === 'ml' ? 'en-IN' : 'en-US').format(num);
  };

  // Helper function for date formatting
  const formatDate = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(i18n.language === 'ml' ? 'en-IN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(dateObj);
  };

  // Helper function for time formatting
  const formatTime = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(i18n.language === 'ml' ? 'en-IN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(dateObj);
  };

  // Check if current language is Malayalam
  const isMalayalam = i18n.language === 'ml';

  // Change language function
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return {
    t,
    i18n,
    formatCurrency,
    formatNumber,
    formatDate,
    formatTime,
    isMalayalam,
    changeLanguage,
    currentLanguage: i18n.language,
  };
}

// Specific hooks for each namespace for better type inference
export const useCommonTranslation = () => useTranslation('common');
export const useMenuTranslation = () => useTranslation('menu');
export const useOrdersTranslation = () => useTranslation('orders');
export const useCustomerTranslation = () => useTranslation('customer');
export const useStaffTranslation = () => useTranslation('staff');
export const useAuthTranslation = () => useTranslation('auth');
export const useDashboardTranslation = () => useTranslation('dashboard');