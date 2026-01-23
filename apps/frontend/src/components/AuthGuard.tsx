import { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import {
  selectAuthState,
  selectIsAuthenticated,
  selectUserRoles,
  selectActiveRestaurantId,
} from '@/store/slices/authSlice';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { isCustomerInterface } from '@/utils/domain';

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
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const hasRoles = roles.length > 0;
  const needsOnboarding = isAuthenticated && hasRoles && !restaurantId;

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

  // Skip auth requirement for customer interface - customers don't need to login to view menus
  if (requireAuth && !isAuthenticated && !isCustomerInterface()) {
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
        console.log('⏳ No roles yet, checking if onboarding or loading...');
        // Only redirect to onboarding if this route allows manager role
        if (allowedRoles.includes('manager')) {
          console.log('➡️ Redirecting to onboarding (manager route)');
          return <Navigate to="/onboarding" replace />;
        } else {
          return (
            <div className="flex min-h-screen items-center justify-center bg-background">
              <div className="text-center space-y-4">
                <LoadingSpinner size="lg" />
                <p className="text-sm text-muted-foreground">
                  Setting up your account...
                </p>
              </div>
            </div>
          );
        }
      }
      return <Navigate to="/forbidden" replace />;
    }
  }

  return <>{children}</>;
}
