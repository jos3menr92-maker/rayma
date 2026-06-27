import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { useMemo } from "react";

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-primary mb-6 hover:opacity-80"
      >
        <ChevronLeft className="w-4 h-4" />
        {T("back", "Back")}
      </button>

      <h1 className="text-3xl font-bold font-heading mb-6">{T("privacyPolicy", "Privacy Policy")}</h1>
      <p className="text-sm text-muted-foreground mb-8">{T("lastUpdatedMay31", "Last updated: May 31, 2026")}</p>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mb-3">{T("privacyIntro", "1. Introduction")}</h2>
          <p>
            {T("privacyIntroBody", "RAYMA (\"we,\" \"us,\" \"our,\" or \"Company\") operates the RAYMA app (the \"Service\"). This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data.")}
          </p>
          <p className="mt-3">
            {T("privacyIntroAgreement", "By using the Service, you agree to this Privacy Policy. If you disagree, please do not use the Service.")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("infoWeCollect", "2. Information We Collect")}</h2>

          <h3 className="font-semibold mt-4">{T("accountInfo", "Account Information")}</h3>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>{T("accountInfoName", "Name, email address, password (hashed)")}</li>
            <li>{T("accountInfoProfile", "Profile customization (display name, avatar, preferred language, currency, timezone)")}</li>
            <li>{T("accountInfoPrefs", "Account preferences (theme, compact mode, pay schedule)")}</li>
          </ul>

          <h3 className="font-semibold mt-4">{T("financialData", "Financial Data")}</h3>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>{T("financialLoans", "Loans: name, lender, balance, interest rate, payment amount, due dates, category")}</li>
            <li>{T("financialBills", "Bills: name, amount, frequency, due dates, category, merchant names")}</li>
            <li>{T("financialAccounts", "Bank accounts: name, institution, account type, balance (NOT full account numbers — only last 4 digits if at all)")}</li>
            <li>{T("financialTransactions", "Transactions: date, description, amount, category, type (debit/credit)")}</li>
            <li>{T("financialIncome", "Income: weekly/monthly income amounts and dates")}</li>
            <li>{T("financialPayments", "Payments: payment history linked to loans/bills")}</li>
            <li>{T("financialSavings", "Savings goals, assets, net worth snapshots")}</li>
            <li>{T("financialDocs", "Scanned documents and uploaded receipts")}</li>
          </ul>

          <h3 className="font-semibold mt-4">{T("thirdPartyData", "Third-Party Data (Plaid)")}</h3>
          <p className="mt-2">
            {T("plaidInfo", "If you link your bank account via Plaid, Plaid retrieves and shares with us:")}
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>{T("plaidAccounts", "Bank account list and real-time balances")}</li>
            <li>{T("plaidTransactions", "Transaction history (last 90 days by default)")}</li>
            <li>{T("plaidAccountType", "Account type and institution details")}</li>
          </ul>
          <p className="mt-2 text-xs italic text-muted-foreground">
            {T("plaidPassword", "Note: Plaid does not share your passwords. Access is read-only via OAuth.")}
          </p>

          <h3 className="font-semibold mt-4">{T("paymentDataStripe", "Payment Data (Stripe)")}</h3>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>{T("stripeTokens", "Token purchase history (amounts, dates, payment status)")}</li>
            <li>{T("stripePromo", "Promo code redemptions")}</li>
            <li>{T("stripeNoCC", "Stripe does NOT share credit card details with us")}</li>
          </ul>

          <h3 className="font-semibold mt-4">{T("usageAnalytics", "Usage Analytics")}</h3>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>{T("analyticsPages", "Pages visited, features used, time spent")}</li>
            <li>{T("analyticsErrors", "Errors encountered (for debugging)")}</li>
            <li>{T("analyticsDevice", "Device type, browser, operating system")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("howWeUse", "3. How We Use Your Data")}</h2>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>{T("serviceDelivery", "Service Delivery:")}}</strong> {T("useServiceDelivery", "Track loans, bills, income, and net worth")}</li>
            <li><strong>{T("raymaAI", "RAYMA AI:")}}</strong> {T("useRaymaAI", "Analyze your financial data to provide personalized insights and suggestions")}</li>
            <li><strong>{T("recurringPayment", "Recurring Payment Detection:")}}</strong> {T("useRecurring", "Identify recurring transactions and suggest bills for your approval")}</li>
            <li><strong>{T("accountSecurity", "Account Security:")})</strong> {T("useSecurity", "Prevent fraud, enforce our Terms of Service")}</li>
            <li><strong>{T("serviceImprovement", "Service Improvement:")})</strong> {T("useImprovement", "Analyze usage to fix bugs and improve features")}</li>
            <li><strong>{T("legalCompliance", "Legal Compliance:")})</strong> {{T("useCompliance", "Comply with tax, financial, and data protection laws")}</li>
            <li><strong>{T("communication", "Communication:")})</strong> {{T("useCommunication", "Send you service updates, password resets, support responses (no marketing without consent)")}</li>
          </ul>
          <p className="mt-4">
            <strong>{T("weDoNot", "We do NOT:")}}</strong> {T("notSell", "Sell personal data to advertisers or data brokers. Share financial data with third parties (except as required by law or for service delivery via Plaid/Stripe).")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("dataRetention", "4. Data Retention & Deletion")}</h2>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>{T("activeAccounts", "Active Accounts:")}}</strong> {{T("activeRetention", "Data is retained as long as your account is active.")}}</li>
            <li><strong>{T("deletedAccounts", "Deleted Accounts:")})</strong> {{T("deletedRetention", "Upon account deletion, all personal, financial, and transactional data is permanently removed within 30 days.")}}</li>
            <li><strong>{T("backups", "Backups:")})</strong> {{T("backupRetention", "Deleted data may persist in encrypted backups for up to 90 days for disaster recovery, then permanently destroyed.")}}</li>
            <li><strong>{T("gdprErasure", "GDPR Right to Erasure:")})</strong> {{T("gdprErasureDesc", "EU residents can request data deletion at any time. Use the \"Delete My Account\" feature in Settings or email support.")}}</li>
            <li><strong>{T("ccpaDeletion", "CCPA Right to Deletion:")})</strong> {{T("ccpaDeletionDesc", "California residents can request deletion via the app. We will confirm deletion within 45 days.")}}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("yourRights", "5. Your Rights")}</h2>
          <h3 className="font-semibold mt-3">{T("forAllUsers", "For all users:")}</h3>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>{T("rightAccess", "Access your data: View all your financial records in the app")}</li>
            <li>{T("rightUpdate", "Update your data: Edit loans, bills, profile information anytime")}</li>
            <li>{T("rightDelete", "Delete your account: Remove all personal data via Settings → Delete My Account")}</li>
            <li>{T("rightOptOut", "Opt-out of analytics: Adjust tracking preferences (where applicable)")}</li>
          </ul>

          <h3 className="font-semibold mt-4">{T("forGDPRUsers", "For GDPR users (EU):")}</h3>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>{T("gdprAccess", "Right to Access: Request a copy of all your data")}</li>
            <li>{T("gdprErasure2", "Right to Erasure (\"Right to be Forgotten\")")}</li>
            <li>{T("gdprRectification", "Right to Rectification: Correct inaccurate data")}</li>
            <li>{T("gdprPortability", "Right to Data Portability: Export your data in machine-readable format (CSV)")}</li>
            <li>{T("gdprObject", "Right to Object: Opt out of certain processing")}</li>
          </ul>

          <h3 className="font-semibold mt-4">{T("forCCPAUsers", "For CCPA users (California):")}</h3>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>{T("ccpaKnow", "Right to Know: What personal information is collected")}</li>
            <li>{T("ccpaDelete", "Right to Delete: Request deletion of collected data")}</li>
            <li>{T("ccpaOptOut", "Right to Opt-Out: Opt out of \"sale or sharing\" of personal information")}</li>
            <li>{T("ccpaCorrect", "Right to Correct: Correct inaccurate personal information")}</li>
            <li>{T("ccpaNonDiscrim", "Right to Non-Discrimination: No penalty for exercising rights")}</li>
          </ul>

          <p className="mt-4">
            {T("exerciseRights", "To exercise these rights, email")} <strong>privacy@raymaapp.com</strong> {T("withRequest", "with your request. We will respond within 30 days.")}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("securitySection", "6. Security")}</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>{T("securityHTTPS", "All data is transmitted using HTTPS encryption")}</li>
            <li>{T("securityPasswords", "Passwords are hashed and never stored in plain text")}</li>
            <li>{T("securityBankCreds", "Bank credentials are never stored—only secure Plaid access tokens")}</li>
            <li>{T("securityAudits", "We conduct regular security audits and penetration testing")}</li>
            <li>{T("securityBreach", "If a breach occurs, affected users will be notified within 30 days")}</li>
          </ul>
          <p className="mt-4">
            <strong>{T("noSystem100", "No system is 100% secure.")}</strong> {{T("securityNote", "While we use industry-standard protections, we cannot guarantee absolute security. Use a strong password and enable two-factor authentication if available.")}}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("thirdPartyServices", "7. Third-Party Services")}</h2>
          <p>
            {T("thirdPartyDesc", "We may share data with trusted partners to provide the Service:")}
          </p>
          <ul className="list-disc list-inside space-y-2 mt-3">
            <li><strong>{T("plaidService", "Plaid (Bank Linking):")}}</strong> {{T("plaidServiceDesc", "Retrieves account/transaction data.")}} <a href="https://plaid.com/privacy" className="text-primary underline">{T("privacyPolicy2", "Plaid Privacy Policy")}</a></li>
            <li><strong>{T("stripeService", "Stripe (Payments):")}}</strong> {{T("stripeServiceDesc", "Processes token purchases.")}} <a href="https://stripe.com/en-us/privacy" className="text-primary underline">{T("stripePrivacyPolicy", "Stripe Privacy Policy")}</a></li>
            <li><strong>{T("base44Service", "Base44 (Backend Infrastructure):")}}</strong> {{T("base44Desc", "Hosts our database and authentication. Base44 complies with GDPR and uses encrypted storage.")}}</li>
            <li><strong>{T("analyticsService", "Analytics (Optional):")})</strong> {{T("analyticsServiceDesc", "We use aggregated, non-personal analytics to understand usage patterns.")}}</li>
          </ul>
          <p className="mt-3">
            {T("noSellData", "We do not sell, trade, or rent your personal information to any third party for marketing purposes.")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("childrenPrivacy", "8. Children's Privacy")}</h2>
          <p>
            {T("childrenPrivacyDesc", "RAYMA is not intended for users under 13 years old (COPPA) or under 16 in the EU. We do not knowingly collect data from children. If we discover we've collected data from a child, we will delete it immediately.")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("policyChanges", "9. Changes to This Policy")}</h2>
          <p>
            {T("policyChangesDesc", "We may update this Privacy Policy. Material changes will be communicated via email or in-app notification. Your continued use of the Service after changes constitutes acceptance.")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("contactUs", "10. Contact Us")}</h2>
          <p>
            {T("privacyQuestions", "For privacy questions, data requests, or complaints, contact:")}
          </p>
          <div className="mt-3 p-3 bg-muted rounded-lg text-xs">
            <p className="font-semibold">{T("raymaPrivacyTeam", "RAYMA Privacy Team")}</p>
            <p>Email: privacy@raymaapp.com</p>
            <p>{T("responseTime", "Response time: 30 days")}</p>
            <p className="mt-2 text-muted-foreground">{T("gdprComplaint", "For GDPR complaints, you also have the right to lodge a complaint with your local data protection authority.")}</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("financialDisclaimer", "11. Financial Disclaimer")}</h2>
          <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
            <p className="font-semibold text-destructive mb-2">⚠️ {T("importantLegal", "Important Legal Notice")}</p>
            <p>
              <strong>{T("notFinancialAdvisor", "RAYMA is NOT a financial advisor, accountant, tax professional, or legal advisor.")}</strong> {{T("educationalPurposes", "All information provided by RAYMA is for educational and informational purposes only and should not be considered as financial advice.")}}</p>
            <p className="mt-3">
              <strong>{T("consultProfessionals", "Consult qualified professionals before:")}}</strong> {{T("beforeActions", "Making investment decisions, taking out loans, filing taxes, entering debt settlement agreements, or making major financial changes.")}}</p>
            <p className="mt-3">
              <strong>{T("useAtOwnRisk", "Use at your own risk:")}}</strong> {{T("noGuarantees", "RAYMA makes no guarantees about calculation accuracy, interest rate calculations, or financial outcomes. We are not responsible for errors, missed payments, or financial losses.")}}</p>
          </div>
        </section>
      </div>

      <div className="mt-8 pt-8 border-t border-border">
        <Button onClick={() => navigate("/profile")} className="w-full">
          {T("backToProfile", "Back to Profile")}
        </Button>
      </div>
    </div>
  );
}