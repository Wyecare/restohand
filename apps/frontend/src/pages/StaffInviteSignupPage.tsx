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
import { CheckCircle, AlertCircle, Mail, Loader2 } from 'lucide-react';
import {
  useVerifyInviteQuery,
  useCompleteSignupMutation,
} from '@/store/api/staffApi';
import { skipToken } from '@reduxjs/toolkit/query';
import { useJwtAuth } from '@/contexts/JwtAuthProvider';

const signupSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignupForm = z.infer<typeof signupSchema>;

const StaffInviteSignupPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signInWithEmail } = useJwtAuth();
  const token = searchParams.get('token');

  console.log('Invitation token from URL:', token);

  const {
    data: inviteData,
    isLoading: isVerifying,
    error: verifyError,
  } = useVerifyInviteQuery(token ? token : skipToken);

  const [completeSignup, { isLoading: isSigningUp }] =
    useCompleteSignupMutation();

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (!token) {
      toast({
        title: 'Invalid Link',
        description: 'No invitation token found in the URL.',
        variant: 'destructive',
      });
      navigate('/staff-login');
    }
  }, [token, toast, navigate]);

  const onSubmit = async (data: SignupForm) => {
    if (!token) return;

    try {
      const result = await completeSignup({
        token,
        name: data.name,
        password: data.password,
      }).unwrap();

      toast({
        title: 'Account Created!',
        description: 'Welcome to the team! You can now access your dashboard.',
      });

      // Auto-login the user with their new account
      await signInWithEmail(inviteData?.email || '', data.password);

      // Redirect based on role
      const userRole = result.user.role;
      if (userRole === 'chef') {
        navigate('/kitchen');
      } else if (userRole === 'waiter' || userRole === 'cashier') {
        navigate('/service');
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: 'Signup Failed',
        description: error?.data?.message || 'Failed to create account',
        variant: 'destructive',
      });
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying invitation...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!inviteData?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-destructive">
              Invalid Invitation
            </CardTitle>
            <CardDescription>
              {inviteData?.message ||
                'This invitation link is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/staff-login')}
              className="w-full"
              variant="outline"
            >
              Go to Staff Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className="flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600 mr-2" />
            <Mail className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">
            Join {inviteData?.restaurantName}
          </CardTitle>
          <CardDescription>
            You've been invited to join as a <strong>{inviteData?.role}</strong>
            .
            <br />
            Create your account to get started.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Email:</strong> {inviteData?.email}
            </AlertDescription>
          </Alert>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} />
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
                        placeholder="Create a password (min 6 characters)"
                        {...field}
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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSigningUp} className="w-full">
                {isSigningUp ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    Creating Account...
                  </span>
                ) : (
                  'Create Account & Join Team'
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/staff-login')}
                className="text-primary hover:underline"
              >
                Sign in here
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffInviteSignupPage;
