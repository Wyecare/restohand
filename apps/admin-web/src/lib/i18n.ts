import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from '../locales/en/common.json';
import enMenu from '../locales/en/menu.json';
import enOrders from '../locales/en/orders.json';
import enCustomer from '../locales/en/customer.json';
import enStaff from '../locales/en/staff.json';
import enAuth from '../locales/en/auth.json';
import enDashboard from '../locales/en/dashboard.json';

import mlCommon from '../locales/ml/common.json';
import mlMenu from '../locales/ml/menu.json';
import mlOrders from '../locales/ml/orders.json';
import mlCustomer from '../locales/ml/customer.json';
import mlStaff from '../locales/ml/staff.json';
import mlAuth from '../locales/ml/auth.json';
import mlDashboard from '../locales/ml/dashboard.json';

const resources = {
  en: {
    common: enCommon,
    menu: enMenu,
    orders: enOrders,
    customer: enCustomer,
    staff: enStaff,
    auth: enAuth,
    dashboard: enDashboard,
  },
  ml: {
    common: mlCommon,
    menu: mlMenu,
    orders: mlOrders,
    customer: mlCustomer,
    staff: mlStaff,
    auth: mlAuth,
    dashboard: mlDashboard,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',

    // Namespace configuration
    defaultNS: 'common',
    ns: ['common', 'menu', 'orders', 'customer', 'staff', 'auth', 'dashboard'],

    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'restohand_language',
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // Kerala-specific locale formatting
    react: {
      useSuspense: false,
    },
  });

export default i18n;

// Type-safe translation function
export type TranslationKey = string;
export type NamespaceKeys = 'common' | 'menu' | 'orders' | 'customer' | 'staff' | 'auth' | 'dashboard';