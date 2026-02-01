import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { baseApi } from './api/baseApi';
import authReducer from './slices/authSlice';
import themeReducer from './slices/themeSlice';

export const store = configureStore({
  reducer: {
    // RTK Query API slice
    [baseApi.reducerPath]: baseApi.reducer,

    // Regular slices
    auth: authReducer,
    theme: themeReducer,
  },

  // Adding the api middleware enables caching, invalidation, polling,
  // and other useful features of RTK Query
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [baseApi.util.prefetch.type],
      },
    }).concat(baseApi.middleware),
});

// Optional, but required for refetchOnFocus/refetchOnReconnect behaviors
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;