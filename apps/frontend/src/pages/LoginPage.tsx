import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
  const { signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);

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
          <p className="text-xs text-muted-foreground text-center">
            Staff-facing OTP/PIN login flows will be available via the kitchen
            app.
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
