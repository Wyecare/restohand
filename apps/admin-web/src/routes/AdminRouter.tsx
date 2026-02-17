import { Suspense } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { AuthGuard } from '@/components/AuthGuard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Auth pages
import LoginPage from '@/pages/auth/LoginPage';

// Protected pages
import DashboardPage from '@/pages/DashboardPage';
import RestaurantsPage from '@/pages/RestaurantsPage';
import RestaurantDetailsPage from '@/pages/RestaurantDetailsPage';
import SettlementsPage from '@/pages/SettlementsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import SuperAdminsPage from '@/pages/SuperAdminsPage';
import SubscriptionPlansPage from '@/pages/SubscriptionPlansPage';
import VatConfigurationPage from '@/pages/VatConfigurationPage';
import SettingsPage from '@/pages/SettingsPage';
import ProfilePage from '@/pages/ProfilePage';

const AdminRouter = () => {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <AuthGuard requireAuth={false} redirectAuthenticatedTo="/dashboard">
              <LoginPage />
            </AuthGuard>
          }
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <AuthGuard allowedRoles={['super_admin']}>
              <Layout />
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="restaurants" element={<RestaurantsPage />} />
          <Route path="restaurants/:id" element={<RestaurantDetailsPage />} />
          <Route path="settlements" element={<SettlementsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="super-admins" element={<SuperAdminsPage />} />
          <Route path="subscription-plans" element={<SubscriptionPlansPage />} />
          <Route path="vat-configuration" element={<VatConfigurationPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AdminRouter;