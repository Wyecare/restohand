// src/contexts/ThemeContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { DEFAULT_THEME, ThemeType } from '@/lib/themes';

// Light/Dark Theme Types and Context
type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  systemTheme: 'light' | 'dark';
}

const LightDarkThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);

export const useTheme = () => {
  const context = useContext(LightDarkThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Active Theme (Preset, Scale, Radius, etc.) Types and Context
function setThemeStorage(key: string, value: string | null) {
  if (typeof window === 'undefined') return;

  if (!value) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, value);
  }
}

function getThemeStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

type ActiveThemeContextType = {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
};

const ActiveThemeContext = createContext<ActiveThemeContextType | undefined>(
  undefined
);

export function useThemeConfig() {
  const context = useContext(ActiveThemeContext);
  if (context === undefined) {
    throw new Error(
      'useThemeConfig must be used within an ActiveThemeProvider'
    );
  }
  return context;
}

// Light/Dark Theme Provider
interface ThemeProviderProps {
  children: ReactNode;
  attribute?: string;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  attribute = 'class',
  defaultTheme = 'light',
  enableSystem = true,
  disableTransitionOnChange = false,
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as Theme;
      if (
        stored &&
        (stored === 'light' ||
          stored === 'dark' ||
          (stored === 'system' && enableSystem))
      ) {
        return stored;
      }
    }
    return defaultTheme;
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return 'light';
  });

  const resolvedTheme =
    theme === 'system' ? systemTheme : (theme as 'light' | 'dark');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;

    if (disableTransitionOnChange) {
      const css = document.createElement('style');
      css.appendChild(
        document.createTextNode(
          `*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}`
        )
      );
      document.head.appendChild(css);

      requestAnimationFrame(() => {
        document.head.removeChild(css);
      });
    }

    if (attribute === 'class') {
      root.classList.remove('light', 'dark');
      root.classList.add(resolvedTheme);
    } else {
      root.setAttribute(attribute, resolvedTheme);
    }

    localStorage.setItem('theme', theme);
  }, [theme, resolvedTheme, attribute, disableTransitionOnChange]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const value = {
    theme,
    resolvedTheme,
    setTheme,
    systemTheme,
  };

  return (
    <LightDarkThemeContext.Provider value={value}>
      {children}
    </LightDarkThemeContext.Provider>
  );
};

// Active Theme Provider (Preset, Scale, Radius, etc.)
export function ActiveThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme?: Partial<ThemeType>;
}) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<ThemeType>(() => {
    // Always start with defaults to avoid hydration issues
    return DEFAULT_THEME;
  });

  useEffect(() => {
    setMounted(true);

    // Load theme from storage after component mounts
    if (typeof window !== 'undefined') {
      const storedTheme = {
        preset:
          (getThemeStorage('theme_preset') as any) || DEFAULT_THEME.preset,
        scale: (getThemeStorage('theme_scale') as any) || DEFAULT_THEME.scale,
        radius:
          (getThemeStorage('theme_radius') as any) || DEFAULT_THEME.radius,
        contentLayout:
          (getThemeStorage('theme_content_layout') as any) ||
          DEFAULT_THEME.contentLayout,
      };

      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    const body = document.body;

    setThemeStorage('theme_radius', theme.radius);
    body.setAttribute('data-theme-radius', theme.radius);

    if (theme.radius !== 'default') {
      setThemeStorage('theme_radius', theme.radius);
      body.setAttribute('data-theme-radius', theme.radius);
    } else {
      setThemeStorage('theme_radius', null);
      body.removeAttribute('data-theme-radius');
    }

    if (theme.preset !== 'default') {
      setThemeStorage('theme_preset', theme.preset);
      body.setAttribute('data-theme-preset', theme.preset);
    } else {
      setThemeStorage('theme_preset', null);
      body.removeAttribute('data-theme-preset');
    }

    setThemeStorage('theme_content_layout', theme.contentLayout);
    body.setAttribute('data-theme-content-layout', theme.contentLayout);

    if (theme.scale !== 'none') {
      setThemeStorage('theme_scale', theme.scale);
      body.setAttribute('data-theme-scale', theme.scale);
    } else {
      setThemeStorage('theme_scale', null);
      body.removeAttribute('data-theme-scale');
    }
  }, [theme.preset, theme.radius, theme.scale, theme.contentLayout]);

  return (
    <ActiveThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ActiveThemeContext.Provider>
  );
}
