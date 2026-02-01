import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from '@/store';
import AdminRouter from '@/routes/AdminRouter';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthInitializer } from '@/components/AuthInitializer';

export function App() {
  return (
    <Provider store={store}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthInitializer>
          <BrowserRouter>
            <AdminRouter />
            <Toaster />
          </BrowserRouter>
        </AuthInitializer>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
