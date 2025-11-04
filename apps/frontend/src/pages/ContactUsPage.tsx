import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, Phone, MapPin, Clock, MessageSquare } from 'lucide-react';

const ContactUsPage = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    alert(
      'Thank you for your message! We will get back to you within 24 hours.'
    );
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Have questions about RestoHand? We're here to help! Reach out to our
            team and we'll get back to you as soon as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Get in Touch
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Email Support</p>
                    <p className="text-muted-foreground">
                      admin@wyecaresolutions.com
                    </p>
                    <p className="text-sm text-muted-foreground">
                      For general support and inquiries
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Sales & Business</p>
                    <p className="text-muted-foreground">
                      admin@wyecaresolutions.com
                    </p>
                    <p className="text-sm text-muted-foreground">
                      For new subscriptions and partnerships
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Phone Support</p>
                    <p className="text-muted-foreground">+91 9037495218</p>
                    <p className="text-sm text-muted-foreground">
                      Monday-Friday, 9:00 AM - 6:00 PM IST
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Office Address</p>
                    <p className="text-muted-foreground">
                      Kottayam, Kerala, India
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Headquarters and development center
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Response Time</p>
                    <p className="text-muted-foreground">Within 24 hours</p>
                    <p className="text-sm text-muted-foreground">
                      We typically respond much faster!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Support Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium">Technical Support</h4>
                    <p className="text-sm text-muted-foreground">
                      Platform issues, login problems, feature assistance
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium">Billing & Subscriptions</h4>
                    <p className="text-sm text-muted-foreground">
                      Payment questions, plan changes, invoices
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium">Setup & Onboarding</h4>
                    <p className="text-sm text-muted-foreground">
                      Getting started, restaurant setup, staff training
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium">Integration Support</h4>
                    <p className="text-sm text-muted-foreground">
                      Payment setup, third-party integrations, API support
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>Send us a Message</CardTitle>
              <p className="text-muted-foreground">
                Fill out the form below and we'll get back to you promptly.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      placeholder="Enter your first name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      placeholder="Enter your last name"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="restaurantName">Restaurant Name</Label>
                  <Input
                    id="restaurantName"
                    placeholder="Enter your restaurant name (if applicable)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    placeholder="Brief description of your inquiry"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    className="w-full p-2 border border-input rounded-md bg-background"
                  >
                    <option value="none">Select a category</option>
                    <option value="technical">Technical Support</option>
                    <option value="billing">Billing & Subscriptions</option>
                    <option value="setup">Setup & Onboarding</option>
                    <option value="integration">Integration Support</option>
                    <option value="sales">Sales Inquiry</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    placeholder="Please describe your question or issue in detail..."
                    rows={6}
                    required
                  />
                </div>

                <Button type="submit" className="w-full">
                  Send Message
                </Button>

                <p className="text-sm text-muted-foreground text-center">
                  By submitting this form, you agree to our Privacy Policy and
                  Terms of Service.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">
                  How quickly can I get started?
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  You can start your 30-day free trial immediately. Setup
                  typically takes 15-30 minutes with our guided onboarding
                  process.
                </p>

                <h4 className="font-medium mb-2">Is there a setup fee?</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  No setup fees! Our plans include everything you need to get
                  started, including onboarding support and training.
                </p>

                <h4 className="font-medium mb-2">Can I cancel anytime?</h4>
                <p className="text-sm text-muted-foreground">
                  Yes, you can cancel your subscription at any time. There are
                  no long-term contracts or cancellation fees.
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">
                  Do you take commission on orders?
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  No! We only charge a fixed monthly subscription fee. 100% of
                  your customer payments go directly to your bank account.
                </p>

                <h4 className="font-medium mb-2">
                  What payment methods do you support?
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  We support UPI, cards, net banking, and wallets through our
                  Razorpay integration. All payments are processed securely.
                </p>

                <h4 className="font-medium mb-2">Do you provide training?</h4>
                <p className="text-sm text-muted-foreground">
                  Yes! We provide comprehensive onboarding and training for you
                  and your staff. Our support team is always available to help.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContactUsPage;
