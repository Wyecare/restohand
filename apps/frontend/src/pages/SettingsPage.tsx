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
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useGetRestaurantQuery,
  useUpdateRestaurantMutation,
  useGetRestaurantQrCodeQuery,
} from '@/store/api/restaurantsApi';

const SettingsPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { toast } = useToast();
  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  const { data: restaurant, isLoading } = useGetRestaurantQuery(restaurantId ?? skipToken);
  const [updateRestaurant, { isLoading: isUpdating }] =
    useUpdateRestaurantMutation();

  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [tableInput, setTableInput] = useState('');
  const [tableForQr, setTableForQr] = useState<string | undefined>(undefined);

  const qrArgs =
    restaurantId && tableForQr !== undefined
      ? { restaurantId, table: tableForQr || undefined }
      : skipToken;
  const { data: qrCode, isFetching: isGeneratingQr } = useGetRestaurantQrCodeQuery(
    qrArgs,
    { skip: !restaurantId || tableForQr === undefined }
  );

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

  useEffect(() => {
    if (tableForQr === undefined) {
      setTableForQr('');
    }
  }, [tableForQr]);

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
      toast({ title: 'Restaurant settings updated' });
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
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Restaurant Settings</h1>
        <p className="text-muted-foreground">
          Update your venue information. Changes are reflected instantly across
          the customer QR experience and staff dashboards.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile</CardTitle>
          <CardDescription>
            Contact details and legal information for billing and receipts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legal-name">Legal name</Label>
              <Input
                id="legal-name"
                value={legalName}
                onChange={(event) => setLegalName(event.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact-email">Contact email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-phone">Contact phone</Label>
                <Input
                  id="contact-phone"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address-line1">Address line 1</Label>
              <Input
                id="address-line1"
                value={addressLine1}
                onChange={(event) => setAddressLine1(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address-line2">Address line 2</Label>
              <Input
                id="address-line2"
                value={addressLine2}
                onChange={(event) => setAddressLine2(event.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal-code">Postal code</Label>
                <Input
                  id="postal-code"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>UPI handle</Label>
              <Input value={restaurant.upi.vpa} disabled readOnly />
              <p className="text-xs text-muted-foreground">
                Contact support to enable dynamic UPI mode or change handles.
              </p>
            </div>

            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-lg">Customer QR</CardTitle>
            <CardDescription>
              Generate QR codes that point guests to the customer menu.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Table identifier (optional)"
              value={tableInput}
              onChange={(event) => setTableInput(event.target.value)}
              className="w-40"
            />
            <Button
              variant="outline"
              onClick={() => setTableForQr(tableInput)}
              disabled={isGeneratingQr}
            >
              {isGeneratingQr ? 'Generating…' : 'Refresh QR'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {isGeneratingQr ? (
            <LoadingSpinner />
          ) : qrCode ? (
            <>
              <img
                src={qrCode.dataUrl}
                alt="Customer QR"
                className="h-48 w-48 rounded-xl border bg-white p-3 shadow"
              />
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {qrCode.restaurant.name}
                </span>
                <span>•</span>
                <span>{qrCode.table ? `Table ${qrCode.table}` : 'General'}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(qrCode.url)}
                >
                  Copy link
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = qrCode.dataUrl;
                    link.download = `restohand-${qrCode.restaurant.slug}${
                      qrCode.table ? `-${qrCode.table}` : ''
                    }.png`;
                    link.click();
                  }}
                >
                  Download QR
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Generate your first QR to share with customers.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
