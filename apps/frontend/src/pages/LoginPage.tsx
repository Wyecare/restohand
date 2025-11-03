import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthProvider';
import { env } from '@/config/env';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';

const LoginPage = () => {
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authMode, setAuthMode] = useState<'google' | 'email'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      if (!env.googleClientId) {
        console.warn('Google client ID not configured');
      }
      await signInWithGoogle();
    } catch (error) {
      toast({
        title: 'Sign-in failed',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: 'Missing credentials',
        description: 'Please enter both email and password.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSigningIn(true);
      await signInWithEmail(email, password);
    } catch (error) {
      toast({
        title: 'Sign-in failed',
        description:
          error instanceof Error ? error.message : 'Invalid email or password',
        variant: 'destructive',
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold">
            Sign in to {env.appName}
          </CardTitle>
          <CardDescription>
            Manage menu, orders, and staff from any device with your Google
            account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2 mb-4">
            <Button
              type="button"
              variant={authMode === 'google' ? 'default' : 'outline'}
              onClick={() => setAuthMode('google')}
              className="flex-1"
            >
              Google
            </Button>
            <Button
              type="button"
              variant={authMode === 'email' ? 'default' : 'outline'}
              onClick={() => setAuthMode('email')}
              className="flex-1"
            >
              Email
            </Button>
          </div>

          {authMode === 'google' ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
            >
              {isSigningIn ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" /> Signing in...
                </span>
              ) : (
                'Continue with Google'
              )}
            </Button>
          ) : (
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email (for testing only)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="test@restohand.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={isSigningIn} className="w-full">
                {isSigningIn ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner size="sm" /> Signing in...
                  </span>
                ) : (
                  'Sign in with Email'
                )}
              </Button>
            </form>
          )}

          <p className="text-xs text-muted-foreground text-center">
            {authMode === 'email'
              ? 'Email login is for testing purposes only.'
              : 'Staff-facing OTP/PIN login flows will be available via the kitchen app.'
            }
          </p>
        </CardContent>
        <CardFooter>
          <div className="flex w-full flex-col gap-2 text-center text-xs text-muted-foreground">
            <p>By continuing, you agree to the Restohand Terms and Privacy Policy.</p>
            <Link to="/staff-login" className="text-primary hover:underline">
              Staff member? Use the PIN login here.
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
