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
  console.log('[AuthGuard] state snapshot', {
    requireAuth,
    redirectAuthenticatedTo,
    isAuthenticated,
    status,
    roles,
    needsOnboarding,
  });
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
    console.log('[AuthGuard] redirecting unauthenticated user');
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
    console.log('[AuthGuard] redirecting authenticated public route', target);
    return <Navigate to={target} replace />;
  }

  if (
    allowedRoles &&
    allowedRoles.length > 0 &&
    !roles.some((role) => allowedRoles.includes(role))
  ) {
    if (needsOnboarding && allowedRoles.includes('manager')) {
      console.log('[AuthGuard] redirecting to onboarding due to missing roles');
      return <Navigate to="/onboarding" replace />;
    }
    console.log('[AuthGuard] access forbidden for roles', roles);
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}
