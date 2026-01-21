import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider, ActiveThemeProvider } from '@/contexts/ThemeContext';
import { JwtAuthProvider } from '@/contexts/JwtAuthProvider';
import { BranchProvider } from '@/contexts/BranchContext';
import { store } from '@/store';
import AppRouter from '@/routes/AppRouter';
import StaffRouter from '@/routes/StaffRouter';
import CustomerRouter from '@/routes/CustomerRouter';
import { env } from '@/config/env';
import { Toaster } from '@/components/ui/toaster';
import { useEffect } from 'react';
import i18n from '@/lib/i18n';
import { AuthDebug } from '@/components/debug/AuthDebug';
import { getDomainType } from '@/utils/domain';

export function App() {
  if (!env.apiBaseUrl) {
    throw new Error('Missing required environment configuration.');
  }

  const domainType = getDomainType();
  // const RouterComponent =
  //   domainType === 'staff'
  //     ? StaffRouter
  //     : domainType === 'customer'
  //     ? CustomerRouter
  //     : AppRouter;

  let RouterComponent;
  if (domainType === 'staff') {
    RouterComponent = StaffRouter;
  } else if (domainType === 'customer') {
    RouterComponent = CustomerRouter;
  } else {
    RouterComponent = AppRouter;
  }

  console.log('🌐 Domain Detection [FIXED]:', {
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    domainType,
    router:
      domainType === 'staff'
        ? 'StaffRouter'
        : domainType === 'customer'
        ? 'CustomerRouter'
        : 'AppRouter',
    timestamp: new Date().toISOString(),
  });

  return (
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ActiveThemeProvider>
            <JwtAuthProvider>
              <BranchProvider>
                <BrowserRouter>
                  <RouterComponent />
                </BrowserRouter>
                <Toaster />
              </BranchProvider>
            </JwtAuthProvider>
          </ActiveThemeProvider>
        </ThemeProvider>
      </I18nextProvider>
    </Provider>
  );
}

export default App;
