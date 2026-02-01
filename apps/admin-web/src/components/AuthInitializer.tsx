import { useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface AuthInitializerProps {
  children: React.ReactNode;
}

export const AuthInitializer = ({ children }: AuthInitializerProps) => {
  const authStatus = useAppSelector((state) => state.auth.status);

  // Show loading spinner while auth is initializing
  if (authStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
};