import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { signInWithCustomToken } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useStaffLoginMutation } from '@/store/api/authApi';
import { getFirebaseAuth } from '@/lib/firebase';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAppSelector } from '@/store/hooks';
import { selectUserRoles } from '@/store/slices/authSlice';
import { useStaffTranslation, useCommonTranslation } from '@/hooks/use-translation';

const StaffLoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();
  const [staffLogin, { isLoading }] = useStaffLoginMutation();
  const roles = useAppSelector(selectUserRoles);
  const { t: tStaff } = useStaffTranslation();
  const { t: tCommon } = useCommonTranslation();

  if (roles.includes('chef')) {
    return <Navigate to="/kitchen" replace />;
  }

  if (roles.some((role) => role === 'waiter' || role === 'cashier')) {
    return <Navigate to="/service" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!identifier || !pin) {
      toast({
        title: tStaff('login.missingDetails'),
        description: tStaff('login.enterCredentials'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const { token, staff } = await staffLogin({ identifier, pin }).unwrap();
      await signInWithCustomToken(getFirebaseAuth(), token);
      toast({ title: tStaff('login.welcomeBack') });
      const destination = staff.roles.includes('chef')
        ? '/kitchen'
        : staff.roles.some((role) => role === 'waiter' || role === 'cashier')
          ? '/service'
          : '/dashboard';
      navigate(destination, { replace: true });
    } catch (error) {
      toast({
        title: tCommon('messages.error'),
        description:
          error instanceof Error ? error.message : tCommon('messages.networkError'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/15 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>{tStaff('login.title')}</CardTitle>
          <CardDescription>
            {tStaff('login.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="staff-identifier">
                {tStaff('login.phoneOrEmail')}
              </label>
              <Input
                id="staff-identifier"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="+91... or chef@cafe.in"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="staff-pin">
                {tStaff('login.pin')}
              </label>
              <Input
                id="staff-pin"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                placeholder="4-digit PIN"
                required
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" /> {tStaff('login.loggingIn')}
                </span>
              ) : (
                tStaff('login.login')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffLoginPage;
