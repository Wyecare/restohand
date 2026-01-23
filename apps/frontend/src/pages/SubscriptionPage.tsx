import React, { useState } from 'react';
import {
  useGetSubscriptionStatusQuery,
  useCreateSubscriptionMutation,
  useReactivateSubscriptionMutation,
  useGetPaymentHistoryQuery,
} from '../store/api/subscriptionsApi';
import { useAppSelector } from '../store/hooks';
import {
  selectActiveRestaurantId,
  selectAuthSession,
} from '../store/slices/authSlice';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
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
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

const SubscriptionPage: React.FC = () => {
  const { toast } = useToast();
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const session = useAppSelector(selectAuthSession);
  const [isCreating, setIsCreating] = useState(false);

  const {
    data: subscriptionData,
    isLoading: isLoadingStatus,
    refetch: refetchStatus,
  } = useGetSubscriptionStatusQuery(restaurantId || '', {
    skip: !restaurantId,
  });

  const { data: paymentHistory } = useGetPaymentHistoryQuery(
    restaurantId || '',
    {
      skip: !restaurantId,
    }
  );

  const [createSubscription] = useCreateSubscriptionMutation();
  const [reactivateSubscription] = useReactivateSubscriptionMutation();

  const handleCreateSubscription = async () => {
    if (!restaurantId) {
      toast({
        title: 'Error',
        description: 'Restaurant ID not found',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      await createSubscription(restaurantId).unwrap();
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
    if (!restaurantId) return;

    try {
      await reactivateSubscription(restaurantId).unwrap();
      toast({
        title: 'Success',
        description: 'Subscription reactivated successfully!',
      });
      refetchStatus();
    } catch (error: any) {
      toast({
        title: 'Error',
        description:
          error?.data?.message || 'Failed to reactivate subscription',
        variant: 'destructive',
      });
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'suspended':
      case 'cancelled':
        return 'destructive';
      case 'pending':
        return 'secondary';
      case 'trial':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (isLoadingStatus) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isSubscribed = subscriptionData?.isActive;
  const nextBillingDate = subscriptionData?.nextBillingDate
    ? new Date(subscriptionData.nextBillingDate)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            RestoHand Subscription
          </h1>
          <p className="text-lg text-muted-foreground">
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
                    <Crown className="h-5 w-5 text-primary" />
                    Current Plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isSubscribed ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-foreground">
                            RestoHand Standard
                          </h3>
                          <p className="text-muted-foreground">
                            Full-featured restaurant management
                          </p>
                        </div>
                        <Badge
                          variant={getStatusVariant(
                            subscriptionData?.status || ''
                          )}
                        >
                          {subscriptionData?.status?.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">
                            Monthly Price
                          </p>
                          <p className="text-2xl font-bold text-foreground">
                            ₹799
                          </p>
                        </div>
                        {nextBillingDate && (
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                              Next Billing
                            </p>
                            <p className="text-lg font-semibold text-foreground">
                              {format(nextBillingDate, 'MMM d, yyyy')}
                            </p>
                          </div>
                        )}
                      </div>

                      {subscriptionData?.razorpaySubscription && (
                        <div className="mt-4 p-4 bg-muted border border-border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="font-medium text-foreground">
                              Razorpay Subscription Active
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            ID: {subscriptionData.razorpaySubscription.id}
                          </p>
                        </div>
                      )}

                      {(subscriptionData?.status === 'suspended' ||
                        subscriptionData?.status === 'cancelled') && (
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
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        No Active Subscription
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        Subscribe to RestoHand to unlock powerful restaurant
                        management features
                      </p>
                      <Button
                        onClick={handleCreateSubscription}
                        disabled={isCreating}
                        className="bg-primary hover:bg-primary/90"
                        size="lg"
                      >
                        {isCreating
                          ? 'Creating...'
                          : 'Subscribe Now - ₹799/month'}
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
                      <div className="p-2 bg-muted rounded-lg">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Days Until Billing
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {subscriptionData?.daysUntilBilling || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <Zap className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Plan Type
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          Standard
                        </p>
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
                        <Badge
                          variant={getStatusVariant(
                            paymentHistory.subscription.status
                          )}
                        >
                          {paymentHistory.subscription.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>ID: {paymentHistory.subscription.id}</p>
                        <p>Plan: {paymentHistory.subscription.plan_id}</p>
                        <p>
                          Created:{' '}
                          {format(
                            new Date(
                              paymentHistory.subscription.created_at * 1000
                            ),
                            'PPP'
                          )}
                        </p>
                      </div>
                    </div>

                    {paymentHistory.payments.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        No payment history available yet
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
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
                    <Users className="h-5 w-5 " />
                    Staff Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
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
                  <ul className="space-y-2 text-sm text-muted-foreground">
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
                  <ul className="space-y-2 text-sm text-muted-foreground">
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
                  <ul className="space-y-2 text-sm text-muted-foreground">
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
                  <ul className="space-y-2 text-sm text-muted-foreground">
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
                  <ul className="space-y-2 text-sm text-muted-foreground">
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
          <Card className="mt-8 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-2">Ready to get started?</h2>
              <p className="text-primary-foreground/80 mb-6">
                Join thousands of restaurants using RestoHand to streamline
                their operations
              </p>
              <Button
                onClick={handleCreateSubscription}
                disabled={isCreating}
                size="lg"
                variant="secondary"
                className="bg-background text-foreground hover:bg-muted"
              >
                {isCreating
                  ? 'Creating Subscription...'
                  : 'Start Your Subscription - ₹799/month'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPage;
