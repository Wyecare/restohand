import { useEffect, useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { Navigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Building2, MapPin, Phone, Mail, CreditCard } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useGetRestaurantQuery,
  useUpdateRestaurantMutation,
} from '@/store/api/restaurantsApi';

const RestaurantSettingsPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { toast } = useToast();

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  const { data: restaurant, isLoading } = useGetRestaurantQuery(restaurantId ?? skipToken);
  const [updateRestaurant, { isLoading: isUpdating }] = useUpdateRestaurantMutation();

  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');

  useEffect(() => {
    if (!restaurant) return;
    setName(restaurant.name);
    setLegalName(restaurant.legalName ?? '');
    setContactEmail(restaurant.contactEmail ?? '');
    setContactPhone(restaurant.contactPhone ?? '');
    setAddressLine1(restaurant.address.line1);
    setAddressLine2(restaurant.address.line2 ?? '');
    setCity(restaurant.address.city);
    setState(restaurant.address.state);
    setPostalCode(restaurant.address.postalCode);
  }, [restaurant]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!restaurantId) return;

    try {
      await updateRestaurant({
        id: restaurantId,
        body: {
          name,
          legalName: legalName || undefined,
          contactEmail: contactEmail || undefined,
          contactPhone: contactPhone || undefined,
          address: {
            line1: addressLine1,
            line2: addressLine2 || undefined,
            city,
            state,
            postalCode,
            country: restaurant?.address.country ?? 'IN',
          },
        },
      }).unwrap();
      toast({ title: 'Restaurant settings updated successfully' });
    } catch (error) {
      toast({
        title: 'Unable to update restaurant',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  if (isLoading || !restaurant) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Restaurant Profile</h1>
        <p className="text-muted-foreground">
          Manage your restaurant's basic information and contact details.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Basic Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Your restaurant's name and legal information for billing and receipts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Restaurant Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g., Kerala Kitchen"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal-name">Legal Name</Label>
                  <Input
                    id="legal-name"
                    value={legalName}
                    onChange={(event) => setLegalName(event.target.value)}
                    placeholder="e.g., Kerala Kitchen Pvt Ltd"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Contact Email
                  </Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder="contact@keralakitchen.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Contact Phone
                  </Label>
                  <Input
                    id="contact-phone"
                    value={contactPhone}
                    onChange={(event) => setContactPhone(event.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <Button type="submit" disabled={isUpdating} className="w-full">
                {isUpdating ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Settings
            </CardTitle>
            <CardDescription>
              UPI and payment configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>UPI Handle</Label>
              <Input value={restaurant.upi.vpa} disabled readOnly />
              <p className="text-xs text-muted-foreground">
                Contact support to enable dynamic UPI mode or change handles.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Address Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Address Information
          </CardTitle>
          <CardDescription>
            Your restaurant's physical location for delivery and customer visits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="address-line1">Address Line 1 *</Label>
              <Input
                id="address-line1"
                value={addressLine1}
                onChange={(event) => setAddressLine1(event.target.value)}
                placeholder="Street address, building name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address-line2">Address Line 2</Label>
              <Input
                id="address-line2"
                value={addressLine2}
                onChange={(event) => setAddressLine2(event.target.value)}
                placeholder="Apartment, suite, unit, floor (optional)"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="e.g., Kochi"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  placeholder="e.g., Kerala"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal-code">PIN Code *</Label>
                <Input
                  id="postal-code"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
                  placeholder="e.g., 682001"
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                'Update Address'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RestaurantSettingsPage;