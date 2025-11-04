import { useAppSelector } from '@/store/hooks';
import {
  selectAuthState,
  selectIsAuthenticated,
  selectUserRoles,
  selectAuthSession,
} from '@/store/slices/authSlice';

export function AuthDebug() {
  const authState = useAppSelector(selectAuthState);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const roles = useAppSelector(selectUserRoles);
  const session = useAppSelector(selectAuthSession);

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h3 className="font-bold mb-2">Auth Debug</h3>
      <div className="space-y-1">
        <p>Status: {authState.status}</p>
        <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
        <p>Roles: {roles.length > 0 ? roles.join(', ') : 'None'}</p>
        <p>Session ID: {session?.id || 'None'}</p>
        <p>User ID: {session?.userId || 'None'}</p>
        <p>Restaurant: {session?.restaurantId || 'None'}</p>
      </div>
    </div>
  );
}