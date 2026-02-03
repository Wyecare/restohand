import { useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  ExternalLink,
  RefreshCw,
  Info,
  Building2,
  Banknote,
  Calendar,
} from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useGetCashfreeVendorStatusQuery,
  useOnboardRestaurantToCashfreeMutation,
  useSyncCashfreeVendorStatusMutation,
} from '@/store/api/restaurantsApi';

const KycManagementPage = () => {
  const { toast } = useToast();
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const [isKycDialogOpen, setIsKycDialogOpen] = useState(false);

  // Form state for KYC completion
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [cinNumber, setCinNumber] = useState('');

  const {
    data: vendorStatus,
    isLoading: isStatusLoading,
    refetch: refetchStatus,
  } = useGetCashfreeVendorStatusQuery(restaurantId ?? skipToken);

  const [onboardToCashfree, { isLoading: isOnboarding }] = useOnboardRestaurantToCashfreeMutation();
  const [syncVendorStatus, { isLoading: isSyncing }] = useSyncCashfreeVendorStatusMutation();

  const handleCompleteKyc = async () => {
    if (!restaurantId) return;

    if (!accountNumber || !ifscCode || !accountHolderName) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required bank account details.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await onboardToCashfree({
        restaurantId,
        scheduleOption: 1, // T+1 daily settlements (most commonly available)
        forceUpdate: true, // Allow re-onboarding if already exists
      }).unwrap();

      toast({
        title: 'KYC Submission Successful',
        description: 'Your KYC information has been submitted for review. You\'ll receive instant settlements once approved.',
      });

      setIsKycDialogOpen(false);
      refetchStatus();

      // Clear form
      setAccountNumber('');
      setIfscCode('');
      setAccountHolderName('');
      setCinNumber('');

    } catch (error) {
      console.error('KYC completion failed:', error);
      toast({
        title: 'KYC Submission Failed',
        description: error instanceof Error ? error.message : 'Please try again or contact support.',
        variant: 'destructive',
      });
    }
  };

  const handleSyncStatus = async () => {
    if (!restaurantId) return;

    try {
      await syncVendorStatus(restaurantId).unwrap();
      refetchStatus();
      toast({
        title: 'Status Updated',
        description: 'Vendor status synchronized successfully.',
      });
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync vendor status. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getStatusInfo = () => {
    if (!vendorStatus?.hasVendor) {
      return {
        icon: <AlertCircle className="h-5 w-5 text-amber-600" />,
        title: 'KYC Not Started',
        description: 'Complete KYC verification to start receiving instant settlements.',
        badgeVariant: 'secondary' as const,
        badgeText: 'Not Started',
        showSetupButton: true,
      };
    }

    if (vendorStatus.kycStatus === 'pending') {
      return {
        icon: <Clock className="h-5 w-5 text-blue-600" />,
        title: 'KYC Under Review',
        description: 'Your KYC information is being reviewed by our payment partner.',
        badgeVariant: 'outline' as const,
        badgeText: 'Under Review',
        showSetupButton: false,
      };
    }

    if (vendorStatus.kycStatus === 'rejected') {
      return {
        icon: <AlertCircle className="h-5 w-5 text-red-600" />,
        title: 'KYC Rejected',
        description: 'Your KYC submission needs attention. Please update your information.',
        badgeVariant: 'destructive' as const,
        badgeText: 'Rejected',
        showSetupButton: true,
      };
    }

    if (vendorStatus.canReceiveSettlements) {
      return {
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
        title: 'KYC Approved',
        description: 'You\'re all set to receive instant settlements!',
        badgeVariant: 'default' as const,
        badgeText: 'Active',
        showSetupButton: false,
      };
    }

    return {
      icon: <Clock className="h-5 w-5 text-blue-600" />,
      title: 'KYC Pending Approval',
      description: 'Your KYC has been submitted and is pending final approval.',
      badgeVariant: 'outline' as const,
      badgeText: 'Pending Approval',
      showSetupButton: false,
    };
  };

  if (isStatusLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statusInfo = getStatusInfo();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">KYC Management</h1>
          <p className="text-muted-foreground">
            Manage your payment verification and settlement configuration
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSyncStatus}
          disabled={isSyncing}
          className="gap-2"
        >
          {isSyncing ? (
            <LoadingSpinner size="sm" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh Status
        </Button>
      </div>

      {/* Current KYC Status */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {statusInfo.icon}
              <div>
                <CardTitle className="text-xl">{statusInfo.title}</CardTitle>
                <CardDescription className="mt-1">
                  {statusInfo.description}
                </CardDescription>
              </div>
            </div>
            <Badge variant={statusInfo.badgeVariant}>
              {statusInfo.badgeText}
            </Badge>
          </div>
        </CardHeader>

        {vendorStatus?.hasVendor && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Vendor ID</div>
                  <div className="text-sm text-muted-foreground">
                    {vendorStatus.vendorId || 'Not assigned'}
                  </div>
                </div>
              </div>

              {vendorStatus.scheduleOption && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Settlement Schedule</div>
                    <div className="text-sm text-muted-foreground">
                      {vendorStatus.scheduleOption.settlementScheduleMessage}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Banknote className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Settlement Status</div>
                  <div className="text-sm text-muted-foreground">
                    {vendorStatus.canReceiveSettlements ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        )}

        {statusInfo.showSetupButton && (
          <CardContent className="pt-0">
            <Dialog open={isKycDialogOpen} onOpenChange={setIsKycDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  {vendorStatus?.hasVendor ? 'Update KYC' : 'Complete KYC'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Complete KYC for Instant Settlements
                  </DialogTitle>
                  <DialogDescription>
                    Add your bank account details to start receiving payments directly from customers.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountHolderName">Account Holder Name</Label>
                    <Input
                      id="accountHolderName"
                      placeholder="Same as business legal name"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        placeholder="000000000000"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ifscCode">IFSC Code</Label>
                      <Input
                        id="ifscCode"
                        placeholder="SBIN0000000"
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cinNumber">CIN Number (Optional)</Label>
                    <Input
                      id="cinNumber"
                      placeholder="U72900KA2020PTC134123"
                      value={cinNumber}
                      onChange={(e) => setCinNumber(e.target.value.toUpperCase())}
                    />
                    <p className="text-xs text-muted-foreground">
                      Required only for private/public limited companies
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <strong>Benefits:</strong> Receive payments directly to your account with T+1 settlements.
                        No waiting for manual processing.
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsKycDialogOpen(false)}
                    >
                      Later
                    </Button>
                    <Button
                      onClick={handleCompleteKyc}
                      disabled={isOnboarding}
                    >
                      {isOnboarding && <LoadingSpinner size="sm" className="mr-2" />}
                      Submit KYC
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        )}
      </Card>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              About KYC Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              KYC (Know Your Customer) verification is required to enable direct payments
              from customers to your restaurant's bank account.
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Receive payments directly to your bank account</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Faster settlements (T+1 instead of manual processing)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Automated payment reconciliation</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Need Help?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Having trouble with KYC verification? Our support team is here to help.
            </p>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <ExternalLink className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Documentation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Limitations Alert */}
      {vendorStatus?.hasVendor && !vendorStatus.canReceiveSettlements && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Current Limitation:</strong> Our payment partner is working to enable
            instant settlements for your account. In the meantime, you can still receive
            payments with T+1 settlement (next business day at 11 AM).
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default KycManagementPage;