import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from '@/config/env';

export const API_BASE_URL = env.apiBaseUrl.replace(/\/$/, '');

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: async (headers, { getState }) => {
      const state = getState() as RootState;
      const token = state.auth.idToken;

      // Add common headers for mobile
      headers.set('ngrok-skip-browser-warning', 'true');
      headers.set('content-type', 'application/json');

      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }

      return headers;
    },
  }),
  tagTypes: [
    'Restaurant',
    'MenuCategory',
    'MenuItem',
    'Order',
    'OrderModification',
    'KitchenStation',
    'StationAssignment',
    'Profile',
    'Session',
    'CustomerSession',
    'Bill',
    'Staff',
    'StaffInvitation',
    'RestaurantTable',
    'Zone',
    'GstRate',
    'HsnCode',
    'TaxInvoice',
    'FloorPlan',
    'TableStatus',
    'FloorPlanOverview',
    'InventoryItem',
    'StockAlert',
    'InventoryAnalytics',
    'Recipe',
    'RecipeCostSummary',
    'Subscription',
    'SubscriptionPlans',
    'PaymentHistory',
    'SubscriptionAnalytics',
    'Reports',
    'CallWaiter',
    'Branches',
  ],
  endpoints: () => ({}),
});

export const {
  middleware: apiMiddleware,
  reducerPath: apiReducerPath,
  reducer: apiReducer,
} = baseApi;