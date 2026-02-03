import { useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  X,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useGetCashfreeVendorStatusQuery,
  useOnboardRestaurantToCashfreeMutation,
  useSyncCashfreeVendorStatusMutation,
} from '@/store/api/restaurantsApi';

interface KycCompletionBannerProps {
  onDismiss?: () => void;
  forceVisible?: boolean;
}

const KycCompletionBanner = ({ onDismiss, forceVisible = false }: KycCompletionBannerProps) => {
  const { toast } = useToast();
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const [isKycDialogOpen, setIsKycDialogOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

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

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

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

  // Don't show if loading or dismissed (unless forced visible)
  if (isStatusLoading || (isDismissed && !forceVisible)) {
    return null;
  }

  // Don't show if vendor is already active
  if (vendorStatus?.canReceiveSettlements) {
    return null;
  }

  // Determine banner content based on vendor status
  const getBannerContent = () => {
    if (!vendorStatus?.hasVendor) {
      return {
        icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
        title: 'Complete KYC for Instant Settlements',
        description: 'Set up your bank account to receive payments directly from customers within minutes.',
        action: 'Complete KYC',
        variant: 'default' as const,
        showDialog: true,
      };
    }

    if (vendorStatus.kycStatus === 'pending') {
      return {
        icon: <Clock className="h-5 w-5 text-blue-600" />,
        title: 'KYC Under Review',
        description: 'Your KYC information is being reviewed. You\'ll start receiving instant settlements once approved.',
        action: 'Check Status',
        variant: 'default' as const,
        showDialog: false,
      };
    }

    if (vendorStatus.kycStatus === 'rejected') {
      return {
        icon: <AlertCircle className="h-5 w-5 text-red-600" />,
        title: 'KYC Review Required',
        description: 'Your KYC needs attention. Please update your information to enable instant settlements.',
        action: 'Update KYC',
        variant: 'destructive' as const,
        showDialog: true,
      };
    }

    return null;
  };

  const bannerContent = getBannerContent();
  if (!bannerContent) return null;

  return (
    <Alert className="border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/20">
      <div className="flex items-start justify-between w-full">
        <div className="flex items-start space-x-3">
          {bannerContent.icon}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
              {bannerContent.title}
            </h4>
            <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
              {bannerContent.description}
            </AlertDescription>

            {/* Status Badge */}
            {vendorStatus && (
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant={vendorStatus.canReceiveSettlements ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {vendorStatus.canReceiveSettlements ? 'Active' : vendorStatus.kycStatus || 'Not Started'}
                </Badge>
                {vendorStatus.scheduleOption && (
                  <span className="text-xs text-muted-foreground">
                    {vendorStatus.scheduleOption.settlementScheduleMessage}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 mt-3">
              {bannerContent.showDialog ? (
                <Dialog open={isKycDialogOpen} onOpenChange={setIsKycDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-2">
                      <CreditCard className="h-4 w-4" />
                      {bannerContent.action}
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
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSyncStatus}
                  disabled={isSyncing}
                  className="gap-2"
                >
                  {isSyncing ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  {bannerContent.action}
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-amber-600 hover:text-amber-700 px-2"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-amber-600 hover:text-amber-700 -mt-1 -mr-1"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
};

export default KycCompletionBanner;