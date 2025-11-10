import React, { useState } from 'react';
import {
  useGetSubscriptionStatusQuery,
  useCreateSubscriptionMutation,
  useReactivateSubscriptionMutation,
  useGetPaymentHistoryQuery
} from '../store/api/subscriptionsApi';
import { useAppSelector } from '../store/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  CreditCard,
  Calendar,
  CheckCircle,
  AlertCircle,
  Crown,
  Clock,
  Receipt,
  Zap,
  Shield,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

const SubscriptionPage: React.FC = () => {
  const { toast } = useToast();
  const user = useAppSelector((state) => state.auth.user);
  const [isCreating, setIsCreating] = useState(false);

  const {
    data: subscriptionData,
    isLoading: isLoadingStatus,
    refetch: refetchStatus
  } = useGetSubscriptionStatusQuery(user?.restaurantId || '', {
    skip: !user?.restaurantId,
  });

  const { data: paymentHistory } = useGetPaymentHistoryQuery(user?.restaurantId || '', {
    skip: !user?.restaurantId,
  });

  const [createSubscription] = useCreateSubscriptionMutation();
  const [reactivateSubscription] = useReactivateSubscriptionMutation();

  const handleCreateSubscription = async () => {
    if (!user?.restaurantId) {
      toast({
        title: 'Error',
        description: 'Restaurant ID not found',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      await createSubscription(user.restaurantId).unwrap();
      toast({
        title: 'Success',
        description: 'Subscription created successfully!',
      });
      refetchStatus();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.data?.message || 'Failed to create subscription',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleReactivate = async () => {
    if (!user?.restaurantId) return;

    try {
      await reactivateSubscription(user.restaurantId).unwrap();
      toast({
        title: 'Success',
        description: 'Subscription reactivated successfully!',
      });
      refetchStatus();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.data?.message || 'Failed to reactivate subscription',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'suspended':
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'trial':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoadingStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isSubscribed = subscriptionData?.isActive;
  const nextBillingDate = subscriptionData?.nextBillingDate ? new Date(subscriptionData.nextBillingDate) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            RestoHand Subscription
          </h1>
          <p className="text-lg text-gray-600">
            Powerful restaurant management made simple
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px] mx-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Current Plan */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    Current Plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isSubscribed ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">RestoHand Standard</h3>
                          <p className="text-gray-600">Full-featured restaurant management</p>
                        </div>
                        <Badge className={getStatusColor(subscriptionData?.status || '')}>
                          {subscriptionData?.status?.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500">Monthly Price</p>
                          <p className="text-2xl font-bold text-gray-900">₹799</p>
                        </div>
                        {nextBillingDate && (
                          <div className="space-y-1">
                            <p className="text-sm text-gray-500">Next Billing</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {format(nextBillingDate, 'MMM d, yyyy')}
                            </p>
                          </div>
                        )}
                      </div>

                      {subscriptionData?.razorpaySubscription && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="font-medium text-green-800">Razorpay Subscription Active</span>
                          </div>
                          <p className="text-sm text-green-700">
                            ID: {subscriptionData.razorpaySubscription.id}
                          </p>
                        </div>
                      )}

                      {(subscriptionData?.status === 'suspended' || subscriptionData?.status === 'cancelled') && (
                        <Button
                          onClick={handleReactivate}
                          className="w-full"
                          variant="default"
                        >
                          Reactivate Subscription
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        No Active Subscription
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Subscribe to RestoHand to unlock powerful restaurant management features
                      </p>
                      <Button
                        onClick={handleCreateSubscription}
                        disabled={isCreating}
                        className="bg-blue-600 hover:bg-blue-700"
                        size="lg"
                      >
                        {isCreating ? 'Creating...' : 'Subscribe Now - ₹799/month'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Days Until Billing</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {subscriptionData?.daysUntilBilling || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Zap className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Plan Type</p>
                        <p className="text-lg font-semibold text-gray-900">Standard</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentHistory?.subscription ? (
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Subscription</span>
                        <Badge className={getStatusColor(paymentHistory.subscription.status)}>
                          {paymentHistory.subscription.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>ID: {paymentHistory.subscription.id}</p>
                        <p>Plan: {paymentHistory.subscription.plan_id}</p>
                        <p>Created: {format(new Date(paymentHistory.subscription.created_at * 1000), 'PPP')}</p>
                      </div>
                    </div>

                    {paymentHistory.payments.length === 0 && (
                      <p className="text-center text-gray-500 py-4">
                        No payment history available yet
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    No billing information available
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* Core Features */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Staff Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Staff roles & permissions</li>
                    <li>• Invitation management</li>
                    <li>• Activity tracking</li>
                    <li>• Performance analytics</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-green-600" />
                    Order Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Real-time order tracking</li>
                    <li>• Kitchen display system</li>
                    <li>• Order history & analytics</li>
                    <li>• Customer communication</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-600" />
                    Security & Reports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Advanced security features</li>
                    <li>• Detailed reporting</li>
                    <li>• Data export capabilities</li>
                    <li>• Compliance tools</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-yellow-600" />
                    Payment Processing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Multiple payment methods</li>
                    <li>• Secure transactions</li>
                    <li>• Automated billing</li>
                    <li>• Financial reporting</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-red-600" />
                    24/7 Support
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Round-the-clock assistance</li>
                    <li>• Technical support</li>
                    <li>• Feature training</li>
                    <li>• Priority response</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-orange-600" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Lightning-fast interface</li>
                    <li>• Real-time updates</li>
                    <li>• Cloud-based reliability</li>
                    <li>• Automatic backups</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Bottom CTA */}
        {!isSubscribed && (
          <Card className="mt-8 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-2">Ready to get started?</h2>
              <p className="text-blue-100 mb-6">
                Join thousands of restaurants using RestoHand to streamline their operations
              </p>
              <Button
                onClick={handleCreateSubscription}
                disabled={isCreating}
                size="lg"
                variant="secondary"
                className="bg-white text-blue-600 hover:bg-gray-100"
              >
                {isCreating ? 'Creating Subscription...' : 'Start Your Subscription - ₹799/month'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPage;