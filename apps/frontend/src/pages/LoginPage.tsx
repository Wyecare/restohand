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
import { useJwtAuth } from '@/contexts/JwtAuthProvider';
import { env } from '@/config/env';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';

const LoginPage = () => {
  // Use JWT auth instead of Firebase
  const { signInWithEmail: jwtSignInWithEmail } = useJwtAuth();
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authMode, setAuthMode] = useState<'email'>('email'); // Remove Google for now
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      if (!env.googleClientId) {
        console.warn('Google client ID not configured');
      }
      await signInWithGoogle();

      // Note: For redirect flow, the page will reload and user won't see this message
      console.log('✅ Google sign-in completed successfully');
    } catch (error: any) {
      console.error('❌ Google sign-in error:', error);

      let title = 'Sign-in failed';
      let description = 'Unexpected error occurred';

      // Provide user-friendly error messages
      if (error.code === 'auth/popup-closed-by-user') {
        title = 'Sign-in cancelled';
        description = 'The sign-in window was closed. Please try again.';
      } else if (error.code === 'auth/popup-blocked') {
        title = 'Popup blocked';
        description = 'Please allow popups for this site and try again.';
      } else if (error.code === 'auth/unauthorized-domain') {
        title = 'Domain not authorized';
        description = 'This domain is not authorized for Google sign-in.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        title = 'Sign-in cancelled';
        description = 'Sign-in was cancelled. Please try again.';
      } else if (error.code === 'auth/network-request-failed') {
        title = 'Network error';
        description = 'Please check your internet connection and try again.';
      } else if (error.message) {
        description = error.message;
      }

      toast({
        title,
        description,
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
      await jwtSignInWithEmail(email, password);
      toast({
        title: 'Sign-in successful',
        description: 'Welcome back!',
      });
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
            Manage menu, orders, and staff from any device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
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
                'Sign in'
              )}
            </Button>
          </form>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>Use your email and password to access your account.</p>
            <p className="text-[10px]">
              Staff-facing OTP/PIN login flows are available via the kitchen app.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex w-full flex-col gap-2 text-center text-xs text-muted-foreground">
            <p>By continuing, you agree to the Restohand Terms and Privacy Policy.</p>
            <div className="flex justify-center gap-4">
              <Link to="/register" className="text-primary hover:underline">
                Create account
              </Link>
              <Link to="/staff-login" className="text-primary hover:underline">
                Staff login
              </Link>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
