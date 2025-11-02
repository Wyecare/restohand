import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const RefundPolicyPage = () => {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">
              Refund and Cancellation Policy
            </CardTitle>
            <p className="text-center text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-IN')}
            </p>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <div className="space-y-6">
              <section>
                <h2 className="text-2xl font-semibold mb-3">1. Overview</h2>
                <p>
                  This Refund and Cancellation Policy outlines the terms for refunds and cancellations
                  related to RestoHand's restaurant management platform services. This policy covers
                  both subscription services and customer orders processed through our platform.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">2. RestoHand Subscription Refunds</h2>

                <h3 className="text-xl font-medium mb-2">2.1 Free Trial Period</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li>All new restaurants receive a 30-day free trial</li>
                  <li>No charges during trial period</li>
                  <li>Cancel anytime during trial with no charges</li>
                  <li>Full access to platform features during trial</li>
                </ul>

                <h3 className="text-xl font-medium mb-2">2.2 Subscription Cancellation</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li>Restaurants may cancel their subscription at any time</li>
                  <li>Cancellation takes effect at the end of the current billing period</li>
                  <li>Access to platform continues until the end of paid period</li>
                  <li>No automatic renewal after cancellation</li>
                </ul>

                <h3 className="text-xl font-medium mb-2">2.3 Subscription Refund Policy</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li><strong>No Refunds:</strong> Subscription fees are generally non-refundable</li>
                  <li><strong>Exceptional Cases:</strong> Refunds may be considered for:
                    <ul className="list-disc pl-6 mt-2">
                      <li>Technical issues preventing platform use for extended periods</li>
                      <li>Billing errors or duplicate charges</li>
                      <li>Service not delivered as described</li>
                    </ul>
                  </li>
                  <li><strong>Refund Process:</strong> Contact support within 7 days of billing</li>
                  <li><strong>Prorated Refunds:</strong> May be provided for downgrades mid-billing cycle</li>
                </ul>

                <h3 className="text-xl font-medium mb-2">2.4 Involuntary Cancellation</h3>
                <ul className="list-disc pl-6">
                  <li>Non-payment: 15-day grace period before service suspension</li>
                  <li>Terms violation: Immediate suspension with opportunity to rectify</li>
                  <li>Partial refunds may be provided depending on circumstances</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">3. Customer Order Refunds</h2>
                <p className="mb-3">
                  <strong>Important:</strong> RestoHand facilitates payment processing but does not
                  handle customer payments directly. All order payments go directly to restaurant
                  bank accounts.
                </p>

                <h3 className="text-xl font-medium mb-2">3.1 Order Cancellation Before Preparation</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li>Customers may request cancellation before order preparation begins</li>
                  <li>Restaurant has discretion to accept or decline cancellation requests</li>
                  <li>If accepted, restaurant is responsible for processing refund</li>
                  <li>RestoHand platform will update order status accordingly</li>
                </ul>

                <h3 className="text-xl font-medium mb-2">3.2 Order Issues and Refunds</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li>Food quality issues, wrong orders, or missing items</li>
                  <li>Customer must contact restaurant directly for resolution</li>
                  <li>Restaurant determines appropriate remedy (refund, replacement, credit)</li>
                  <li>Refunds are processed by restaurant, not RestoHand</li>
                </ul>

                <h3 className="text-xl font-medium mb-2">3.3 Payment Disputes</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li>Payment disputes should be raised with the restaurant first</li>
                  <li>If unresolved, customers may contact Razorpay (payment processor)</li>
                  <li>RestoHand can provide transaction details and order information</li>
                  <li>Final dispute resolution handled by payment processor</li>
                </ul>

                <h3 className="text-xl font-medium mb-2">3.4 RestoHand's Role in Order Disputes</h3>
                <ul className="list-disc pl-6">
                  <li>Provide order details and transaction records</li>
                  <li>Facilitate communication between customer and restaurant</li>
                  <li>Update order status based on restaurant confirmation</li>
                  <li>Does not process refunds or handle payment disputes directly</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">4. Refund Processing</h2>

                <h3 className="text-xl font-medium mb-2">4.1 Subscription Refunds (when applicable)</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li>Processed within 7-10 business days</li>
                  <li>Refunded to original payment method</li>
                  <li>Partial refunds calculated on prorated basis</li>
                  <li>Email confirmation sent upon processing</li>
                </ul>

                <h3 className="text-xl font-medium mb-2">4.2 Order Refunds (by restaurants)</h3>
                <ul className="list-disc pl-6">
                  <li>Refund method and timeline determined by restaurant</li>
                  <li>May be processed as cash refund, bank transfer, or payment reversal</li>
                  <li>Customers should confirm refund method with restaurant</li>
                  <li>RestoHand platform updates order status when notified</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">5. Data Retention After Cancellation</h2>
                <ul className="list-disc pl-6">
                  <li>Restaurant data available for download for 30 days after cancellation</li>
                  <li>Order and transaction records retained for 7 years (tax compliance)</li>
                  <li>Personal data deleted after retention period except legal requirements</li>
                  <li>Account reactivation possible within 30 days with full data restoration</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">6. Service Credits</h2>
                <ul className="list-disc pl-6">
                  <li>Service credits may be offered for significant platform downtime</li>
                  <li>Credits applied to next billing cycle automatically</li>
                  <li>Credits expire if subscription is cancelled</li>
                  <li>Cannot be converted to cash refunds</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">7. Force Majeure</h2>
                <p>
                  No refunds for service interruptions due to circumstances beyond our control,
                  including but not limited to natural disasters, government actions, internet
                  outages, or third-party service failures.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">8. Modification of Policy</h2>
                <p>
                  This refund policy may be updated from time to time. Changes will be communicated
                  to active subscribers via email and platform notifications. Continued use of
                  services constitutes acceptance of updated policy.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">9. How to Request Refunds</h2>

                <h3 className="text-xl font-medium mb-2">9.1 Subscription Refunds</h3>
                <ol className="list-decimal pl-6 mb-4">
                  <li>Contact our support team with your restaurant ID and billing details</li>
                  <li>Provide reason for refund request with supporting documentation</li>
                  <li>Our team will review the request within 3-5 business days</li>
                  <li>Receive confirmation and timeline for processing if approved</li>
                </ol>

                <h3 className="text-xl font-medium mb-2">9.2 Order Refunds</h3>
                <ol className="list-decimal pl-6">
                  <li>Contact the restaurant directly using provided contact information</li>
                  <li>Provide order number and details of the issue</li>
                  <li>Work with restaurant for resolution</li>
                  <li>Contact RestoHand support if restaurant is unresponsive</li>
                </ol>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">10. Contact Information</h2>
                <p>For refund requests or questions about this policy:</p>
                <div className="bg-muted p-4 rounded-lg mt-3">
                  <p><strong>RestoHand Support</strong></p>
                  <p>Email: support@restohand.com</p>
                  <p>Phone: +91-8129639999</p>
                  <p>Business Hours: Monday-Friday, 9:00 AM - 6:00 PM IST</p>
                  <p>Response Time: Within 24 hours</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">11. Consumer Rights</h2>
                <p>
                  This policy does not affect your statutory rights as a consumer under Indian
                  consumer protection laws. You may have additional rights under applicable
                  consumer protection legislation.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RefundPolicyPage;