import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import App from './app';
import { Provider } from 'react-redux';
import { store } from '../store';
import { I18nextProvider } from 'react-i18next';
import i18n from '../lib/i18n';
import { ActiveThemeProvider, ThemeProvider } from '../contexts/ThemeContext';
import { AuthProvider } from '../contexts/AuthProvider';
import AppRouter from '../routes/AppRouter';
import { Toaster } from '../components/ui/toaster';

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(
      <Provider store={store}>
        <I18nextProvider i18n={i18n}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
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
    expect(baseElement).toBeTruthy();
  });

  it('should have a greeting as the title', () => {
    const { getAllByText } = render(
      <Provider store={store}>
        <I18nextProvider i18n={i18n}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
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
    expect(
      getAllByText(new RegExp('Welcome @restohand/frontend', 'gi')).length > 0
    ).toBeTruthy();
  });
});
