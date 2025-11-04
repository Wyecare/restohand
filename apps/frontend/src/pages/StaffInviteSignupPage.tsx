import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, AlertCircle, Mail, Loader2 } from 'lucide-react';
import { useVerifyInviteQuery, useCompleteSignupMutation } from '@/store/api/staffApi';
import { skipToken } from '@reduxjs/toolkit/query';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupForm = z.infer<typeof signupSchema>;

type SignupStep =
  | 'verify-token'
  | 'create-account'
  | 'completing'
  | 'success'
  | 'error';

export default function StaffInviteSignupPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<SignupStep>('verify-token');
  const [error, setError] = useState('');

  const token = searchParams.get('token');

  // RTK Query for token verification
  const {
    data: verifyResult,
    error: verifyError,
    isLoading: isVerifying,
  } = useVerifyInviteQuery(token ?? skipToken);

  // RTK Query for completing signup
  const [completeSignup, { isLoading: isCompleting }] = useCompleteSignupMutation();

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (!token) {
      setError('No invitation token found. Please check your email link.');
      setStep('error');
      return;
    }

    if (verifyError) {
      setError('Invalid or expired invitation token');
      setStep('error');
      return;
    }

    if (verifyResult) {
      if (!verifyResult.valid) {
        setError(verifyResult.message || 'Invitation token validation failed');
        setStep('error');
        return;
      }

      // Pre-fill email if available
      if (verifyResult.email) {
        form.setValue('email', verifyResult.email);
      }

      setStep('create-account');
    }
  }, [token, verifyResult, verifyError, form]);

  const onSubmit = async (data: SignupForm) => {
    if (!token) {
      setError('No invitation token found');
      return;
    }

    try {
      setStep('completing');
      setError('');

      // Create Firebase user with email/password
      const auth = getFirebaseAuth();
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      // Complete signup on backend
      await completeSignup({
        token,
        firebaseUid: userCredential.user.uid,
      }).unwrap();

      // Force Firebase token refresh to get updated custom claims
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
        // Wait for claims to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setStep('success');

      toast({
        title: `Welcome to ${verifyResult?.restaurantName}!`,
        description: `You've successfully joined as ${verifyResult?.role}`,
      });

      // Redirect to appropriate dashboard after 3 seconds
      setTimeout(() => {
        const dashboardPath = verifyResult?.role === 'chef' ? '/kitchen' : '/service';
        navigate(dashboardPath);
      }, 3000);

    } catch (err: any) {
      let errorMessage = 'Failed to create account';

      if (err?.code) {
        switch (err.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'An account with this email already exists. Please sign in instead.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak. Please choose a stronger password.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
          default:
            errorMessage = err.message || 'Failed to create account';
        }
      } else if (err?.data?.message) {
        errorMessage = err.data.message;
      }

      setError(errorMessage);
      setStep('create-account');
    }
  };

  if (step === 'verify-token' && isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Mail className="h-12 w-12 text-primary animate-pulse" />
              <LoadingSpinner size="lg" />
              <p className="text-sm text-muted-foreground text-center">
                Verifying invitation...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Invalid Invitation
            </CardTitle>
            <CardDescription>
              The invitation token is invalid, expired, or has already been used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              className="w-full mt-4"
              variant="outline"
              onClick={() => navigate('/staff-login')}
            >
              Go to Staff Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Welcome to {verifyResult?.restaurantName}!
            </CardTitle>
            <CardDescription>
              Your account has been successfully created.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  You've joined as{' '}
                  <strong className="text-primary capitalize">
                    {verifyResult?.role}
                  </strong>
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Redirecting to your dashboard...
                </p>
              </div>
              <LoadingSpinner size="sm" className="mx-auto" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Join {verifyResult?.restaurantName}
          </CardTitle>
          <CardDescription>
            Create your account to join as{' '}
            <strong className="text-primary capitalize">{verifyResult?.role}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your full name"
                        {...field}
                        disabled={step === 'completing'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your.email@example.com"
                        {...field}
                        disabled={step === 'completing' || !!verifyResult?.email}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Create a password"
                        {...field}
                        disabled={step === 'completing'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm your password"
                        {...field}
                        disabled={step === 'completing'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isCompleting || step === 'completing'}
              >
                {(isCompleting || step === 'completing') && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {step === 'completing' ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Button
                variant="link"
                className="p-0 h-auto font-normal"
                onClick={() => navigate('/staff-login')}
              >
                Sign in here
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}