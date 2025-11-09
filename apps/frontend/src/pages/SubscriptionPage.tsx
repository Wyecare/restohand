import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { useGetSubscriptionStatusQuery, useUpgradeSubscriptionMutation, useCreateSubscriptionPaymentIntentMutation, useInitializeTestSubscriptionMutation } from '@/store/api/subscriptionsApi';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  CheckCircle,
  Crown,
  Calendar,
  CreditCard,
  TrendingUp,
  Shield,
  Clock,
  Star,
  Zap
} from 'lucide-react';


const plans = [
  {
    id: 'starter',
    name: 'Starter',
    prices: {
      hourly: 1,    // ₹1 per hour for testing
      daily: 10,    // ₹10 per day for testing
      monthly: 999, // ₹999 per month
      yearly: 11990, // ₹11,990 per year
    },
    description: 'Perfect for small restaurants',
    features: [
      'Up to 50 orders/day',
      'Basic menu management',
      'Order tracking',
      'Customer interface',
      'Payment processing',
      'Basic analytics',
    ],
    icon: <Shield className="h-6 w-6" />,
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 'pro',
    name: 'Pro',
    prices: {
      hourly: 2,     // ₹2 per hour for testing
      daily: 20,     // ₹20 per day for testing
      monthly: 1999, // ₹1999 per month
      yearly: 23990, // ₹23,990 per year
    },
    description: 'Ideal for growing businesses',
    features: [
      'Unlimited orders',
      'Advanced menu management',
      'Inventory tracking',
      'Staff management',
      'Advanced analytics',
      'Multi-location support',
      'API access',
    ],
    icon: <Star className="h-6 w-6" />,
    color: 'from-purple-500 to-purple-600',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    prices: {
      hourly: 5,     // ₹5 per hour for testing
      daily: 50,     // ₹50 per day for testing
      monthly: 4999, // ₹4999 per month
      yearly: 59990, // ₹59,990 per year
    },
    description: 'For large restaurant chains',
    features: [
      'Everything in Pro',
      'Custom integrations',
      'Dedicated support',
      'Advanced reporting',
      'White-label options',
      'Custom features',
    ],
    icon: <Crown className="h-6 w-6" />,
    color: 'from-amber-500 to-amber-600',
  },
];

const billingCycles = [
  { id: 'hourly', name: 'Hourly', suffix: '/hour', badge: 'Testing' },
  { id: 'daily', name: 'Daily', suffix: '/day', badge: 'Testing' },
  { id: 'monthly', name: 'Monthly', suffix: '/month', badge: 'Popular' },
  { id: 'yearly', name: 'Yearly', suffix: '/year', badge: 'Save 20%' },
] as const;

export default function SubscriptionPage() {
  const { toast } = useToast();
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const [searchParams] = useSearchParams();

  const {
    data: subscriptionStatus,
    isLoading,
    error: fetchError,
  } = useGetSubscriptionStatusQuery(restaurantId!, {
    skip: !restaurantId,
  });

  const [upgradeSubscription, { isLoading: isUpgrading }] = useUpgradeSubscriptionMutation();
  const [createPaymentIntent] = useCreateSubscriptionPaymentIntentMutation();
  const [initializeTestSubscription, { isLoading: isInitializing }] = useInitializeTestSubscriptionMutation();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'hourly' | 'daily' | 'monthly' | 'yearly'>('monthly');

  // Check if there's a payment parameter (from email/SMS link)
  useEffect(() => {
    const paymentOrderId = searchParams.get('payment');
    if (paymentOrderId && restaurantId) {
      // Show payment notification
      toast({
        title: 'Payment Due',
        description: 'Complete your subscription payment to continue using Restohand.',
        duration: 8000,
      });
    }
  }, [searchParams, restaurantId, toast]);

  // Load Razorpay script
  const loadRazorpayScript = async (): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleInitializeTest = async (plan: 'starter' | 'pro' | 'enterprise', billingCycle: 'hourly' | 'daily' | 'monthly' | 'yearly' = 'hourly') => {
    if (!restaurantId) return;

    try {
      const result = await initializeTestSubscription({
        restaurantId,
        plan,
        billingCycle,
      }).unwrap();

      toast({
        title: 'Test Subscription Initialized!',
        description: `${billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)} ${plan} plan activated. Next billing: ${new Date(result.nextBillingDate).toLocaleString()}`,
      });

      // Refresh subscription status
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast({
        title: 'Initialization failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleUpgrade = async (newPlan: string) => {
    if (!restaurantId) return;

    try {
      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          throw new Error('Failed to load payment gateway');
        }
      }

      // Create payment intent
      const paymentIntent = await createPaymentIntent({
        restaurantId,
        plan: newPlan as 'starter' | 'pro' | 'enterprise',
        billingCycle: selectedBillingCycle,
      }).unwrap();

      // Initialize Razorpay payment
      const options = {
        key: paymentIntent.razorpayKey,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        name: 'Restohand Subscription',
        description: paymentIntent.description,
        order_id: paymentIntent.razorpayOrderId,
        handler: async (response: any) => {
          try {
            // Payment successful
            toast({
              title: 'Payment Successful!',
              description: `Your subscription has been upgraded to ${newPlan}.`,
            });
            // Refetch subscription status
            window.location.reload();
          } catch (error) {
            toast({
              title: 'Payment verification failed',
              description: 'Please contact support if money was deducted.',
              variant: 'destructive',
            });
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessingPayment(false);
            toast({
              title: 'Payment cancelled',
              description: 'You can try again when ready.',
            });
          },
        },
        theme: {
          color: '#000000',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      setIsProcessingPayment(false);
      toast({
        title: 'Payment failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const getCurrentPlan = () => {
    if (!subscriptionStatus) return null;
    return plans.find(plan => plan.id === subscriptionStatus.plan);
  };

  const getStatusBadge = () => {
    if (!subscriptionStatus) return null;

    const { status, isActive } = subscriptionStatus;

    if (status === 'trial') {
      return <Badge className="bg-green-500">Free Trial</Badge>;
    }
    if (status === 'active') {
      return <Badge className="bg-blue-500">Active</Badge>;
    }
    if (status === 'suspended') {
      return <Badge variant="destructive">Suspended</Badge>;
    }
    if (status === 'cancelled') {
      return <Badge variant="outline">Cancelled</Badge>;
    }

    return null;
  };

  const getTrialProgress = () => {
    if (!subscriptionStatus || subscriptionStatus.status !== 'trial') return 0;

    const totalTrialDays = 30;
    const remainingDays = subscriptionStatus.daysUntilBilling;
    const usedDays = totalTrialDays - remainingDays;

    return (usedDays / totalTrialDays) * 100;
  };

  if (!restaurantId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">No Restaurant Selected</h2>
            <p className="text-muted-foreground">Please select a restaurant to view subscription details.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2 text-destructive">Error Loading Subscription</h2>
            <p className="text-muted-foreground">Failed to load subscription details. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  const currentPlan = getCurrentPlan();

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Subscription Management</h1>
        <p className="text-muted-foreground text-lg">
          Manage your RestoHand subscription and billing
        </p>
      </div>

      {/* Current Subscription Status */}
      {subscriptionStatus && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${currentPlan?.color || 'from-gray-500 to-gray-600'} text-white`}>
                    {currentPlan?.icon}
                  </div>
                  <div>
                    <CardTitle className="text-2xl">
                      {currentPlan?.name} Plan
                    </CardTitle>
                    <CardDescription className="text-lg">
                      ₹{subscriptionStatus.monthlyPrice / 100}
                      {subscriptionStatus.billingCycle ? `/${subscriptionStatus.billingCycle.slice(0, -2)}` : '/month'}
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge()}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {subscriptionStatus.status === 'trial' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Free Trial Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {subscriptionStatus.daysUntilBilling} days remaining
                    </span>
                  </div>
                  <Progress value={getTrialProgress()} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    Your trial ends on {new Date(subscriptionStatus.trialEndsAt).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-900">Next Billing</p>
                    <p className="text-sm text-blue-700">
                      {new Date(subscriptionStatus.nextBillingDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">Direct Settlement</p>
                    <p className="text-sm text-green-700">100% to your account</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-semibold text-purple-900">Status</p>
                    <p className="text-sm text-purple-700 capitalize">
                      {subscriptionStatus.status}
                    </p>
                  </div>
                </div>
              </div>

              {subscriptionStatus.status === 'trial' && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-amber-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-amber-800">Trial Period Active</h4>
                        <p className="text-sm text-amber-700">
                          You're currently on a free trial. Upgrade to continue using RestoHand
                          after your trial ends in {subscriptionStatus.daysUntilBilling} days.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Available Plans */}
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Choose Your Plan</h2>
          <p className="text-muted-foreground">
            Upgrade or change your plan anytime
          </p>

          {/* Billing Cycle Selector */}
          <div className="flex items-center justify-center">
            <div className="grid grid-cols-4 gap-2 p-2 bg-muted rounded-lg">
              {billingCycles.map((cycle) => (
                <Button
                  key={cycle.id}
                  variant={selectedBillingCycle === cycle.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedBillingCycle(cycle.id)}
                  className="relative"
                >
                  {cycle.name}
                  {cycle.badge && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {cycle.badge}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Test Subscription Section */}
          {(selectedBillingCycle === 'hourly' || selectedBillingCycle === 'daily') && (
            <Card className="border-orange-200 bg-orange-50 max-w-2xl mx-auto">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <Zap className="h-5 w-5 text-orange-600" />
                    <h3 className="font-bold text-orange-800">Test Mode</h3>
                  </div>
                  <p className="text-sm text-orange-700">
                    {selectedBillingCycle === 'hourly'
                      ? 'Hourly billing for quick testing - perfect for development and demo purposes.'
                      : 'Daily billing for short-term testing - ideal for evaluating features.'}
                  </p>
                  <Button
                    onClick={() => handleInitializeTest('starter', selectedBillingCycle)}
                    disabled={isInitializing}
                    variant="outline"
                    className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  >
                    {isInitializing ? 'Initializing...' : `Initialize ${selectedBillingCycle.charAt(0).toUpperCase() + selectedBillingCycle.slice(1)} Test Subscription`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={`relative transition-all hover:shadow-lg ${
                  subscriptionStatus?.plan === plan.id
                    ? 'ring-2 ring-primary border-primary'
                    : ''
                } ${plan.popular ? 'border-purple-200' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-purple-500">Most Popular</Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className={`w-12 h-12 mx-auto rounded-lg bg-gradient-to-r ${plan.color} text-white flex items-center justify-center mb-4`}>
                    {plan.icon}
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold">
                    ₹{plan.prices[selectedBillingCycle]}
                    <span className="text-sm font-normal text-muted-foreground">
                      {billingCycles.find(c => c.id === selectedBillingCycle)?.suffix}
                    </span>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {subscriptionStatus?.plan === plan.id && subscriptionStatus?.billingCycle === selectedBillingCycle ? (
                    <Button disabled className="w-full">
                      Current Plan
                    </Button>
                  ) : (selectedBillingCycle === 'hourly' || selectedBillingCycle === 'daily') ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => handleInitializeTest(plan.id as 'starter' | 'pro' | 'enterprise', selectedBillingCycle)}
                      disabled={isInitializing}
                    >
                      {isInitializing ? 'Initializing...' : `Test ${plan.name}`}
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={plan.popular ? 'default' : 'outline'}
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={isUpgrading}
                    >
                      {isUpgrading ? 'Processing...' :
                       subscriptionStatus && plans.findIndex(p => p.id === subscriptionStatus.plan) < plans.findIndex(p => p.id === plan.id)
                         ? 'Upgrade' : 'Change Plan'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Zap className="h-6 w-6 text-green-600" />
              <h3 className="text-xl font-bold text-green-800">SaaS Benefits</h3>
            </div>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="font-semibold text-green-800">Keep 100% Revenue</p>
                <p className="text-sm text-green-700">No commission on orders</p>
              </div>
              <div>
                <p className="font-semibold text-green-800">Direct Settlement</p>
                <p className="text-sm text-green-700">Money goes straight to your account</p>
              </div>
              <div>
                <p className="font-semibold text-green-800">Predictable Costs</p>
                <p className="text-sm text-green-700">Fixed monthly pricing</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Policy Links Section */}
      <div className="text-center space-y-4 mt-8 pt-8 border-t border-border/60">
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>By subscribing, you agree to our</span>
          <Link to="/terms-conditions" className="text-primary hover:underline">
            Terms & Conditions
          </Link>
          <span>•</span>
          <Link to="/privacy-policy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link to="/refund-policy" className="text-primary hover:underline">
            Refund Policy
          </Link>
        </div>
        <div className="text-xs text-muted-foreground">
          Questions? <Link to="/contact-us" className="text-primary hover:underline">Contact our support team</Link>
        </div>
      </div>
    </div>
  );
}