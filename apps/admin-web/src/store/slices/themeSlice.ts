import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  systemTheme: 'light' | 'dark';
  resolvedTheme: 'light' | 'dark';
}

// Get initial theme from localStorage or default to 'system'
const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'system';

  try {
    const stored = localStorage.getItem('admin-theme');
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored as Theme;
    }
  } catch (error) {
    console.warn('Failed to read theme from localStorage:', error);
  }

  return 'system';
};

// Get system theme preference
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

const initialTheme = getInitialTheme();
const systemTheme = getSystemTheme();

const initialState: ThemeState = {
  theme: initialTheme,
  systemTheme,
  resolvedTheme: initialTheme === 'system' ? systemTheme : initialTheme,
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<Theme>) {
      const newTheme = action.payload;
      state.theme = newTheme;
      state.resolvedTheme = newTheme === 'system' ? state.systemTheme : newTheme;

      // Persist to localStorage
      try {
        localStorage.setItem('admin-theme', newTheme);
      } catch (error) {
        console.warn('Failed to save theme to localStorage:', error);
      }
    },

    setSystemTheme(state, action: PayloadAction<'light' | 'dark'>) {
      state.systemTheme = action.payload;

      // If theme is set to 'system', update resolved theme
      if (state.theme === 'system') {
        state.resolvedTheme = action.payload;
      }
    },
  },
});

export const { setTheme, setSystemTheme } = themeSlice.actions;
export default themeSlice.reducer;

// Selectors
export const selectTheme = (state: { theme: ThemeState }) => state.theme.theme;
export const selectResolvedTheme = (state: { theme: ThemeState }) => state.theme.resolvedTheme;
export const selectSystemTheme = (state: { theme: ThemeState }) => state.theme.systemTheme;