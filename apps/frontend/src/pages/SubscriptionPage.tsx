import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Check,
  Crown,
  Zap,
  Building2,
  CreditCard,
  Calendar,
  Users,
  BarChart3,
  HeadphonesIcon,
  Settings,
  Star,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
} from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useGetAllPlansQuery,
  useGetSubscriptionStatusQuery,
  useCreateSubscriptionMutation,
  useUpdateSubscriptionMutation,
  usePauseSubscriptionMutation,
  useResumeSubscriptionMutation,
  useCancelSubscriptionMutation,
  useGetPaymentHistoryQuery,
  SubscriptionPlan,
  SubscriptionStatus,
  PlanOption,
} from '@/store/api/subscriptionsApi';

const SubscriptionPage = () => {
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlanType, setSelectedPlanType] = useState<SubscriptionPlan | null>(null);
  const { toast } = useToast();
  const activeRestaurantId = useAppSelector(selectActiveRestaurantId);

  // API queries
  const {
    data: plans = [],
    isLoading: plansLoading,
    error: plansError,
  } = useGetAllPlansQuery();

  const {
    data: subscriptionStatus,
    isLoading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useGetSubscriptionStatusQuery(activeRestaurantId || '', {
    skip: !activeRestaurantId,
  });

  const {
    data: paymentHistory,
    isLoading: historyLoading,
  } = useGetPaymentHistoryQuery(activeRestaurantId || '', {
    skip: !activeRestaurantId,
  });

  // Mutations
  const [createSubscription, { isLoading: creating }] = useCreateSubscriptionMutation();
  const [updateSubscription, { isLoading: updating }] = useUpdateSubscriptionMutation();
  const [pauseSubscription, { isLoading: pausing }] = usePauseSubscriptionMutation();
  const [resumeSubscription, { isLoading: resuming }] = useResumeSubscriptionMutation();
  const [cancelSubscription, { isLoading: cancelling }] = useCancelSubscriptionMutation();

  // Filter plans based on billing cycle and exclude legacy plans from main display
  const filteredPlans = useMemo(() => {
    const period = isYearly ? 'yearly' : 'monthly';
    return plans.filter(plan =>
      plan.period === period &&
      !plan.isLegacy &&
      plan.planType !== SubscriptionPlan.FOUNDING_MEMBER &&
      plan.planType !== SubscriptionPlan.EARLY_ADOPTER
    );
  }, [plans, isYearly]);

  if (!activeRestaurantId) {
    return <Navigate to="/auth/login" replace />;
  }

  if (plansLoading || statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (plansError || statusError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Subscription Data
            </CardTitle>
            <CardDescription>
              Failed to load subscription plans and status. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} className="w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateSubscription = async (planType: SubscriptionPlan) => {
    if (!activeRestaurantId) return;

    try {
      await createSubscription({
        restaurantId: activeRestaurantId,
        planType,
        customerNotify: true,
        notes: { source: 'subscription_page' },
      }).unwrap();

      toast({
        title: 'Subscription Created',
        description: 'Your subscription has been created successfully!',
      });

      refetchStatus();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.data?.message || 'Failed to create subscription',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateSubscription = async (planType: SubscriptionPlan) => {
    if (!subscriptionStatus?.subscription?.id) return;

    try {
      await updateSubscription({
        subscriptionId: subscriptionStatus.subscription.id,
        data: {
          planType,
          customerNotify: true,
          notes: { upgrade_reason: 'user_requested' },
        },
      }).unwrap();

      toast({
        title: 'Plan Updated',
        description: 'Your subscription plan has been updated successfully!',
      });

      refetchStatus();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.data?.message || 'Failed to update subscription',
        variant: 'destructive',
      });
    }
  };

  const handlePauseSubscription = async () => {
    if (!subscriptionStatus?.subscription?.id) return;

    try {
      await pauseSubscription(subscriptionStatus.subscription.id).unwrap();
      toast({
        title: 'Subscription Paused',
        description: 'Your subscription has been paused.',
      });
      refetchStatus();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.data?.message || 'Failed to pause subscription',
        variant: 'destructive',
      });
    }
  };

  const handleResumeSubscription = async () => {
    if (!subscriptionStatus?.subscription?.id) return;

    try {
      await resumeSubscription(subscriptionStatus.subscription.id).unwrap();
      toast({
        title: 'Subscription Resumed',
        description: 'Your subscription has been resumed.',
      });
      refetchStatus();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.data?.message || 'Failed to resume subscription',
        variant: 'destructive',
      });
    }
  };

  const handleCancelSubscription = async (cancelAtCycleEnd = true) => {
    if (!subscriptionStatus?.subscription?.id) return;

    try {
      await cancelSubscription({
        subscriptionId: subscriptionStatus.subscription.id,
        cancelAtCycleEnd,
      }).unwrap();

      toast({
        title: 'Subscription Cancelled',
        description: cancelAtCycleEnd
          ? 'Your subscription will be cancelled at the end of the billing cycle.'
          : 'Your subscription has been cancelled immediately.',
      });

      refetchStatus();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.data?.message || 'Failed to cancel subscription',
        variant: 'destructive',
      });
    }
  };

  const getFeatureIcon = (featureKey: string) => {
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      locations: Building2,
      tables: Users,
      analytics: BarChart3,
      support: HeadphonesIcon,
      customBranding: Settings,
      inventoryAlerts: Star,
      customIntegrations: CreditCard,
      dedicatedManager: Crown,
    };
    return iconMap[featureKey] || CheckCircle;
  };

  const formatPrice = (amount: number) => {
    return `₹${(amount / 100).toLocaleString('en-IN')}`;
  };

  const formatFeatureValue = (value: number | string) => {
    if (typeof value === 'number') {
      return value.toString();
    }
    return value === 'unlimited' ? 'Unlimited' : value;
  };

  const getStatusColor = (status: SubscriptionStatus) => {
    switch (status) {
      case SubscriptionStatus.ACTIVE:
      case SubscriptionStatus.AUTHENTICATED:
        return 'text-green-600';
      case SubscriptionStatus.PAUSED:
      case SubscriptionStatus.PENDING:
        return 'text-yellow-600';
      case SubscriptionStatus.CANCELLED:
      case SubscriptionStatus.HALTED:
      case SubscriptionStatus.EXPIRED:
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPlanIcon = (planType: SubscriptionPlan) => {
    if (planType.includes('starter')) return Zap;
    if (planType.includes('professional')) return Crown;
    if (planType.includes('enterprise')) return Building2;
    return Star;
  };

  const renderCurrentSubscription = () => {
    if (!subscriptionStatus?.hasSubscription || !subscriptionStatus.subscription) {
      return (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              No Active Subscription
            </CardTitle>
            <CardDescription>
              You don't have an active subscription. Choose a plan below to get started.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    const { subscription, isTrialActive } = subscriptionStatus;
    const Icon = getPlanIcon(subscription.plan.planType);

    return (
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Icon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {subscription.plan.name}
                  <Badge
                    variant={subscription.status === SubscriptionStatus.ACTIVE ? 'default' : 'secondary'}
                    className={getStatusColor(subscription.status)}
                  >
                    {isTrialActive ? 'Trial Active' : subscription.status}
                  </Badge>
                  {subscription.isGrandfathered && (
                    <Badge variant="outline" className="text-purple-600">
                      Grandfathered
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {formatPrice(subscription.plan.amount)} / {subscription.plan.period}
                  {isTrialActive && subscription.trialEnd && (
                    <span className="block text-green-600 font-medium">
                      Trial ends: {new Date(subscription.trialEnd).toLocaleDateString()}
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              {subscription.status === SubscriptionStatus.PAUSED ? (
                <Button
                  onClick={handleResumeSubscription}
                  disabled={resuming}
                  size="sm"
                >
                  {resuming ? 'Resuming...' : 'Resume'}
                </Button>
              ) : subscription.status === SubscriptionStatus.ACTIVE && (
                <Button
                  variant="outline"
                  onClick={handlePauseSubscription}
                  disabled={pausing}
                  size="sm"
                >
                  {pausing ? 'Pausing...' : 'Pause'}
                </Button>
              )}
              {subscription.status !== SubscriptionStatus.CANCELLED && (
                <Button
                  variant="destructive"
                  onClick={() => handleCancelSubscription()}
                  disabled={cancelling}
                  size="sm"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {subscription.currentStart && subscription.currentEnd && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Current Period</p>
                  <p className="text-xs text-gray-500">
                    {new Date(subscription.currentStart).toLocaleDateString()} - {new Date(subscription.currentEnd).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {subscription.chargeAt && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Next Billing</p>
                    <p className="text-xs text-gray-500">
                      {new Date(subscription.chargeAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Billing Cycle</p>
                  <p className="text-xs text-gray-500">
                    {subscription.paidCount}/{subscription.totalCount || '∞'} payments
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  const renderPlanCard = (plan: PlanOption) => {
    const Icon = getPlanIcon(plan.planType);
    const isCurrentPlan = subscriptionStatus?.subscription?.plan.planType === plan.planType;
    const canUpgrade = subscriptionStatus?.hasSubscription && !isCurrentPlan;

    return (
      <Card key={plan.planType} className={`relative ${plan.isPopular ? 'ring-2 ring-purple-500' : ''}`}>
        {plan.isPopular && (
          <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-500">
            Most Popular
          </Badge>
        )}
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-blue-100 rounded-lg`}>
              <Icon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {plan.name}
                {isCurrentPlan && (
                  <Badge variant="outline" className="text-green-600">
                    Current Plan
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-lg font-semibold">
                {formatPrice(plan.amount)}
                <span className="text-sm font-normal text-gray-500">
                  /{plan.period}
                </span>
                {isYearly && (
                  <span className="block text-xs text-green-600">
                    Save ₹{formatPrice((plan.monthlyEquivalent * 12) - plan.amount)} annually
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium">Features included:</h4>
              {Object.entries(plan.features).map(([key, value]) => {
                const FeatureIcon = getFeatureIcon(key);
                const isIncluded = typeof value === 'boolean' ? value : !!value;

                return (
                  <div key={key} className="flex items-center gap-2">
                    {isIncluded ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-gray-400" />
                    )}
                    <FeatureIcon className="h-4 w-4 text-gray-500" />
                    <span className={`text-sm ${isIncluded ? '' : 'text-gray-500'}`}>
                      {key === 'locations' || key === 'tables'
                        ? `${formatFeatureValue(value)} ${key}`
                        : typeof value === 'string'
                        ? value.replace(/_/g, ' ')
                        : key.replace(/([A-Z])/g, ' $1').toLowerCase()
                      }
                    </span>
                  </div>
                );
              })}
            </div>

            <Separator />

            <div className="space-y-2">
              <Button
                className="w-full"
                disabled={creating || updating || isCurrentPlan}
                onClick={() => {
                  if (canUpgrade) {
                    handleUpdateSubscription(plan.planType);
                  } else if (!subscriptionStatus?.hasSubscription) {
                    handleCreateSubscription(plan.planType);
                  }
                }}
              >
                {creating || updating
                  ? 'Processing...'
                  : isCurrentPlan
                  ? 'Current Plan'
                  : canUpgrade
                  ? 'Upgrade to This Plan'
                  : 'Start Free Trial'
                }
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Subscription Plans</h1>
        <p className="text-gray-600 mt-2">
          Choose the perfect plan for your restaurant business
        </p>
      </div>

      {renderCurrentSubscription()}

      <div className="mb-8">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={!isYearly ? 'default' : 'outline'}
            onClick={() => setIsYearly(false)}
            className="flex items-center gap-2"
          >
            Monthly
          </Button>
          <Button
            variant={isYearly ? 'default' : 'outline'}
            onClick={() => setIsYearly(true)}
            className="flex items-center gap-2"
          >
            <Badge variant="secondary" className="text-xs">17% OFF</Badge>
            Yearly
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {filteredPlans.map(renderPlanCard)}
      </div>

      {/* Payment History Section */}
      {subscriptionStatus?.hasSubscription && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              Your recent subscription payments and invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : paymentHistory?.payments.length ? (
              <div className="space-y-3">
                {paymentHistory.payments.map((payment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">{formatPrice(payment.amount)}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(payment.paidAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={payment.status === 'captured' ? 'default' : 'secondary'}>
                      {payment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No payment history available
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* FAQ Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Can I change my plan anytime?</h4>
            <p className="text-sm text-gray-600">
              Yes, you can upgrade or downgrade your plan at any time. Changes will be prorated and reflected in your next billing cycle.
            </p>
          </div>
          <Separator />
          <div>
            <h4 className="font-medium mb-2">What happens during the free trial?</h4>
            <p className="text-sm text-gray-600">
              New customers get 30 days free trial with full access to all features. No credit card required.
            </p>
          </div>
          <Separator />
          <div>
            <h4 className="font-medium mb-2">Can I pause my subscription?</h4>
            <p className="text-sm text-gray-600">
              Yes, you can pause your subscription temporarily. Your data will be preserved and you can resume anytime.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionPage;