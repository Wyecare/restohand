import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { useGetSubscriptionStatusQuery, useUpgradeSubscriptionMutation } from '@/store/api/subscriptionsApi';
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
    price: 999,
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
    price: 1999,
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
    price: 4999,
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

export default function SubscriptionPage() {
  const { toast } = useToast();
  const restaurantId = useAppSelector(selectActiveRestaurantId);

  const {
    data: subscriptionStatus,
    isLoading,
    error: fetchError,
  } = useGetSubscriptionStatusQuery(restaurantId!, {
    skip: !restaurantId,
  });

  const [upgradeSubscription, { isLoading: isUpgrading }] = useUpgradeSubscriptionMutation();

  const handleUpgrade = async (newPlan: string) => {
    if (!restaurantId) return;

    try {
      await upgradeSubscription({
        restaurantId,
        data: { plan: newPlan as 'starter' | 'pro' | 'enterprise' },
      }).unwrap();

      toast({
        title: 'Plan upgraded successfully!',
        description: `You've been upgraded to the ${newPlan} plan.`,
      });
    } catch (error) {
      toast({
        title: 'Upgrade failed',
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
                      ₹{subscriptionStatus.monthlyPrice / 100}/month
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
        <div className="text-center">
          <h2 className="text-3xl font-bold">Choose Your Plan</h2>
          <p className="text-muted-foreground">
            Upgrade or change your plan anytime
          </p>
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
                    ₹{plan.price}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
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

                  {subscriptionStatus?.plan === plan.id ? (
                    <Button disabled className="w-full">
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={plan.popular ? 'default' : 'outline'}
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={isUpgrading}
                    >
                      {isUpgrading ? 'Upgrading...' :
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
    </div>
  );
}