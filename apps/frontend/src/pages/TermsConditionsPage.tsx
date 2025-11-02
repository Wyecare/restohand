import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TermsConditionsPage = () => {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">
              Terms and Conditions
            </CardTitle>
            <p className="text-center text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-IN')}
            </p>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <div className="space-y-6">
              <section>
                <h2 className="text-2xl font-semibold mb-3">1. Agreement to Terms</h2>
                <p>
                  By accessing or using RestoHand's restaurant management platform and services,
                  you agree to be bound by these Terms and Conditions ("Terms"). If you disagree
                  with any part of these terms, you may not access or use our services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">2. Description of Services</h2>
                <p>RestoHand provides a comprehensive restaurant management platform that includes:</p>
                <ul className="list-disc pl-6">
                  <li>Order management and processing system</li>
                  <li>Menu and inventory management</li>
                  <li>Staff management with role-based access control</li>
                  <li>Payment processing integration via Razorpay</li>
                  <li>GST-compliant invoicing and tax management</li>
                  <li>Real-time analytics and reporting</li>
                  <li>Customer-facing ordering interface</li>
                  <li>Multi-language support (English and Malayalam)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">3. Subscription Plans and Pricing</h2>
                <p>RestoHand operates on a Software-as-a-Service (SaaS) subscription model:</p>

                <h3 className="text-xl font-medium mb-2">3.1 Subscription Tiers</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li><strong>Starter Plan:</strong> ₹999/month - Up to 50 orders per day, basic features</li>
                  <li><strong>Pro Plan:</strong> ₹1,999/month - Unlimited orders, advanced features, multi-location support</li>
                  <li><strong>Enterprise Plan:</strong> ₹4,999/month - Custom integrations, white-label options</li>
                </ul>

                <h3 className="text-xl font-medium mb-2">3.2 Payment Model</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li>RestoHand charges fixed monthly subscription fees only</li>
                  <li>We do NOT charge commission on customer orders</li>
                  <li>100% of customer payments go directly to restaurant bank accounts</li>
                  <li>All subscription fees are billed monthly in advance</li>
                </ul>

                <h3 className="text-xl font-medium mb-2">3.3 Free Trial</h3>
                <ul className="list-disc pl-6">
                  <li>New restaurants receive a 30-day free trial</li>
                  <li>Full access to platform features during trial period</li>
                  <li>No payment required to start trial</li>
                  <li>Subscription begins automatically after trial unless cancelled</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">4. User Responsibilities</h2>

                <h3 className="text-xl font-medium mb-2">4.1 Restaurant Operators</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li>Provide accurate business information and documentation</li>
                  <li>Maintain valid business licenses and compliance with local regulations</li>
                  <li>Ensure staff members use appropriate access levels and maintain security</li>
                  <li>Keep menu information, pricing, and availability updated</li>
                  <li>Verify payment receipts and confirm order payments</li>
                  <li>Comply with GST and tax regulations</li>
                </ul>

                <h3 className="text-xl font-medium mb-2">4.2 Staff Members</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li>Use assigned access credentials responsibly</li>
                  <li>Maintain confidentiality of business information</li>
                  <li>Follow proper order processing procedures</li>
                  <li>Report technical issues promptly</li>
                </ul>

                <h3 className="text-xl font-medium mb-2">4.3 Customers</h3>
                <ul className="list-disc pl-6">
                  <li>Provide accurate order information</li>
                  <li>Complete payments for placed orders</li>
                  <li>Respect restaurant policies and staff</li>
                  <li>Use the platform only for legitimate food ordering</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">5. Payment Processing</h2>

                <h3 className="text-xl font-medium mb-2">5.1 Payment Infrastructure</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li>All payments are processed through Razorpay, our authorized payment partner</li>
                  <li>Customer payments are settled directly to restaurant bank accounts</li>
                  <li>RestoHand does not handle, store, or process customer payment information</li>
                  <li>UPI, cards, and other payment methods supported as per Razorpay capabilities</li>
                </ul>

                <h3 className="text-xl font-medium mb-2">5.2 Payment Verification</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li>Restaurants are responsible for verifying payment receipt</li>
                  <li>Order fulfillment should be confirmed only after payment verification</li>
                  <li>RestoHand provides payment status updates but restaurants must verify independently</li>
                </ul>

                <h3 className="text-xl font-medium mb-2">5.3 Subscription Billing</h3>
                <ul className="list-disc pl-6">
                  <li>Subscription fees are charged monthly in advance</li>
                  <li>Failed payments may result in service suspension</li>
                  <li>Restaurants will receive advance notice before service suspension</li>
                  <li>All fees are exclusive of applicable taxes</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">6. Data and Privacy</h2>
                <ul className="list-disc pl-6">
                  <li>Restaurant data remains the property of the restaurant</li>
                  <li>RestoHand implements industry-standard security measures</li>
                  <li>Data is stored on secure cloud infrastructure</li>
                  <li>Detailed privacy practices are outlined in our Privacy Policy</li>
                  <li>Restaurants can export their data upon request</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">7. Service Availability</h2>
                <ul className="list-disc pl-6">
                  <li>We strive for 99.9% uptime but cannot guarantee uninterrupted service</li>
                  <li>Planned maintenance will be communicated in advance</li>
                  <li>Emergency maintenance may occur without notice</li>
                  <li>Service level agreements are outlined in enterprise contracts</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">8. Intellectual Property</h2>
                <ul className="list-disc pl-6">
                  <li>RestoHand platform and software remain our intellectual property</li>
                  <li>Restaurants retain ownership of their business data and content</li>
                  <li>Restaurants grant us license to use their data for service provision</li>
                  <li>No reverse engineering or copying of platform software is permitted</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">9. Limitation of Liability</h2>
                <ul className="list-disc pl-6">
                  <li>RestoHand's liability is limited to the amount of subscription fees paid</li>
                  <li>We are not liable for business losses, lost profits, or consequential damages</li>
                  <li>Restaurants are responsible for order fulfillment and customer service</li>
                  <li>Payment processing issues should be addressed with Razorpay directly</li>
                  <li>Force majeure events are excluded from liability</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">10. Termination</h2>

                <h3 className="text-xl font-medium mb-2">10.1 Termination by Restaurant</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li>Restaurants may cancel subscription at any time</li>
                  <li>Cancellation takes effect at the end of current billing period</li>
                  <li>No refunds for unused portions of subscription periods</li>
                  <li>Data export available for 30 days after cancellation</li>
                </ul>

                <h3 className="text-xl font-medium mb-2">10.2 Termination by RestoHand</h3>
                <ul className="list-disc pl-6">
                  <li>We may terminate for breach of terms with 30 days notice</li>
                  <li>Immediate termination for illegal activities or security violations</li>
                  <li>Refunds may be provided on a case-by-case basis</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">11. Compliance and Legal</h2>
                <ul className="list-disc pl-6">
                  <li>Restaurants must comply with local food safety and business regulations</li>
                  <li>GST compliance and tax reporting are restaurant responsibilities</li>
                  <li>RestoHand provides tools to support compliance but is not responsible for violations</li>
                  <li>These terms are governed by Indian law</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">12. Updates to Terms</h2>
                <p>
                  We may update these Terms from time to time. Material changes will be
                  communicated via email or platform notifications. Continued use of our
                  services after changes constitutes acceptance of updated terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">13. Contact Information</h2>
                <p>For questions about these Terms and Conditions, please contact us:</p>
                <div className="bg-muted p-4 rounded-lg mt-3">
                  <p><strong>RestoHand</strong></p>
                  <p>Email: legal@restohand.com</p>
                  <p>Phone: +91-8129639999</p>
                  <p>Address: Kochi, Kerala, India</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">14. Dispute Resolution</h2>
                <p>
                  Any disputes arising from these terms will be resolved through arbitration
                  in Kochi, Kerala, India, in accordance with the Arbitration and Conciliation
                  Act, 2015. The language of arbitration shall be English.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsConditionsPage;