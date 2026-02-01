import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { selectIsAuthenticated, selectAuthUser, selectIsSuperAdmin } from '@/store/slices/authSlice';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  allowedRoles?: string[];
  redirectAuthenticatedTo?: string;
  redirectUnauthenticatedTo?: string;
}

export const AuthGuard = ({
  children,
  requireAuth = true,
  allowedRoles = [],
  redirectAuthenticatedTo,
  redirectUnauthenticatedTo = '/login',
}: AuthGuardProps) => {
  const location = useLocation();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectAuthUser);
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);

  // If we don't require auth and user is authenticated, redirect
  if (!requireAuth && isAuthenticated && redirectAuthenticatedTo) {
    return <Navigate to={redirectAuthenticatedTo} replace />;
  }

  // If we require auth but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return (
      <Navigate
        to={redirectUnauthenticatedTo}
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  // If we require auth and user is authenticated, check roles
  if (requireAuth && isAuthenticated) {
    if (allowedRoles.length > 0) {
      // For admin app, we specifically check for super_admin role
      if (!isSuperAdmin && allowedRoles.includes('super_admin')) {
        return (
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
              <p className="text-muted-foreground mt-2">
                You don't have permission to access this admin portal.
              </p>
            </div>
          </div>
        );
      }
    }
  }

  return <>{children}</>;
};