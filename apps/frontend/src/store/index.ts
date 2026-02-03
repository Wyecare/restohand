// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { baseApi } from './api/baseApi';
import authReducer from './slices/authSlice';
import themeReducer from './slices/themeSlice';
import uiReducer from './slices/uiSlice';
import cartReducer from './slices/cartSlice';
import { cartPersistenceMiddleware } from './middleware/cartPersistence';

// Import API endpoints to ensure they're loaded
import './api/fcmApi';
import './api/cashfreeApi';

export const store = configureStore({
  reducer: {
    // RTK Query API slice
    [baseApi.reducerPath]: baseApi.reducer,

    // Regular slices
    auth: authReducer,
    theme: themeReducer,
    ui: uiReducer,
    cart: cartReducer,
  },

  // Adding the api middleware enables caching, invalidation, polling,
  // and other useful features of RTK Query
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [baseApi.util.prefetch.type],
      },
    }).concat(baseApi.middleware, cartPersistenceMiddleware),
});

// Optional, but required for refetchOnFocus/refetchOnReconnect behaviors
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
