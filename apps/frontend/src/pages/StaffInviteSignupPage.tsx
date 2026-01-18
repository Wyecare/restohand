import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useVerifyInviteQuery, useJwtStaffSignupMutation } from '@/store/api/staffApi';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';
import { authService } from '@/services/auth.service';

const StaffInviteSignupPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token] = useState(searchParams.get('token') || '');
  const dispatch = useAppDispatch();

  // RTK Query hooks
  const {
    data: invitation,
    error: verificationError,
    isLoading: verifyingInvitation
  } = useVerifyInviteQuery(token, {
    skip: !token
  });

  const [jwtStaffSignup, { isLoading: isCompletingSignup }] = useJwtStaffSignupMutation();

  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Handle verification error
  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      return;
    }

    if (verificationError) {
      setError('Failed to verify invitation');
    }
  }, [token, verificationError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');

    try {
      // Complete staff signup with JWT
      const authResponse = await jwtStaffSignup({
        token,
        name: formData.name,
        password: formData.password,
      }).unwrap();

      console.log('🔄 Staff Signup Response:', authResponse);

      // Store tokens
      authService.setTokens(authResponse.access_token, authResponse.refresh_token);

      // Update Redux state
      dispatch(setCredentials({
        idToken: authResponse.access_token,
        refreshToken: authResponse.refresh_token,
        expiresIn: authResponse.expires_in,
        session: {
          userId: authResponse.user.uid,
          displayName: authResponse.user.displayName,
          email: authResponse.user.email,
          restaurantId: authResponse.user.restaurantId,
          roles: authResponse.user.roles,
        },
      }));

      console.log('✅ Staff signup completed successfully');

      // Redirect to appropriate interface based on role
      if (authResponse.user.roles.includes('chef')) {
        navigate('/kitchen');
      } else if (authResponse.user.roles.includes('waiter') || authResponse.user.roles.includes('cashier')) {
        navigate('/service');
      } else {
        navigate('/forbidden');
      }
    } catch (err: any) {
      console.error('❌ Staff signup error:', err);
      setError(err.data?.message || err.message || 'Failed to complete signup');
    }
  };

  if (verifyingInvitation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!invitation?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
            <CardDescription>
              {invitation?.message || 'This invitation link is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/login')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <CardTitle>Complete Your Staff Account</CardTitle>
          <CardDescription>
            You've been invited to join <strong>{invitation.restaurantName}</strong> as a <strong>{invitation.role}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={invitation.email}
                disabled
                className="bg-gray-100"
              />
            </div>

            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  placeholder="Choose a secure password"
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                placeholder="Confirm your password"
                minLength={6}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isCompletingSignup}>
              {isCompletingSignup ? <LoadingSpinner size="sm" /> : 'Complete Account Setup'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffInviteSignupPage;