import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider, ActiveThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthProvider';
import { store } from '@/store';
import AppRouter from '@/routes/AppRouter';
import { env } from '@/config/env';
import { Toaster } from '@/components/ui/toaster';
import { useEffect } from 'react';
import i18n from '@/lib/i18n';
import { AuthDebug } from '@/components/debug/AuthDebug';

export function App() {
  if (!env.apiBaseUrl || !env.firebaseConfig) {
    throw new Error('Missing required environment configuration.');
  }

  return (
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <ActiveThemeProvider>
            <AuthProvider>
              <BrowserRouter>
                <AppRouter />
              </BrowserRouter>
              <Toaster />
            </AuthProvider>
          </ActiveThemeProvider>
        </ThemeProvider>
      </I18nextProvider>
    </Provider>
  );
}

export default App;
