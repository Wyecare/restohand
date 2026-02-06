import React, { useState, useMemo, useEffect } from 'react';
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
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  Sparkles,
  Target,
} from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import {
  selectActiveRestaurantId,
  selectAuthSession,
} from '@/store/slices/authSlice';
import {
  useGetCashfreeSubscriptionPlansQuery,
  useGetCashfreeSubscriptionStatusQuery,
  useCreateCashfreeSubscriptionMutation,
  useUpdateCashfreeSubscriptionMutation,
  useCancelCashfreeSubscriptionMutation,
  useGetCashfreePaymentHistoryQuery,
  formatCurrency,
  formatPlanInterval,
  getStatusColor,
  getStatusBadgeVariant,
  CashfreeSubscriptionPlan,
  CashfreeSubscription,
} from '@/store/api/cashfreeSubscriptionsApi';

// Declare Cashfree SDK
declare global {
  interface Window {
    Cashfree: any;
  }
}

const CashfreeSubscriptionPage = () => {
  // Load Cashfree SDK
  useEffect(() => {
    if (!window.Cashfree) {
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);


  // Initialize Cashfree checkout
  const initiateCashfreeCheckout = (sessionId: string) => {
    if (!window.Cashfree) {
      console.error('Cashfree SDK not loaded');
      toast({
        title: 'Error',
        description: 'Payment system not ready. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    const cashfree = window.Cashfree({
      mode: 'sandbox', // Change to 'production' for live environment
    });

    cashfree
      .subscriptionsCheckout({
        subsSessionId: sessionId,
        redirectTarget: '_blank',
      })
      .then((result: any) => {
        if (result.error) {
          toast({
            title: 'Payment Error',
            description: result.error.message,
            variant: 'destructive',
          });
        }
      })
      .catch((error: any) => {
        console.error('Cashfree checkout error:', error);
        toast({
          title: 'Payment Error',
          description: 'Failed to open payment page. Please try again.',
          variant: 'destructive',
        });
      });
  };
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'yearly'>(
    'monthly'
  );
  const { toast } = useToast();

  const activeRestaurantId = useAppSelector(selectActiveRestaurantId);
  const authSession = useAppSelector(selectAuthSession);

  // API queries
  const {
    data: plansResponse,
    isLoading: plansLoading,
    error: plansError,
  } = useGetCashfreeSubscriptionPlansQuery();

  const {
    data: subscriptionStatus,
    isLoading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useGetCashfreeSubscriptionStatusQuery(activeRestaurantId || '', {
    skip: !activeRestaurantId,
  });

  const { data: paymentHistory, isLoading: historyLoading } =
    useGetCashfreePaymentHistoryQuery(activeRestaurantId || '', {
      skip: !activeRestaurantId,
    });

  // Mutations
  const [createSubscription, { isLoading: creating }] =
    useCreateCashfreeSubscriptionMutation();
  const [updateSubscription, { isLoading: updating }] =
    useUpdateCashfreeSubscriptionMutation();
  const [cancelSubscription, { isLoading: cancelling }] =
    useCancelCashfreeSubscriptionMutation();

  // Check for payment success in URL and refresh subscription data
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    // Check if this is a payment return (has Cashfree payment parameters)
    const hasPaymentParams = urlParams.get('status') === 'success' ||
                           urlParams.get('payment_status') === 'success' ||
                           urlParams.get('payment_id') ||
                           urlParams.get('cf_payment_id') ||
                           urlParams.get('order_id') ||
                           urlParams.get('subscription_id');

    const isPaymentReturn = window.location.pathname.includes('/payment-success') ||
                           hasPaymentParams;

    if (isPaymentReturn && activeRestaurantId) {
      // Show success message
      toast({
        title: 'Payment Successful',
        description: 'Your subscription has been activated successfully!',
        variant: 'default',
      });

      // Force refresh subscription status after a short delay to allow webhook processing
      setTimeout(() => {
        // Reload the page to refresh all data
        window.location.reload();
      }, 2000);

      // Clean up URL to remove payment parameters
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [activeRestaurantId, toast]);

  // Filter plans based on billing cycle
  const filteredPlans = useMemo(() => {
    if (!plansResponse?.plans) return [];

    return plansResponse.plans
      .filter((plan) => {
        const isMonthly =
          plan.plan_interval_type === 'MONTH' && plan.plan_intervals === 1;
        const isYearly =
          plan.plan_interval_type === 'YEAR' && plan.plan_intervals === 1;

        if (selectedBilling === 'monthly') return isMonthly;
        if (selectedBilling === 'yearly') return isYearly;

        return false;
      })
      .sort((a, b) => {
        // Sort by tier: basic, professional, enterprise
        const tierOrder = { basic: 1, professional: 2, enterprise: 3 };
        return tierOrder[a.tier] - tierOrder[b.tier];
      });
  }, [plansResponse?.plans, selectedBilling]);

  // Featured plans (popular plans)
  const featuredPlans = useMemo(() => {
    return filteredPlans.filter((plan) => plan.is_popular);
  }, [filteredPlans]);

  if (!activeRestaurantId || !authSession) {
    return <Navigate to="/auth/login" replace />;
  }

  if (plansLoading || statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
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

  const handleCreateSubscription = async (plan: CashfreeSubscriptionPlan) => {
    if (!activeRestaurantId || !authSession) return;

    try {
      const result = await createSubscription({
        restaurant_id: activeRestaurantId,
        plan_id: plan?._id!,
        customer_email: authSession.email || 'user@restaurant.com',
        customer_phone: authSession.phone || '+919999999999',
        customer_name: authSession.displayName || 'Restaurant User',
        return_url: `${window.location.origin}/subscription`,
      }).unwrap();

      // Use Cashfree SDK for checkout if session ID is provided
      if (result.subscription_session_id) {
        toast({
          title: 'Opening Payment Page 💳',
          description: 'Launching Cashfree secure checkout...',
        });

        // Use Cashfree SDK for checkout
        setTimeout(() => {
          initiateCashfreeCheckout(result.subscription_session_id);
        }, 1000);
        return;
      }

      toast({
        title: 'Subscription Created Successfully! 🎉',
        description: 'Your subscription has been created.',
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

  const handleUpgradeSubscription = async (plan: CashfreeSubscriptionPlan) => {
    if (!subscriptionStatus?.subscription) return;

    try {
      await updateSubscription({
        subscription_id:
          subscriptionStatus.subscription.cashfree_subscription_id,
        data: { plan_id: plan._id! },
      }).unwrap();

      toast({
        title: 'Plan Updated Successfully! 🚀',
        description:
          'Your subscription plan has been updated. You may need to re-authorize payment.',
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

  const handleCancelSubscription = async () => {
    if (!subscriptionStatus?.subscription) return;

    if (
      !confirm(
        'Are you sure you want to cancel your subscription? This cannot be undone.'
      )
    ) {
      return;
    }

    try {
      await cancelSubscription({
        subscription_id:
          subscriptionStatus.subscription.cashfree_subscription_id,
        reason: 'User requested cancellation',
      }).unwrap();

      toast({
        title: 'Subscription Cancelled',
        description: 'Your subscription has been cancelled successfully.',
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

  const getPlanIcon = (tier: string) => {
    if (tier === 'basic') return Zap;
    if (tier === 'professional') return Crown;
    if (tier === 'enterprise') return Building2;
    return Star;
  };

  const getCurrentPlanId = () => {
    return subscriptionStatus?.subscription?.plan_id?._id;
  };

  const renderCurrentSubscription = () => {
    if (
      !subscriptionStatus?.has_subscription ||
      !subscriptionStatus.subscription
    ) {
      return (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              No Active Subscription
            </CardTitle>
            <CardDescription>
              You don't have an active subscription. Choose a plan below to get
              started with RestoHand.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    const { subscription } = subscriptionStatus;
    const plan = subscription.plan_id;
    const Icon = getPlanIcon(plan?.tier || 'basic');

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
                  {plan?.display_name || plan?.plan_name || 'Subscription Plan'}
                  <Badge
                    variant={getStatusBadgeVariant(subscription.status) as any}
                    className={getStatusColor(subscription.status)}
                  >
                    {subscription.is_in_trial && subscription.trial_ends_at
                      ? 'Trial Period'
                      : subscription.status}
                  </Badge>
                  {plan?.is_popular && (
                    <Badge variant="outline" className="text-purple-600">
                      <Star className="mr-1 h-3 w-3" />
                      Popular
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="space-y-1">
                  <div>
                    {formatCurrency(plan?.plan_recurring_amount || 0)} /{' '}
                    {formatPlanInterval(
                      plan?.plan_intervals || 1,
                      plan?.plan_interval_type || 'MONTH'
                    )}
                  </div>
                  {subscription.is_in_trial && subscription.trial_ends_at && (
                    <div className="text-green-600 font-medium">
                      Trial ends:{' '}
                      {new Date(
                        subscription.trial_ends_at
                      ).toLocaleDateString()}
                    </div>
                  )}
                  {subscription.next_billing_at && (
                    <div className="text-sm text-muted-foreground">
                      Next billing:{' '}
                      {new Date(
                        subscription.next_billing_at
                      ).toLocaleDateString()}
                    </div>
                  )}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex gap-2">
            {subscription.status !== 'CANCELLED' && (
              <Button
                variant="destructive"
                onClick={handleCancelSubscription}
                disabled={cancelling}
                size="sm"
              >
                {cancelling ? 'Cancelling...' : 'Cancel'}
              </Button>
            )}
          </div>
        </CardContent>

        {/* Usage Limits */}
        {subscriptionStatus.usage_limits && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {subscriptionStatus.usage_limits.max_locations === -1
                    ? '∞'
                    : subscriptionStatus.usage_limits.max_locations}
                </div>
                <div className="text-sm text-muted-foreground">Locations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {subscriptionStatus.usage_limits.max_tables === -1
                    ? '∞'
                    : subscriptionStatus.usage_limits.max_tables}
                </div>
                <div className="text-sm text-muted-foreground">Tables</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {subscriptionStatus.usage_limits.max_staff === -1
                    ? '∞'
                    : subscriptionStatus.usage_limits.max_staff}
                </div>
                <div className="text-sm text-muted-foreground">Staff</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {subscriptionStatus.usage_limits.max_monthly_orders === -1
                    ? '∞'
                    : subscriptionStatus.usage_limits.max_monthly_orders}
                </div>
                <div className="text-sm text-muted-foreground">
                  Orders/Month
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  const renderPlanCard = (plan: CashfreeSubscriptionPlan) => {
    const Icon = getPlanIcon(plan?.tier || 'basic');
    const isCurrentPlan = getCurrentPlanId() === plan?._id;
    const isSubscribed = subscriptionStatus?.has_subscription;
    const canUpgrade = isSubscribed && !isCurrentPlan;
    const canSubscribe = !isSubscribed;

    const isActiveSubscription =
      subscriptionStatus?.subscription?.status === 'ACTIVE';

    return (
      <Card
        key={plan?._id}
        className={`relative ${
          plan?.is_popular ? 'ring-2 ring-purple-500' : ''
        }`}
      >
        {plan?.is_popular && (
          <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500">
            <Star className="mr-1 h-3 w-3" />
            Most Popular
          </Badge>
        )}

        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Icon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {plan?.display_name || plan?.plan_name || 'Plan'}
                {isCurrentPlan && (
                  <Badge variant="outline" className="text-green-600">
                    Current Plan
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-lg font-semibold">
                {formatCurrency(plan?.plan_recurring_amount || 0)}
                <span className="text-sm font-normal text-gray-500">
                  /
                  {formatPlanInterval(
                    plan?.plan_intervals || 1,
                    plan?.plan_interval_type || 'MONTH'
                  )}
                </span>
                {selectedBilling === 'yearly' &&
                  plan.metadata?.savings_percent && (
                    <span className="block text-xs text-green-600">
                      Save {plan.metadata.savings_percent}% annually!
                    </span>
                  )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {plan?.description || ''}
          </p>

          {/* Features */}
          <div className="space-y-2">
            <h4 className="font-medium">Features included:</h4>
            {(plan?.features || []).slice(0, 6).map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm">{feature.replace(/_/g, ' ')}</span>
              </div>
            ))}
            {(plan?.features || []).length > 6 && (
              <div className="text-sm text-muted-foreground">
                +{(plan?.features || []).length - 6} more features...
              </div>
            )}
          </div>

          {/* Key Benefits */}
          {plan.metadata?.key_benefit && (
            <div className="p-2 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  {plan.metadata.key_benefit}
                </span>
              </div>
            </div>
          )}

          <Separator />

          <Button
            className="w-full"
            disabled={
              creating || updating || (isCurrentPlan && isActiveSubscription)
            }
            onClick={() => {
              if (canUpgrade) {
                handleUpgradeSubscription(plan);
              } else if (canSubscribe) {
                handleCreateSubscription(plan);
              }
            }}
          >
            {creating || updating
              ? 'Processing...'
              : isCurrentPlan && isActiveSubscription
              ? 'Current Plan'
              : isCurrentPlan && !isActiveSubscription
              ? 'Reactivate Plan'
              : canUpgrade
              ? 'Upgrade to This Plan'
              : 'Choose This Plan'}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Subscription Plans</h1>
        <p className="text-gray-600 mt-2">
          Choose the perfect plan for your restaurant business with Cashfree
          secure payments
        </p>
      </div>

      {renderCurrentSubscription()}

      {/* Billing Toggle */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={selectedBilling === 'monthly' ? 'default' : 'outline'}
            onClick={() => setSelectedBilling('monthly')}
          >
            Monthly
          </Button>
          <Button
            variant={selectedBilling === 'yearly' ? 'default' : 'outline'}
            onClick={() => setSelectedBilling('yearly')}
            className="flex items-center gap-2"
          >
            <Badge variant="secondary" className="text-xs">
              Save up to 31%
            </Badge>
            Yearly
          </Button>
        </div>
      </div>

      {/* Plans Grid */}
      {filteredPlans.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {filteredPlans.map(renderPlanCard)}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No plans available</h3>
                <p className="text-muted-foreground">
                  Subscription plans will be available soon
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History Section */}
      {subscriptionStatus?.has_subscription && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              Your recent subscription payments and cycles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : paymentHistory?.payments?.length ? (
              <div className="space-y-3">
                {paymentHistory.payments.map((payment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">
                          {formatCurrency(payment.amount * 100)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(payment.paid_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        payment.status === 'SUCCESS' ? 'default' : 'destructive'
                      }
                    >
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
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Can I change my plan anytime?</h4>
            <p className="text-sm text-gray-600">
              Yes, you can upgrade or downgrade your plan at any time. Changes
              will take effect from your next billing cycle.
            </p>
          </div>
          <Separator />
          <div>
            <h4 className="font-medium mb-2">
              What happens during the free trial?
            </h4>
            <p className="text-sm text-gray-600">
              New customers get 30 days free trial with full access to all
              features. No payment required during trial.
            </p>
          </div>
          <Separator />
          <div>
            <h4 className="font-medium mb-2">How secure are payments?</h4>
            <p className="text-sm text-gray-600">
              All payments are processed securely by Cashfree Payments, which is
              RBI approved and PCI DSS compliant.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashfreeSubscriptionPage;
