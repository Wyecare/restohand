import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { signInWithCustomToken, signInWithEmailAndPassword } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useStaffLoginMutation } from '@/store/api/authApi';
import { getFirebaseAuth } from '@/lib/firebase';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAppSelector } from '@/store/hooks';
import { selectUserRoles } from '@/store/slices/authSlice';
import { useStaffTranslation, useCommonTranslation } from '@/hooks/use-translation';

const StaffLoginPage = () => {
  // PIN-based login state
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');

  // Email/password login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

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

  const handlePinSubmit = async (event: React.FormEvent) => {
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

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      toast({
        title: 'Missing details',
        description: 'Please enter both email and password',
        variant: 'destructive',
      });
      return;
    }

    try {
      setEmailLoading(true);
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email, password);

      // Force Firebase token refresh to get updated custom claims
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
        // Wait for claims to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      toast({ title: 'Welcome back!' });

      // Navigation will be handled by the Navigate components at the top
      // based on the updated role state, so no need to explicitly navigate
    } catch (error: any) {
      let errorMessage = 'Failed to sign in';

      if (error?.code) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = 'Invalid email or password';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed attempts. Please try again later';
            break;
          default:
            errorMessage = error.message || 'Failed to sign in';
        }
      }

      toast({
        title: 'Sign in failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setEmailLoading(false);
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
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email & Password</TabsTrigger>
              <TabsTrigger value="pin">Phone & PIN</TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4 mt-4">
              <form className="grid gap-4" onSubmit={handleEmailSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="email">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="password">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <Button type="submit" disabled={emailLoading}>
                  {emailLoading ? (
                    <span className="flex items-center gap-2">
                      <LoadingSpinner size="sm" /> Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="pin" className="space-y-4 mt-4">
              <form className="grid gap-4" onSubmit={handlePinSubmit}>
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffLoginPage;
