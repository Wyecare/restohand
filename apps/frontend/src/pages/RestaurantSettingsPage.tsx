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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Building2, MapPin, Phone, Mail, CreditCard, CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useGetRestaurantQuery,
  useUpdateRestaurantMutation,
  useSetupLinkedAccountMutation,
  useGetPaymentStatusQuery,
} from '@/store/api/restaurantsApi';

const RestaurantSettingsPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { toast } = useToast();

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  const { data: restaurant, isLoading } = useGetRestaurantQuery(
    restaurantId ?? skipToken
  );
  const [updateRestaurant, { isLoading: isUpdating }] =
    useUpdateRestaurantMutation();
  const [setupLinkedAccount, { isLoading: isSettingUpPayment }] =
    useSetupLinkedAccountMutation();
  const { data: paymentStatus, refetch: refetchPaymentStatus } = useGetPaymentStatusQuery(
    restaurantId ?? ''
  );

  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [gstin, setGstin] = useState('');
  const [upiVpa, setUpiVpa] = useState('');
  const [upiDisplayName, setUpiDisplayName] = useState('');
  const [upiMode, setUpiMode] = useState<'static' | 'dynamic'>('static');

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
    setGstin(restaurant.gstin ?? '');
    setUpiVpa(restaurant.upi.vpa);
    setUpiDisplayName(restaurant.upi.displayName);
    setUpiMode(restaurant.upi.mode ?? 'static');
  }, [restaurant]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!restaurantId) return;

    const trimmedGstin = gstin.trim().toUpperCase();
    const gstinPattern =
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (trimmedGstin && !gstinPattern.test(trimmedGstin)) {
      console.log('Invalid GSTIN format:', trimmedGstin);
      toast({
        title: 'Invalid GSTIN',
        description:
          'Please enter a valid 15-character GSTIN (e.g., 32ABCDE1234F1Z5).',
        variant: 'destructive',
      });
      return;
    }

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
          gstin: trimmedGstin || undefined,
          upi: {
            vpa: upiVpa.trim(),
            displayName: upiDisplayName.trim() || name,
            mode: upiMode,
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

  const handleSetupPayment = async () => {
    if (!restaurantId) return;

    try {
      const result = await setupLinkedAccount({ restaurantId }).unwrap();

      if (result.success) {
        toast({
          title: 'Payment setup initiated',
          description: 'Your linked account has been created. It may take a few minutes to be approved by Razorpay.',
        });
        refetchPaymentStatus();
      } else {
        toast({
          title: 'Setup failed',
          description: result.error || 'Failed to setup payment account',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Setup failed',
        description: error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending_approval':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'route_not_available':
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      case 'rejected':
      case 'suspended':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Direct Payments Enabled';
      case 'pending_approval':
        return 'Pending Approval';
      case 'pending_setup':
        return 'Setup Required';
      case 'route_not_available':
        return 'Standard Payments Only';
      case 'rejected':
        return 'Rejected';
      case 'suspended':
        return 'Suspended';
      default:
        return 'Unknown Status';
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
              Your restaurant's name and legal information for billing and
              receipts.
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

              <div className="space-y-2">
                <Label htmlFor="gstin" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  GSTIN
                </Label>
                <Input
                  id="gstin"
                  value={gstin}
                  onChange={(event) =>
                    setGstin(event.target.value.toUpperCase())
                  }
                  placeholder="32ABCDE1234F1Z5"
                  maxLength={15}
                />
                <p className="text-xs text-muted-foreground">
                  Required for generating compliant tax invoices. Must match
                  your registered GST number.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="contact-email"
                    className="flex items-center gap-2"
                  >
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
                  <Label
                    htmlFor="contact-phone"
                    className="flex items-center gap-2"
                  >
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
            <CardDescription>UPI and payment configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Direct Payment Status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Direct Payment Status</Label>
                {paymentStatus && (
                  <div className="flex items-center gap-2">
                    {getPaymentStatusIcon(paymentStatus.status)}
                    <span className="text-sm">{getPaymentStatusText(paymentStatus.status)}</span>
                  </div>
                )}
              </div>

              {paymentStatus?.status === 'pending_setup' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Set up direct payments to automatically receive customer payments to your account.
                  </p>
                  <Button
                    onClick={handleSetupPayment}
                    disabled={isSettingUpPayment}
                    variant="outline"
                    className="w-full"
                  >
                    {isSettingUpPayment ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Setting up...
                      </>
                    ) : (
                      'Setup Direct Payments'
                    )}
                  </Button>
                </div>
              )}

              {paymentStatus?.status === 'pending_approval' && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Your payment account is being reviewed by Razorpay. This usually takes 1-2 business days.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Account ID: {paymentStatus.linkedAccountId}
                  </p>
                </div>
              )}

              {paymentStatus?.status === 'approved' && paymentStatus.canReceivePayments && (
                <div className="space-y-2">
                  <p className="text-sm text-green-700">
                    ✓ Direct payments are enabled. Customer payments will be automatically transferred to your account.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Account ID: {paymentStatus.linkedAccountId}
                  </p>
                </div>
              )}

              {paymentStatus?.status === 'route_not_available' && (
                <div className="space-y-3">
                  <p className="text-sm text-blue-700">
                    Direct payments require RBI compliance verification (₹40L+ annual turnover). Currently using standard payment flow.
                  </p>
                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="text-xs text-blue-800">
                      <strong>To enable direct payments:</strong>
                      <br />• Annual turnover must exceed ₹40 lakhs
                      <br />• Submit GST returns and business documents to Razorpay
                      <br />• Contact Razorpay support to apply for Route feature
                    </p>
                  </div>
                  {paymentStatus.error && (
                    <p className="text-xs text-muted-foreground">
                      Details: {paymentStatus.error}
                    </p>
                  )}
                </div>
              )}

              {(paymentStatus?.status === 'rejected' || paymentStatus?.status === 'suspended') && (
                <div className="space-y-3">
                  <p className="text-sm text-red-700">
                    Payment setup failed. Please contact support or try setting up again.
                  </p>
                  {paymentStatus.error && (
                    <p className="text-xs text-muted-foreground">
                      Error: {paymentStatus.error}
                    </p>
                  )}
                  <Button
                    onClick={handleSetupPayment}
                    disabled={isSettingUpPayment}
                    variant="outline"
                    className="w-full"
                  >
                    {isSettingUpPayment ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Retrying...
                      </>
                    ) : (
                      'Retry Setup'
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* UPI Settings */}
            <div className="border-t pt-4">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="upi-vpa">UPI Handle *</Label>
                  <Input
                    id="upi-vpa"
                    value={upiVpa}
                    onChange={(event) => setUpiVpa(event.target.value)}
                    placeholder="example@upi"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Fallback payment method for manual transactions
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upi-display-name">Display Name</Label>
                  <Input
                    id="upi-display-name"
                    value={upiDisplayName}
                    onChange={(event) => setUpiDisplayName(event.target.value)}
                    placeholder="Name shown in payment apps"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upi-mode">UPI Mode</Label>
                  <Select
                    value={upiMode}
                    onValueChange={(value) =>
                      setUpiMode(value as 'static' | 'dynamic')
                    }
                  >
                    <SelectTrigger id="upi-mode">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="static">Static</SelectItem>
                      <SelectItem value="dynamic">Dynamic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={isUpdating} className="w-full">
                  {isUpdating ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save UPI Settings'
                  )}
                </Button>
              </form>
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
            Your restaurant's physical location for delivery and customer
            visits.
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
