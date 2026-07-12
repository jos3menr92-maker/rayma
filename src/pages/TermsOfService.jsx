import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { useMemo } from "react";

export default function TermsOfService() {
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

      <h1 className="text-3xl font-bold font-heading mb-6">{T("termsOfService", "Terms of Service")}</h1>
      <p className="text-sm text-muted-foreground mb-8">{T("lastUpdatedMay31", "Last updated: May 31, 2026")}</p>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mb-3">{T("agreementToTerms", "1. Agreement to Terms")}</h2>
          <p>
            {T("agreementDesc", "By accessing and using the Rayma AI app (the \"Service\"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.")}
          </p>
          <p className="mt-3">
            {T("modifyTerms", "Rayma AI reserves the right to modify these terms at any time. Continued use after changes constitutes acceptance.")}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("useLicense", "2. Use License")}</h2>
          <p>
            {T("usePermission", "Permission is granted to use the Service for personal, non-commercial financial tracking only. You may not:")}</p>
          <ul className="list-disc list-inside space-y-1 mt-3">
            <li>{T("notReproduce", "Reproduce, duplicate, copy, sell, or resell the Service")}</li>
            <li>{T("notReverseEngineer", "Reverse engineer, decompile, or attempt to gain unauthorized access")}</li>
            <li>{T("notHarass", "Use the Service to harass, abuse, or harm others")}</li>
            <li>{T("notRemove", "Remove or alter any copyright, trademark, or proprietary notices")}</li>
            <li>{T("notAutomated", "Use automated bots or scrapers to extract data")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("accountResponsibility", "3. Account Responsibility")}</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>{T("responsiblePassword", "You are responsible for maintaining confidentiality of your password and account")}</li>
            <li>{T("responsibleActivity", "You are responsible for all activity under your account")}</li>
            <li>{T("notifyUnauthorized", "You must notify us immediately of unauthorized access")}</li>
            <li>{T("notLiableNegligence", "We are not liable for unauthorized account access if security was compromised due to user negligence")}</li>
            <li>{T("minimumAge", "You must be at least 13 years old (18 in some jurisdictions) to use this Service")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("financialDisclaimer2", "4. Financial Information Disclaimer")}</h2>
          <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg space-y-3">
            <p>
              <strong className="text-destructive">⚠️ {T("importantNotAdvisor", "IMPORTANT: Rayma AI IS NOT A FINANCIAL ADVISOR, ACCOUNTANT, TAX PROFESSIONAL, OR INVESTMENT ADVISOR.")}</strong>
            </p>
            <p>
              {T("allInfoEducational", "All information, calculations, and recommendations provided by Rayma AI are for informational and educational purposes only. Rayma AI does not provide financial, investment, tax, or legal advice.")}
            </p>
            <p>
              <strong>{T("beforeYou", "Before you:")}</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>{T("beforeLoan", "Take out a loan or refinance debt")}</li>
              <li>{T("beforeInvestment", "Make investment or asset allocation decisions")}</li>
              <li>{T("beforeTax", "File taxes or claim deductions")}</li>
              <li>{T("beforeDebt", "Enter a debt settlement or consolidation agreement")}</li>
              <li>{T("beforeMajor", "Make major financial changes")}</li>
            </ul>
            <p className="mt-2">
              <strong>{T("consultQualified", "Consult qualified professionals:")}</strong> {T("consultDesc", "A licensed financial advisor, CPA, tax professional, or attorney, depending on your situation.")}
            </p>
            <p>
              <strong>{T("noGuarantees2", "Rayma AI makes no guarantees:")}</strong> {T("noGuaranteesDesc", "We are not responsible for calculation errors, interest rate inaccuracies, missed payments, financial losses, or any other financial outcomes resulting from use of the Service.")}
            </p>
            <p>
              <strong>{T("useAtOwnRisk2", "Use at your own risk.")}</strong> {T("yourResponsible", "You are solely responsible for all financial decisions.")}
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("accuracyOfInfo", "5. Accuracy of Information")}</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>{T("responSibleAccuracy", "You are responsible for the accuracy of financial information you enter into Rayma AI")}</li>
            <li>{T("verifyBank", "Always verify your bank balance directly with your financial institution")}</li>
            <li>{T("interestApprox", "Interest rate calculations are approximations and may not reflect actual charges from lenders")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("limitationOfLiability", "6. Limitation of Liability")}</h2>
          <div className="p-3 bg-muted rounded-lg space-y-2 text-xs">
            <p>
              <strong>{T("maximumExtent", "TO THE MAXIMUM EXTENT PERMITTED BY LAW:")}</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>{T("asIs", "Rayma AI provides the Service \"AS IS\" without warranties of any kind, expressed or implied")}</li>
              <li>{T("notLiableIndirect", "Rayma AI is not liable for indirect, incidental, special, consequential, or punitive damages")}</li>
              <li>{T("notLiableLostProfit", "Rayma AI is not liable for any lost profits, lost data, or financial losses resulting from Service use")}</li>
              <li>{T("limitedTotal", "Rayma AI's total liability for any claim shall not exceed the amount you paid for the Service in the past 12 months")}</li>
              <li>{T("limitationApplies", "This limitation applies even if Rayma AI has been advised of the possibility of such damages")}</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("thirdPartyServices2", "7. Third-Party Services")}</h2>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>{T("stripeTOS", "Stripe:")}</strong> {T("stripeTOSDesc", "Rayma AI uses Stripe for payment processing. Read")} <a href="https://stripe.com/legal" className="text-primary underline">{T("stripeLegal", "Stripe's Terms")}</a>.</li>
            <li>{T("notResponsibleThirdParty", "Rayma AI is not responsible for third-party service availability, outages, or errors")}</li>
            <li>{T("notLiableThirdParty", "Rayma AI is not liable for data loss or breaches at third-party providers")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("serviceAvailability", "8. Service Availability")}</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>{T("noUninterrupted", "Rayma AI does not guarantee uninterrupted service availability")}</li>
            <li>{T("mayPerform", "Rayma AI may perform maintenance, updates, or suspend the Service at any time")}</li>
            <li>{T("notLiableDowntime", "Rayma AI is not liable for Service downtime, data loss during outages, or any related damages")}</li>
            <li>{T("backedUp", "Your data is backed up regularly, but no backup system is 100% reliable")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("dataPrivacySecurity", "9. Data Privacy & Security")}</h2>
          <p>
            {T("seePrivacy", "See the")} <a href="/privacy" className="text-primary underline">{T("privacyPolicyLink", "Privacy Policy")}</a> {T("forComplete", "for complete details on how your data is collected, used, and protected.")}
          </p>
          <ul className="list-disc list-inside space-y-2 mt-3">
            <li>{T("grantProcess", "You grant Rayma AI permission to process your financial data to provide the Service")}</li>
            <li>{T("responsibleData", "You are responsible for all data you upload or enter")}</li>
            <li>{T("mayAnonymize", "Rayma AI may use anonymized, aggregated data to improve the Service")}</li>
            <li>{T("neverStored", "Bank credentials and sensitive payment information are never stored by Rayma AI")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("prohibitedActivities", "10. Prohibited Activities")}</h2>
          <p>{T("mayNotUse", "You may not use the Service to:")}</p>
          <ul className="list-disc list-inside space-y-1 mt-3">
            <li>{T("violateLaw", "Violate any law, regulation, or third-party rights")}</li>
            <li>{T("falseMisleading", "Provide false, fraudulent, or misleading information")}</li>
            <li>{T("attemptGain", "Attempt to gain unauthorized access to systems")}</li>
            <li>{T("harassThreat", "Harass, abuse, or threaten other users or Rayma AI staff")}</li>
            <li>{T("engageFraud", "Engage in fraud, money laundering, or illegal financial activity")}</li>
            <li>{T("spamPhish", "Spam, phish, or send malicious code")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("paymentsRefunds", "11. Payments & Refunds")}</h2>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>{T("insertCoinOneTime", "Insert Coin ($1.99):")}</strong> {T("insertCoinOneTimeDesc", "One-time purchase. Not a subscription. Does not auto-renew.")}</li>
            <li><strong>{T("lithiumSubscription", "Lithium ($5.99/month or $49.99/year):")}</strong> {T("lithiumSubscriptionDesc", "Auto-renewing subscription billed monthly or annually depending on your selection. You can cancel anytime by turning off auto-renewal in your app store settings.")}</li>
            <li><strong>{T("generatorSubscription", "Generator ($11.99/month or $95.99/year):")}</strong> {T("generatorSubscriptionDesc", "Auto-renewing subscription billed monthly or annually depending on your selection. You can cancel anytime by turning off auto-renewal in your app store settings.")}</li>
            <li>{T("subscriptionManagement", "Subscriptions can be managed or cancelled at any time from your Apple App Store or Google Play Store account settings.")}</li>
            <li>{T("nonRefundable", "One-time purchases are non-refundable once completed.")}</li>
            <li>{T("pricingSubject", "Pricing is subject to change at any time")}</li>
            <li>{T("errorPayment", "If a payment was made in error, contact support@reema.app within 7 days")}</li>
            <li>{T("stripeRefund", "Stripe processes all payment refunds per")} <a href="https://stripe.com/legal" className="text-primary underline">{T("stripePolicy", "Stripe's refund policy")}</a></li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("promoCodesOffers", "12. Promo Codes & Offers")}</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>{T("singleUse", "Promo codes are single-use per account unless otherwise stated")}</li>
            <li>{T("expire", "Promo codes expire on the stated date and cannot be extended")}</li>
            <li>{T("raymaRevoke", "Rayma AI reserves the right to revoke or modify promo codes at any time")}</li>
            <li>{T("promoNontransferable", "Promo code benefits (tokens, passes) are non-transferable")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("intellectualProperty", "13. Intellectual Property")}</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>{T("raymaProperty", "Rayma AI, its logo, and all content are the exclusive property of Rayma AI")}</li>
            <li>{T("notCopy", "You may not copy, reproduce, or distribute Rayma AI's content without permission")}</li>
            <li>{T("noOwnership", "Your use of the Service does not grant you ownership of Rayma AI's intellectual property")}</li>
            <li>{T("userContent", "User-generated content (loans, bills, transactions) remains your property, but you grant Rayma AI a license to use it to provide the Service")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("termination", "14. Termination")}</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>{T("canDelete", "You can delete your account anytime from Settings → Delete My Account")}</li>
            <li>{T("raymaTerminate", "Rayma AI may suspend or terminate your account if you violate these Terms or misuse the Service")}</li>
            <li>{T("permanentLoss", "Termination due to violation may result in permanent loss of access and data")}</li>
            <li>{T("dataDeletedPerPolicy", "Upon termination, your data will be deleted per the Privacy Policy")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("indemnification", "15. Indemnification")}</h2>
          <p>
            {T("indemnifyAgreed", "You agree to indemnify and hold harmless Rayma AI, its officers, employees, and agents from any claims, damages, or losses arising from your use of the Service, violation of these Terms, or infringement of any third-party rights.")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("governingLaw", "16. Governing Law")}</h2>
          <p>
            {T("governingLawDesc", "These Terms are governed by and construed in accordance with the laws of the United States, without regard to conflicts of law principles. You agree to submit to the exclusive jurisdiction of courts in New York.")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("disputeResolution", "17. Dispute Resolution")}</h2>
          <p>
            {T("disputeDesc", "Before pursuing legal action, please contact support@reema.app to attempt resolution. If disputes cannot be resolved, you may pursue binding arbitration instead of litigation.")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{T("contactUs2", "18. Contact Us")}</h2>
          <p>
            {T("termsQuestions", "For questions about these Terms, contact:")}
          </p>
          <div className="mt-3 p-3 bg-muted rounded-lg text-xs">
            <p className="font-semibold">{T("raymaLegalTeam", "Rayma AI Legal Team")}</p>
            <p>Email: support@reema.app</p>
            <p>{T("responseTime", "Response time: 30 days")}</p>
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