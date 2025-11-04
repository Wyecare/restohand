import { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import {
  selectAuthState,
  selectIsAuthenticated,
  selectUserRoles,
} from '@/store/slices/authSlice';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface AuthGuardProps {
  requireAuth?: boolean;
  redirectTo?: string;
  allowedRoles?: string[];
  redirectAuthenticatedTo?: string;
}

export function AuthGuard({
  children,
  requireAuth = true,
  redirectTo = '/login',
  allowedRoles,
  redirectAuthenticatedTo,
}: PropsWithChildren<AuthGuardProps>) {
  const location = useLocation();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const { status } = useAppSelector(selectAuthState);
  const roles = useAppSelector(selectUserRoles);
  const hasRoles = roles.length > 0;
  const needsOnboarding = isAuthenticated && !hasRoles;

  // const { logout } = useAuth();

  // useEffect(() => {
  //   logout();
  //   console.log('User logged out due to forbidden access.');
  // }, [logout]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }

  if (!requireAuth && redirectAuthenticatedTo && isAuthenticated) {
    const target = needsOnboarding ? '/onboarding' : redirectAuthenticatedTo;
    return <Navigate to={target} replace />;
  }

  // Check if user has the required roles
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRequiredRole = roles.some((role) => allowedRoles.includes(role));

    if (!hasRequiredRole) {
      // Special case: if user just authenticated but has no roles yet,
      // it might be a timing issue with Firebase custom claims propagation
      if (needsOnboarding) {
        // Only redirect to onboarding if this route allows manager role
        if (allowedRoles.includes('manager')) {
          return <Navigate to="/onboarding" replace />;
        } else {
          // For staff routes (chef, waiter, cashier), show loading instead of forbidden
          // This gives time for claims to propagate
          return (
            <div className="flex min-h-screen items-center justify-center bg-background">
              <div className="text-center space-y-4">
                <LoadingSpinner size="lg" />
                <p className="text-sm text-muted-foreground">Setting up your account...</p>
              </div>
            </div>
          );
        }
      }

      // User has roles but not the required ones - redirect to forbidden
      return <Navigate to="/forbidden" replace />;
    }
    // User has the required role - allow access
  }

  return <>{children}</>;
}
