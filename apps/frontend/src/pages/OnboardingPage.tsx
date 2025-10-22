import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useToast } from '@/components/ui/use-toast';
import { useCreateRestaurantMutation } from '@/store/api/restaurantsApi';
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
  const [createRestaurant, { isLoading }] = useCreateRestaurantMutation();
  const { status } = useAppSelector(selectAuthState);
  const isAuthenticated = status === 'authenticated';

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [contactEmail, setContactEmail] = useState(session?.email ?? '');
  const [contactPhone, setContactPhone] = useState('');
  const [upiVpa, setUpiVpa] = useState('');
  const [upiDisplayName, setUpiDisplayName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');

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

    if (!name || !slug || !upiVpa || !addressLine1 || !city || !state || !postalCode) {
      toast({
        title: 'Missing information',
        description: 'Please fill in the required fields to continue.',
        variant: 'destructive',
      });
      return;
    }

    console.log('[OnboardingPage] submitting with token check');

    try {
      const freshToken = await getFirebaseAuth().currentUser?.getIdToken(true);
      console.log('[OnboardingPage] refreshed token', !!freshToken);

      await createRestaurant({
        name,
        slug,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        timezone: 'Asia/Kolkata',
        address: {
          line1: addressLine1,
          line2: addressLine2 || undefined,
          city,
          state,
          postalCode,
          country: 'IN',
        },
        upi: {
          vpa: upiVpa,
          displayName: upiDisplayName || name,
          mode: 'static',
        },
        languages: ['en'],
      }).unwrap();

      dispatch(setAuthPending());
      await getFirebaseAuth().currentUser?.getIdToken(true);
      toast({ title: 'Restaurant created!' });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('[OnboardingPage] createRestaurant failed', error);
      toast({
        title: 'Unable to create restaurant',
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
            Let’s set up your restaurant
          </CardTitle>
          <CardDescription>
            We need a few details to personalise menus, QR codes, and staff access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="name">Restaurant name</Label>
              <Input
                id="name"
                placeholder="Restohand Café"
                value={name}
                onChange={(event) => {
                  const value = event.target.value;
                  setName(value);
                  if (!slug || slug === slugify(name)) {
                    setSlug(slugify(value));
                  }
                }}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="slug">URL slug</Label>
              <Input
                id="slug"
                placeholder="restohand-cafe"
                value={slug}
                onChange={(event) => setSlug(slugify(event.target.value))}
                required
              />
              <p className="text-xs text-muted-foreground">
                This appears in QR links. Use lowercase letters and hyphens only.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="contactEmail">Contact email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contactPhone">Contact phone</Label>
                <Input
                  id="contactPhone"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>UPI virtual payment address</Label>
              <Input
                placeholder="restohand@upi"
                value={upiVpa}
                onChange={(event) => setUpiVpa(event.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>UPI display name</Label>
              <Input
                placeholder="Restohand"
                value={upiDisplayName}
                onChange={(event) => setUpiDisplayName(event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="addressLine1">Address line 1</Label>
              <Input
                id="addressLine1"
                value={addressLine1}
                onChange={(event) => setAddressLine1(event.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="addressLine2">Address line 2</Label>
              <Input
                id="addressLine2"
                value={addressLine2}
                onChange={(event) => setAddressLine2(event.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="postalCode">Postal code</Label>
                <Input
                  id="postalCode"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="mt-2">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" /> Creating...
                </span>
              ) : (
                'Create restaurant'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            You can invite staff and configure tables once the restaurant is created.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default OnboardingPage;
