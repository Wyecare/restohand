import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useOnboardRestaurantMutation } from '@/store/api/subscriptionsApi';
import { IndianState, INDIAN_STATES } from '@/types/indian-states';
import { useAppSelector } from '@/store/hooks';
import {
  selectActiveRestaurantId,
  selectAuthSession,
  selectAuthState,
} from '@/store/slices/authSlice';
import { getFirebaseAuth } from '@/lib/firebase';
import { Navigate } from 'react-router-dom';
import { env } from '@/config/env';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const session = useAppSelector(selectAuthSession);
  const existingRestaurantId = useAppSelector(selectActiveRestaurantId);
  const { toast } = useToast();
  const [onboardRestaurant, { isLoading }] = useOnboardRestaurantMutation();
  const { status } = useAppSelector(selectAuthState);
  const isAuthenticated = status === 'authenticated';

  const [name, setName] = useState('');
  const [email, setEmail] = useState(session?.email ?? '');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState<IndianState | ''>('');
  const [postalCode, setPostalCode] = useState('');
  const [businessType, setBusinessType] = useState<'sole_proprietorship' | 'partnership' | 'private_limited' | 'public_limited'>('sole_proprietorship');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');

  // Optional KYC fields for instant settlements
  const [showKycFields, setShowKycFields] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [cinNumber, setCinNumber] = useState('');

  if (existingRestaurantId) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-muted/10">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isAuthenticated) {
      toast({
        title: 'Please wait',
        description: 'Finishing sign-in. Try again in a moment.',
      });
      return;
    }

    if (!name || !email || !phone || !street || !city || !state || !postalCode) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields to continue.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const onboardingData = {
        name,
        email,
        phone,
        address: {
          street,
          city,
          state,
          postalCode,
          country: 'IN',
        },
        businessType,
        gstNumber: gstNumber || undefined,
        panNumber: panNumber || undefined,
        // Include KYC fields if provided
        ...(accountNumber && ifscCode && accountHolderName && {
          bankAccount: {
            accountNumber,
            ifscCode,
            accountHolderName,
          },
        }),
        ...(cinNumber && businessType !== 'sole_proprietorship' && {
          documents: {
            cin: cinNumber,
          },
        }),
      };

      const onboardingResponse = await onboardRestaurant(onboardingData).unwrap();

      toast({
        title: 'Restaurant onboarded successfully!',
        description: 'Your SaaS subscription is now active with a 30-day free trial.'
      });

      // Force token refresh to get updated restaurant info in JWT
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const refreshResponse = await fetch(`${env.apiBaseUrl}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              refresh_token: refreshToken,
            }),
          });

          if (refreshResponse.ok) {
            const authData = await refreshResponse.json();

            // Update stored tokens
            localStorage.setItem('access_token', authData.access_token);
            localStorage.setItem('refresh_token', authData.refresh_token);

            // Update Redux auth state with new restaurant info
            const updatedSession = {
              ...session,
              restaurantId: authData.user.restaurantId || onboardingResponse.restaurant.id,
            };

            // Update the session in Redux
            // Note: This will trigger AuthGuard to allow access to protected routes
            window.location.href = '/settings/gst/setup'; // Force reload and go to GST setup
            return;
          }
        } catch (refreshError) {
          console.warn('Token refresh failed, continuing with direct navigation:', refreshError);
        }
      }

      // Fallback: Navigate to GST setup
      navigate('/settings/gst/setup', { replace: true });
    } catch (error) {
      console.error('[OnboardingPage] SaaS onboarding failed', error);

      // Extract error message from RTK Query error response
      let errorMessage = 'Unexpected error occurred';

      if (error && typeof error === 'object') {
        // RTK Query error structure
        if ('data' in error && error.data && typeof error.data === 'object') {
          errorMessage = (error.data as any)?.message || errorMessage;
        }
        // Standard Error object
        else if ('message' in error && typeof error.message === 'string') {
          errorMessage = error.message;
        }
      }

      toast({
        title: 'Unable to onboard restaurant',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-muted/10 py-10">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">
            Start Your SaaS Restaurant Journey
          </CardTitle>
          <CardDescription>
            Complete your restaurant onboarding to activate your 30-day free trial and begin accepting orders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6" onSubmit={handleSubmit}>
            {/* Restaurant Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Restaurant Information</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Restaurant Name *</Label>
                  <Input
                    id="name"
                    placeholder="Restohand Café"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Address</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="street">Street Address *</Label>
                  <Input
                    id="street"
                    value={street}
                    onChange={(event) => setStreet(event.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="state">State *</Label>
                    <Select value={state} onValueChange={(value: IndianState) => setState(value)} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your state *" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map((stateName) => (
                          <SelectItem key={stateName} value={stateName}>
                            {stateName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="postalCode">Postal Code *</Label>
                    <Input
                      id="postalCode"
                      value={postalCode}
                      onChange={(event) => setPostalCode(event.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Business Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Business Details</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="businessType">Business Type *</Label>
                  <Select value={businessType} onValueChange={(value: 'sole_proprietorship' | 'partnership' | 'private_limited' | 'public_limited') => setBusinessType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                      <SelectItem value="private_limited">Private Limited</SelectItem>
                      <SelectItem value="public_limited">Public Limited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>


                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="gstNumber">GST Number</Label>
                    <Input
                      id="gstNumber"
                      placeholder="22AAAAA0000A1Z5"
                      value={gstNumber}
                      onChange={(event) => setGstNumber(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="panNumber">PAN Number</Label>
                    <Input
                      id="panNumber"
                      placeholder="AAAAA0000A"
                      value={panNumber}
                      onChange={(event) => setPanNumber(event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Optional KYC Section */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Instant Settlement Setup (Optional)</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete KYC now to enable instant settlements, or skip and complete later from dashboard.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowKycFields(!showKycFields)}
                >
                  {showKycFields ? 'Skip for Now' : 'Setup Now'}
                </Button>
              </div>

              {showKycFields && (
                <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-medium">Bank Account Details</h4>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="accountHolderName">Account Holder Name</Label>
                      <Input
                        id="accountHolderName"
                        placeholder="Same as business legal name"
                        value={accountHolderName}
                        onChange={(event) => setAccountHolderName(event.target.value)}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="accountNumber">Account Number</Label>
                        <Input
                          id="accountNumber"
                          placeholder="000000000000"
                          value={accountNumber}
                          onChange={(event) => setAccountNumber(event.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="ifscCode">IFSC Code</Label>
                        <Input
                          id="ifscCode"
                          placeholder="SBIN0000000"
                          value={ifscCode}
                          onChange={(event) => setIfscCode(event.target.value.toUpperCase())}
                        />
                      </div>
                    </div>

                    {(businessType === 'private_limited' || businessType === 'public_limited') && (
                      <div className="grid gap-2">
                        <Label htmlFor="cinNumber">CIN Number</Label>
                        <Input
                          id="cinNumber"
                          placeholder="U72900KA2020PTC134123"
                          value={cinNumber}
                          onChange={(event) => setCinNumber(event.target.value.toUpperCase())}
                        />
                        <p className="text-xs text-muted-foreground">
                          Required for private/public limited companies
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <div className="text-blue-600 text-sm">
                        <span role="img" aria-label="Information">ℹ️</span>
                      </div>
                      <div className="text-sm text-blue-800">
                        <strong>Why provide this?</strong> With complete KYC, you'll receive payments directly to your bank account within minutes. Without KYC, settlements may take 2-3 business days.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Policy Agreement */}
            <div className="text-center space-y-2 mt-6">
              <div className="text-sm text-muted-foreground">
                By completing onboarding, you agree to our{' '}
                <Link to="/terms-conditions" className="text-primary hover:underline">
                  Terms & Conditions
                </Link>
                {', '}
                <Link to="/privacy-policy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                {', and '}
                <Link to="/refund-policy" className="text-primary hover:underline">
                  Refund Policy
                </Link>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="mt-4">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" /> Setting up your restaurant...
                </span>
              ) : (
                'Complete Onboarding'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            You'll get a 30-day free trial. After that, subscription billing starts automatically via Razorpay. You can cancel anytime.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default OnboardingPage;
