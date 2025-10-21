import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  sidebarOpen: boolean;
  breadcrumbs: Array<{ label: string; path: string }>;
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: string;
  }>;
  loading: {
    global: boolean;
    page: boolean;
  };
}

const initialState: UiState = {
  sidebarOpen: false,
  breadcrumbs: [],
  notifications: [],
  loading: {
    global: false,
    page: false,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setBreadcrumbs: (
      state,
      action: PayloadAction<Array<{ label: string; path: string }>>
    ) => {
      state.breadcrumbs = action.payload;
    },
    addNotification: (
      state,
      action: PayloadAction<
        Omit<UiState['notifications'][0], 'id' | 'timestamp'>
      >
    ) => {
      const notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.global = action.payload;
    },
    setPageLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.page = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setBreadcrumbs,
  addNotification,
  removeNotification,
  clearNotifications,
  setGlobalLoading,
  setPageLoading,
} = uiSlice.actions;

export default uiSlice.reducer;
