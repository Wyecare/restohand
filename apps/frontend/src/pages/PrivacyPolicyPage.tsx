import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">
              Privacy Policy
            </CardTitle>
            <p className="text-center text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-IN')}
            </p>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <div className="space-y-6">
              <section>
                <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
                <p>
                  RestoHand ("we," "our," or "us") is committed to protecting your privacy.
                  This Privacy Policy explains how we collect, use, disclose, and safeguard
                  your information when you use our restaurant management platform and services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">2. Information We Collect</h2>

                <h3 className="text-xl font-medium mb-2">2.1 Restaurant Business Information</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li>Restaurant name, legal business name, and address</li>
                  <li>Contact information (phone, email)</li>
                  <li>GSTIN, PAN numbers for tax compliance</li>
                  <li>Bank account details for direct payment settlement</li>
                  <li>Menu items, pricing, and inventory data</li>
                </ul>

                <h3 className="text-xl font-medium mb-2">2.2 Staff Information</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li>Name, email address, and phone number</li>
                  <li>Google OAuth authentication data</li>
                  <li>Role assignments (owner, manager, chef, waiter, cashier)</li>
                  <li>Login timestamps and activity logs</li>
                </ul>

                <h3 className="text-xl font-medium mb-2">2.3 Customer Information (Optional)</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li>Name and phone number (provided voluntarily during order placement)</li>
                  <li>Table number or takeaway preferences</li>
                  <li>Order details and preferences</li>
                  <li>We do NOT require customer account creation</li>
                </ul>

                <h3 className="text-xl font-medium mb-2">2.4 Payment Information</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li>Payment transaction IDs and status</li>
                  <li>Razorpay order references</li>
                  <li>UPI transaction metadata</li>
                  <li>Note: RestoHand never stores credit card or bank account details</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">3. How We Use Your Information</h2>
                <ul className="list-disc pl-6">
                  <li>Provide restaurant management services and order processing</li>
                  <li>Process payments through Razorpay (with direct settlement to restaurants)</li>
                  <li>Generate GST-compliant invoices and tax reports</li>
                  <li>Send order notifications and status updates</li>
                  <li>Provide customer support and technical assistance</li>
                  <li>Improve our services and develop new features</li>
                  <li>Comply with legal and regulatory requirements</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">4. Information Sharing and Disclosure</h2>
                <p className="mb-3">We may share your information in the following circumstances:</p>
                <ul className="list-disc pl-6">
                  <li><strong>Payment Processing:</strong> Order and payment information with Razorpay for transaction processing</li>
                  <li><strong>Service Providers:</strong> With trusted third-party services for hosting, analytics, and support</li>
                  <li><strong>Legal Compliance:</strong> When required by law, court order, or regulatory request</li>
                  <li><strong>Business Transfer:</strong> In connection with a merger, acquisition, or sale of assets</li>
                  <li><strong>Consent:</strong> With your explicit consent for other purposes</li>
                </ul>
                <p className="mt-3">
                  <strong>We do NOT sell, rent, or trade your personal information to third parties for marketing purposes.</strong>
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">5. Data Security</h2>
                <p>We implement industry-standard security measures to protect your information:</p>
                <ul className="list-disc pl-6">
                  <li>HTTPS encryption for all data transmission</li>
                  <li>Firebase Authentication with secure JWT tokens</li>
                  <li>Role-based access control for staff members</li>
                  <li>Regular security audits and monitoring</li>
                  <li>Secure cloud infrastructure with MongoDB Atlas</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">6. Data Retention</h2>
                <p>We retain your information for the following periods:</p>
                <ul className="list-disc pl-6">
                  <li><strong>Restaurant Data:</strong> For the duration of your subscription plus 7 years for tax compliance</li>
                  <li><strong>Order Records:</strong> 7 years as required by Indian tax laws</li>
                  <li><strong>Staff Information:</strong> While employed and 3 years after termination</li>
                  <li><strong>Customer Data:</strong> Only during order processing and 30 days for support purposes</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">7. Your Rights</h2>
                <p>You have the following rights regarding your personal information:</p>
                <ul className="list-disc pl-6">
                  <li><strong>Access:</strong> Request copies of your personal information</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal requirements)</li>
                  <li><strong>Portability:</strong> Request your data in a machine-readable format</li>
                  <li><strong>Withdrawal of Consent:</strong> Withdraw consent for data processing where applicable</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">8. Cookies and Tracking</h2>
                <p>We use cookies and similar technologies to:</p>
                <ul className="list-disc pl-6">
                  <li>Maintain user sessions and authentication</li>
                  <li>Store user preferences and settings</li>
                  <li>Improve website performance and user experience</li>
                  <li>Analyze usage patterns for service improvement</li>
                </ul>
                <p className="mt-3">You can control cookie settings through your browser preferences.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">9. Third-Party Services</h2>
                <p>Our platform integrates with the following third-party services:</p>
                <ul className="list-disc pl-6">
                  <li><strong>Razorpay:</strong> Payment processing and UPI transactions</li>
                  <li><strong>Google Firebase:</strong> Authentication and hosting services</li>
                  <li><strong>MongoDB Atlas:</strong> Database hosting and management</li>
                  <li><strong>Google Cloud Platform:</strong> Application hosting and infrastructure</li>
                </ul>
                <p className="mt-3">Each service has its own privacy policy governing their data practices.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">10. Children's Privacy</h2>
                <p>
                  RestoHand is intended for business use and is not designed for children under 18.
                  We do not knowingly collect personal information from children under 18.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">11. International Data Transfers</h2>
                <p>
                  Your information may be transferred to and processed in countries other than India.
                  We ensure appropriate safeguards are in place to protect your information in accordance
                  with applicable data protection laws.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">12. Changes to This Privacy Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any
                  material changes by posting the new Privacy Policy on this page and updating the
                  "Last updated" date. Your continued use of our services after any changes constitutes
                  acceptance of the updated policy.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">13. Contact Us</h2>
                <p>If you have any questions about this Privacy Policy, please contact us:</p>
                <div className="bg-muted p-4 rounded-lg mt-3">
                  <p><strong>RestoHand</strong></p>
                  <p>Email: privacy@restohand.com</p>
                  <p>Phone: +91-8129639999</p>
                  <p>Address: Kochi, Kerala, India</p>
                </div>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;