import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, ActiveThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthProvider';
import { store } from '@/store';
import AppRouter from '@/routes/AppRouter';
import { env } from '@/config/env';
import { Toaster } from '@/components/ui/toaster';
import { useEffect } from 'react';

export function App() {
  if (!env.apiBaseUrl || !env.firebaseConfig) {
    throw new Error('Missing required environment configuration.');
  }

  return (
    <Provider store={store}>
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
    </Provider>
  );
}

export default App;
