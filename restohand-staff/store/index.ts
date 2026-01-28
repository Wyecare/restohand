import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { baseApi } from './api/baseApi';
import authReducer from './slices/authSlice';

// Create web storage adapter using localStorage
const createWebStorage = () => {
  return {
    getItem(key: string) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return Promise.resolve(window.localStorage.getItem(key));
        }
      } catch (e) {
        console.warn('localStorage not available:', e);
      }
      return Promise.resolve(null);
    },
    setItem(key: string, value: string) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
          return Promise.resolve(value);
        }
      } catch (e) {
        console.warn('localStorage setItem failed:', e);
      }
      return Promise.resolve(value);
    },
    removeItem(key: string) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch (e) {
        console.warn('localStorage removeItem failed:', e);
      }
      return Promise.resolve();
    },
  };
};

// Use AsyncStorage on native, localStorage on web
const storage = Platform.OS === 'web' ? createWebStorage() : AsyncStorage;

// Persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth'], // Only persist auth slice
};

// Combine reducers
const rootReducer = combineReducers({
  [baseApi.reducerPath]: baseApi.reducer,
  auth: authReducer,
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER, baseApi.util.prefetch.type],
      },
    }).concat(baseApi.middleware),
});

// Create persistor
export const persistor = persistStore(store);

// Optional, but required for refetchOnFocus/refetchOnReconnect behaviors
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;