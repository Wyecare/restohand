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
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  selectActiveRestaurantId,
  selectAuthSession,
  selectAuthState,
  setAuthPending,
} from '@/store/slices/authSlice';
import { getFirebaseAuth } from '@/lib/firebase';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const OnboardingPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
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
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [businessType, setBusinessType] = useState<'sole_proprietorship' | 'partnership' | 'private_limited' | 'public_limited'>('sole_proprietorship');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');

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

    if (!name || !email || !phone || !street || !city || !state || !postalCode || !accountNumber || !ifscCode || !accountHolderName || !bankName) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields to continue.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const freshToken = await getFirebaseAuth().currentUser?.getIdToken(true);

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
        bankAccount: {
          accountNumber,
          ifscCode,
          accountHolderName,
          bankName,
        },
      };

      const result = await onboardRestaurant(onboardingData).unwrap();

      dispatch(setAuthPending());
      await getFirebaseAuth().currentUser?.getIdToken(true);
      toast({
        title: 'Restaurant onboarded successfully!',
        description: 'Your SaaS subscription is now active with a 30-day free trial.'
      });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('[OnboardingPage] SaaS onboarding failed', error);
      toast({
        title: 'Unable to onboard restaurant',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
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
                    <Input
                      id="state"
                      value={state}
                      onChange={(event) => setState(event.target.value)}
                      required
                    />
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
                  <Select value={businessType} onValueChange={(value: any) => setBusinessType(value)}>
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

            {/* Bank Account */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Bank Account Details</h3>
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="accountNumber">Account Number *</Label>
                    <Input
                      id="accountNumber"
                      value={accountNumber}
                      onChange={(event) => setAccountNumber(event.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ifscCode">IFSC Code *</Label>
                    <Input
                      id="ifscCode"
                      placeholder="HDFC0000123"
                      value={ifscCode}
                      onChange={(event) => setIfscCode(event.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="accountHolderName">Account Holder Name *</Label>
                    <Input
                      id="accountHolderName"
                      value={accountHolderName}
                      onChange={(event) => setAccountHolderName(event.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bankName">Bank Name *</Label>
                    <Input
                      id="bankName"
                      placeholder="HDFC Bank"
                      value={bankName}
                      onChange={(event) => setBankName(event.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
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
            You'll get a 30-day free trial. After that, it's ₹999/month. You can cancel anytime.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default OnboardingPage;
