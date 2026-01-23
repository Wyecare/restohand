import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
import { CheckCircle, AlertCircle, Mail, User, Lock } from 'lucide-react';
import { useVerifyBranchInviteQuery, useBranchStaffSignupMutation } from '@/store/api/staffApi';

interface InvitationData {
  valid: boolean;
  email: string;
  role: string;
  restaurantName: string;
  message?: string;
}

const signupSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignupForm = z.infer<typeof signupSchema>;

type SignupStep = 'loading' | 'form' | 'processing' | 'success' | 'error';

export default function StaffSignupPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<SignupStep>('loading');
  const [error, setError] = useState('');

  const token = searchParams.get('token');

  // Use RTK Query to verify invitation
  const {
    data: invitationData,
    isLoading: isVerifying,
    isError: verifyError,
    error: verifyErrorData,
  } = useVerifyBranchInviteQuery(token || '', {
    skip: !token,
  });

  const [branchStaffSignup, { isLoading: isSigningUp }] = useBranchStaffSignupMutation();

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      password: '',
    },
  });

  // Update step based on verification result
  useEffect(() => {
    if (!token) {
      setError('No invitation token found. Please check your invitation email.');
      setStep('error');
      return;
    }

    if (isVerifying) {
      setStep('loading');
      return;
    }

    if (verifyError || !invitationData?.valid) {
      setError(invitationData?.message || 'Invalid or expired invitation token');
      setStep('error');
      return;
    }

    if (invitationData?.valid) {
      setStep('form');
    }
  }, [token, isVerifying, verifyError, invitationData]);

  const onSubmit = async (data: SignupForm) => {
    if (!token || !invitationData) return;

    try {
      setStep('processing');
      setError('');

      const result = await branchStaffSignup({
        invitationToken: token,
        name: data.name,
        password: data.password,
      }).unwrap();

      // Store the JWT tokens
      localStorage.setItem('access_token', result.access_token);
      localStorage.setItem('refresh_token', result.refresh_token);

      setStep('success');

      toast({
        title: `Welcome to ${invitationData.restaurantName}!`,
        description: `Your account has been created successfully as ${invitationData.role}`,
      });

      // Redirect to appropriate dashboard after 3 seconds
      setTimeout(() => {
        const dashboardPath =
          invitationData.role === 'chef' ? '/kitchen' : '/service';
        navigate(dashboardPath);
      }, 3000);
    } catch (err: any) {
      console.error('Signup failed:', err);
      setError(err.data?.message || err.message || 'Failed to create account. Please try again.');
      setStep('form');
    }
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Mail className="h-12 w-12 text-primary animate-pulse" />
              <LoadingSpinner size="lg" />
              <p className="text-sm text-muted-foreground text-center">
                Validating invitation...
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
              The invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              className="w-full mt-4"
              variant="outline"
              onClick={() => navigate('/auth/login')}
            >
              Go to Login
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
              Welcome to {invitationData?.restaurantName}!
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
                    {invitationData?.role}
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
            <User className="h-5 w-5" />
            Join {invitationData?.restaurantName}
          </CardTitle>
          <CardDescription>
            Complete your registration as{' '}
            <strong className="text-primary capitalize">
              {invitationData?.role}
            </strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mb-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Email:</strong> {invitationData?.email}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Role:</strong> {invitationData?.role}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your full name"
                        disabled={isSigningUp}
                        {...field}
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
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="password"
                          placeholder="Create a password"
                          className="pl-9"
                          disabled={isSigningUp}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isSigningUp}
              >
                {isSigningUp ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
