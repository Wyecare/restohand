import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  UtensilsCrossed,
  Users,
  Globe,
  Shield,
  Zap,
  TrendingUp,
  CheckCircle,
  MapPin,
  Mail
} from 'lucide-react';

const AboutUsPage = () => {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">About Restohand</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Empowering restaurants across India with intelligent technology solutions
            for seamless operations, enhanced customer experiences, and sustainable growth.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Company Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Restohand is India's leading restaurant management platform, designed to
                transform how restaurants operate in the digital age. We provide comprehensive
                SaaS solutions that streamline operations, boost efficiency, and enhance
                customer satisfaction.
              </p>
              <p>
                Our mission is to democratize restaurant technology, making powerful management
                tools accessible to businesses of all sizes - from family-owned eateries to
                multi-location restaurant chains.
              </p>
            </CardContent>
          </Card>

          {/* What We Do */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                What We Do
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                We offer a complete restaurant management ecosystem that covers every aspect
                of restaurant operations - from menu management and inventory tracking to
                order processing and payment integration.
              </p>
              <p>
                Our platform integrates seamlessly with popular payment gateways like Razorpay,
                ensuring secure transactions and compliance with Indian financial regulations.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Key Features */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-center">Platform Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <UtensilsCrossed className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Menu Management</h3>
                <p className="text-sm text-muted-foreground">
                  Dynamic menu creation with categories, pricing, and real-time updates
                </p>
              </div>

              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Order Management</h3>
                <p className="text-sm text-muted-foreground">
                  Streamlined order processing with kitchen workflow and real-time tracking
                </p>
              </div>

              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Staff Management</h3>
                <p className="text-sm text-muted-foreground">
                  Role-based access control for managers, chefs, waiters, and cashiers
                </p>
              </div>

              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Payment Processing</h3>
                <p className="text-sm text-muted-foreground">
                  Secure Razorpay integration with UPI, cards, and digital wallets
                </p>
              </div>

              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">GST Compliance</h3>
                <p className="text-sm text-muted-foreground">
                  Automated GST calculations and compliant invoicing system
                </p>
              </div>

              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Multi-Language</h3>
                <p className="text-sm text-muted-foreground">
                  Support for English and Malayalam with more languages coming soon
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Plans */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-center">Subscription Plans</CardTitle>
            <p className="text-center text-muted-foreground">
              Flexible pricing designed for restaurants of all sizes
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-4 p-6 border rounded-lg">
                <Badge variant="outline">Starter</Badge>
                <div>
                  <div className="text-2xl font-bold">₹999</div>
                  <div className="text-sm text-muted-foreground">/month</div>
                </div>
                <p className="text-sm">Perfect for small restaurants with up to 50 orders per day</p>
              </div>

              <div className="text-center space-y-4 p-6 border rounded-lg border-primary">
                <Badge>Pro</Badge>
                <div>
                  <div className="text-2xl font-bold">₹1,999</div>
                  <div className="text-sm text-muted-foreground">/month</div>
                </div>
                <p className="text-sm">Ideal for growing businesses with unlimited orders and advanced features</p>
              </div>

              <div className="text-center space-y-4 p-6 border rounded-lg">
                <Badge variant="outline">Enterprise</Badge>
                <div>
                  <div className="text-2xl font-bold">₹4,999</div>
                  <div className="text-sm text-muted-foreground">/month</div>
                </div>
                <p className="text-sm">Complete solution with custom integrations and white-label options</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>Why Choose Restohand?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-medium">30-Day Free Trial</h4>
                  <p className="text-sm text-muted-foreground">
                    Try all features risk-free before committing to a plan
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-medium">Direct Settlement</h4>
                  <p className="text-sm text-muted-foreground">
                    Payments go directly to your bank account with T+1 settlement
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-medium">24/7 Support</h4>
                  <p className="text-sm text-muted-foreground">
                    Dedicated customer support to help you succeed
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-medium">No Commission</h4>
                  <p className="text-sm text-muted-foreground">
                    Keep 100% of your revenue with fixed monthly pricing
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Email Support</p>
                  <p className="text-sm text-muted-foreground">admin@wyecaresolutions.com</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Company</p>
                  <p className="text-sm text-muted-foreground">
                    Wyecare Solutions<br />
                    Serving restaurants across India
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Coverage</p>
                  <p className="text-sm text-muted-foreground">
                    Available nationwide with local language support
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center py-8 border-t border-border/60">
          <p className="text-muted-foreground">
            © 2024 Restohand by Wyecare Solutions. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Empowering restaurants with technology since 2024
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutUsPage;