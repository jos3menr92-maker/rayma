import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-primary mb-6 hover:opacity-80"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="text-3xl font-bold font-heading mb-6">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: May 31, 2026</p>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mb-3">1. Introduction</h2>
          <p>
            RAYMA ("we," "us," "our," or "Company") operates the RAYMA app (the "Service"). This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data.
          </p>
          <p className="mt-3">
            By using the Service, you agree to this Privacy Policy. If you disagree, please do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">2. Information We Collect</h2>

          <h3 className="font-semibold mt-4">Account Information</h3>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Name, email address, password (hashed)</li>
            <li>Profile customization (display name, avatar, preferred language, currency, timezone)</li>
            <li>Account preferences (theme, compact mode, pay schedule)</li>
          </ul>

          <h3 className="font-semibold mt-4">Financial Data</h3>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Loans: name, lender, balance, interest rate, payment amount, due dates, category</li>
            <li>Bills: name, amount, frequency, due dates, category, merchant names</li>
            <li>Bank accounts: name, institution, account type, balance (NOT full account numbers — only last 4 digits if at all)</li>
            <li>Transactions: date, description, amount, category, type (debit/credit)</li>
            <li>Income: weekly/monthly income amounts and dates</li>
            <li>Payments: payment history linked to loans/bills</li>
            <li>Savings goals, assets, net worth snapshots</li>
            <li>Scanned documents and uploaded receipts</li>
          </ul>

          <h3 className="font-semibold mt-4">Third-Party Data (Plaid)</h3>
          <p className="mt-2">
            If you link your bank account via Plaid, Plaid retrieves and shares with us:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Bank account list and real-time balances</li>
            <li>Transaction history (last 90 days by default)</li>
            <li>Account type and institution details</li>
          </ul>
          <p className="mt-2 text-xs italic text-muted-foreground">
            Note: Plaid does not share your passwords. Access is read-only via OAuth.
          </p>

          <h3 className="font-semibold mt-4">Payment Data (Stripe)</h3>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Token purchase history (amounts, dates, payment status)</li>
            <li>Promo code redemptions</li>
            <li>Stripe does NOT share credit card details with us</li>
          </ul>

          <h3 className="font-semibold mt-4">Usage Analytics</h3>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Pages visited, features used, time spent</li>
            <li>Errors encountered (for debugging)</li>
            <li>Device type, browser, operating system</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">3. How We Use Your Data</h2>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Service Delivery:</strong> Track loans, bills, income, and net worth</li>
            <li><strong>RAYMA AI:</strong> Analyze your financial data to provide personalized insights and suggestions</li>
            <li><strong>Recurring Payment Detection:</strong> Identify recurring transactions and suggest bills for your approval</li>
            <li><strong>Account Security:</strong> Prevent fraud, enforce our Terms of Service</li>
            <li><strong>Service Improvement:</strong> Analyze usage to fix bugs and improve features</li>
            <li><strong>Legal Compliance:</strong> Comply with tax, financial, and data protection laws</li>
            <li><strong>Communication:</strong> Send you service updates, password resets, support responses (no marketing without consent)</li>
          </ul>
          <p className="mt-4">
            <strong>We do NOT:</strong> Sell personal data to advertisers or data brokers. Share financial data with third parties (except as required by law or for service delivery via Plaid/Stripe).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">4. Data Retention & Deletion</h2>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Active Accounts:</strong> Data is retained as long as your account is active.</li>
            <li><strong>Deleted Accounts:</strong> Upon account deletion, all personal, financial, and transactional data is permanently removed within 30 days.</li>
            <li><strong>Backups:</strong> Deleted data may persist in encrypted backups for up to 90 days for disaster recovery, then permanently destroyed.</li>
            <li><strong>GDPR Right to Erasure:</strong> EU residents can request data deletion at any time. Use the "Delete My Account" feature in Settings or email support.</li>
            <li><strong>CCPA Right to Deletion:</strong> California residents can request deletion via the app. We will confirm deletion within 45 days.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">5. Your Rights</h2>
          <h3 className="font-semibold mt-3">For all users:</h3>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Access your data: View all your financial records in the app</li>
            <li>Update your data: Edit loans, bills, profile information anytime</li>
            <li>Delete your account: Remove all personal data via Settings → Delete My Account</li>
            <li>Opt-out of analytics: Adjust tracking preferences (where applicable)</li>
          </ul>

          <h3 className="font-semibold mt-4">For GDPR users (EU):</h3>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Right to Access: Request a copy of all your data</li>
            <li>Right to Erasure ("Right to be Forgotten")</li>
            <li>Right to Rectification: Correct inaccurate data</li>
            <li>Right to Data Portability: Export your data in machine-readable format (CSV)</li>
            <li>Right to Object: Opt out of certain processing</li>
          </ul>

          <h3 className="font-semibold mt-4">For CCPA users (California):</h3>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Right to Know: What personal information is collected</li>
            <li>Right to Delete: Request deletion of collected data</li>
            <li>Right to Opt-Out: Opt out of "sale or sharing" of personal information</li>
            <li>Right to Correct: Correct inaccurate personal information</li>
            <li>Right to Non-Discrimination: No penalty for exercising rights</li>
          </ul>

          <p className="mt-4">
            To exercise these rights, email <strong>privacy@raymaapp.com</strong> with your request. We will respond within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">6. Security</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>All data is transmitted using HTTPS encryption</li>
            <li>Passwords are hashed and never stored in plain text</li>
            <li>Bank credentials are never stored—only secure Plaid access tokens</li>
            <li>We conduct regular security audits and penetration testing</li>
            <li>If a breach occurs, affected users will be notified within 30 days</li>
          </ul>
          <p className="mt-4">
            <strong>No system is 100% secure.</strong> While we use industry-standard protections, we cannot guarantee absolute security. Use a strong password and enable two-factor authentication if available.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">7. Third-Party Services</h2>
          <p>
            We may share data with trusted partners to provide the Service:
          </p>
          <ul className="list-disc list-inside space-y-2 mt-3">
            <li><strong>Plaid (Bank Linking):</strong> Retrieves account/transaction data. <a href="https://plaid.com/privacy" className="text-primary underline">Plaid Privacy Policy</a></li>
            <li><strong>Stripe (Payments):</strong> Processes token purchases. <a href="https://stripe.com/en-us/privacy" className="text-primary underline">Stripe Privacy Policy</a></li>
            <li><strong>Base44 (Backend Infrastructure):</strong> Hosts our database and authentication. Base44 complies with GDPR and uses encrypted storage.</li>
            <li><strong>Analytics (Optional):</strong> We use aggregated, non-personal analytics to understand usage patterns.</li>
          </ul>
          <p className="mt-3">
            We do not sell, trade, or rent your personal information to any third party for marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">8. Children's Privacy</h2>
          <p>
            RAYMA is not intended for users under 13 years old (COPPA) or under 16 in the EU. We do not knowingly collect data from children. If we discover we've collected data from a child, we will delete it immediately.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy. Material changes will be communicated via email or in-app notification. Your continued use of the Service after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">10. Contact Us</h2>
          <p>
            For privacy questions, data requests, or complaints, contact:
          </p>
          <div className="mt-3 p-3 bg-muted rounded-lg text-xs">
            <p className="font-semibold">RAYMA Privacy Team</p>
            <p>Email: privacy@raymaapp.com</p>
            <p>Response time: 30 days</p>
            <p className="mt-2 text-muted-foreground">For GDPR complaints, you also have the right to lodge a complaint with your local data protection authority.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">11. Financial Disclaimer</h2>
          <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
            <p className="font-semibold text-destructive mb-2">⚠️ Important Legal Notice</p>
            <p>
              <strong>RAYMA is NOT a financial advisor, accountant, tax professional, or legal advisor.</strong> All information provided by RAYMA is for educational and informational purposes only and should not be considered as financial advice.
            </p>
            <p className="mt-3">
              <strong>Consult qualified professionals before:</strong> Making investment decisions, taking out loans, filing taxes, entering debt settlement agreements, or making major financial changes.
            </p>
            <p className="mt-3">
              <strong>Use at your own risk:</strong> RAYMA makes no guarantees about calculation accuracy, interest rate calculations, or financial outcomes. We are not responsible for errors, missed payments, or financial losses.
            </p>
          </div>
        </section>
      </div>

      <div className="mt-8 pt-8 border-t border-border">
        <Button onClick={() => navigate("/profile")} className="w-full">
          Back to Profile
        </Button>
      </div>
    </div>
  );
}