import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsOfService() {
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

      <h1 className="text-3xl font-bold font-heading mb-6">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: May 31, 2026</p>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mb-3">1. Agreement to Terms</h2>
          <p>
            By accessing and using the RAYMA app (the "Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
          </p>
          <p className="mt-3">
            RAYMA reserves the right to modify these terms at any time. Continued use after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">2. Use License</h2>
          <p>
            Permission is granted to use the Service for personal, non-commercial financial tracking only. You may not:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-3">
            <li>Reproduce, duplicate, copy, sell, or resell the Service</li>
            <li>Reverse engineer, decompile, or attempt to gain unauthorized access</li>
            <li>Use the Service to harass, abuse, or harm others</li>
            <li>Remove or alter any copyright, trademark, or proprietary notices</li>
            <li>Use automated bots or scrapers to extract data</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">3. Account Responsibility</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>You are responsible for maintaining confidentiality of your password and account</li>
            <li>You are responsible for all activity under your account</li>
            <li>You must notify us immediately of unauthorized access</li>
            <li>We are not liable for unauthorized account access if security was compromised due to user negligence</li>
            <li>You must be at least 13 years old (18 in some jurisdictions) to use this Service</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">4. Financial Information Disclaimer</h2>
          <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg space-y-3">
            <p>
              <strong className="text-destructive">⚠️ IMPORTANT: RAYMA IS NOT A FINANCIAL ADVISOR, ACCOUNTANT, TAX PROFESSIONAL, OR INVESTMENT ADVISOR.</strong>
            </p>
            <p>
              All information, calculations, and recommendations provided by RAYMA are for informational and educational purposes only. RAYMA does not provide financial, investment, tax, or legal advice.
            </p>
            <p>
              <strong>Before you:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Take out a loan or refinance debt</li>
              <li>Make investment or asset allocation decisions</li>
              <li>File taxes or claim deductions</li>
              <li>Enter a debt settlement or consolidation agreement</li>
              <li>Make major financial changes</li>
            </ul>
            <p className="mt-2">
              <strong>Consult qualified professionals:</strong> A licensed financial advisor, CPA, tax professional, or attorney, depending on your situation.
            </p>
            <p>
              <strong>RAYMA makes no guarantees:</strong> We are not responsible for calculation errors, interest rate inaccuracies, missed payments, financial losses, or any other financial outcomes resulting from use of the Service.
            </p>
            <p>
              <strong>Use at your own risk.</strong> You are solely responsible for all financial decisions.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">5. Accuracy of Information</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>You are responsible for the accuracy of financial information you enter into RAYMA</li>
            <li>Plaid bank sync data is provided "as-is" from your financial institution and Plaid</li>
            <li>RAYMA is not responsible for errors, delays, or inaccuracies in bank data</li>
            <li>Always verify your bank balance directly with your financial institution</li>
            <li>Interest rate calculations are approximations and may not reflect actual charges from lenders</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">6. Limitation of Liability</h2>
          <div className="p-3 bg-muted rounded-lg space-y-2 text-xs">
            <p>
              <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>RAYMA provides the Service "AS IS" without warranties of any kind, expressed or implied</li>
              <li>RAYMA is not liable for indirect, incidental, special, consequential, or punitive damages</li>
              <li>RAYMA is not liable for any lost profits, lost data, or financial losses resulting from Service use</li>
              <li>RAYMA's total liability for any claim shall not exceed the amount you paid for the Service in the past 12 months</li>
              <li>This limitation applies even if RAYMA has been advised of the possibility of such damages</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">7. Third-Party Services</h2>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Plaid:</strong> RAYMA uses Plaid for secure bank account linking. Read the <a href="https://plaid.com/privacy" className="text-primary underline">Plaid Privacy Policy</a> and <a href="https://plaid.com/legal" className="text-primary underline">Plaid Legal Terms</a>.</li>
            <li><strong>Stripe:</strong> RAYMA uses Stripe for payment processing. Read <a href="https://stripe.com/legal" className="text-primary underline">Stripe's Terms</a>.</li>
            <li>RAYMA is not responsible for third-party service availability, outages, or errors</li>
            <li>RAYMA is not liable for data loss or breaches at third-party providers</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">8. Service Availability</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>RAYMA does not guarantee uninterrupted service availability</li>
            <li>RAYMA may perform maintenance, updates, or suspend the Service at any time</li>
            <li>RAYMA is not liable for Service downtime, data loss during outages, or any related damages</li>
            <li>Your data is backed up regularly, but no backup system is 100% reliable</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">9. Data Privacy & Security</h2>
          <p>
            See the <a href="/privacy" className="text-primary underline">Privacy Policy</a> for complete details on how your data is collected, used, and protected.
          </p>
          <ul className="list-disc list-inside space-y-2 mt-3">
            <li>You grant RAYMA permission to process your financial data to provide the Service</li>
            <li>You are responsible for all data you upload or enter</li>
            <li>RAYMA may use anonymized, aggregated data to improve the Service</li>
            <li>Bank credentials and sensitive payment information are never stored by RAYMA</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">10. Prohibited Activities</h2>
          <p>You may not use the Service to:</p>
          <ul className="list-disc list-inside space-y-1 mt-3">
            <li>Violate any law, regulation, or third-party rights</li>
            <li>Provide false, fraudulent, or misleading information</li>
            <li>Attempt to gain unauthorized access to systems</li>
            <li>Harass, abuse, or threaten other users or RAYMA staff</li>
            <li>Engage in fraud, money laundering, or illegal financial activity</li>
            <li>Spam, phish, or send malicious code</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">11. Payments & Refunds</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Token packs and Annual Pass are non-refundable once purchased</li>
            <li>Pricing is subject to change at any time</li>
            <li>Refund requests due to buyer's remorse are not accepted</li>
            <li>If a payment was made in error, contact support@raymaapp.com within 7 days</li>
            <li>Stripe processes all payment refunds per <a href="https://stripe.com/legal" className="text-primary underline">Stripe's refund policy</a></li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">12. Promo Codes & Offers</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Promo codes are single-use per account unless otherwise stated</li>
            <li>Promo codes expire on the stated date and cannot be extended</li>
            <li>RAYMA reserves the right to revoke or modify promo codes at any time</li>
            <li>Promo code benefits (tokens, passes) are non-transferable</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">13. Intellectual Property</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>RAYMA, its logo, and all content are the exclusive property of RAYMA</li>
            <li>You may not copy, reproduce, or distribute RAYMA's content without permission</li>
            <li>Your use of the Service does not grant you ownership of RAYMA's intellectual property</li>
            <li>User-generated content (loans, bills, transactions) remains your property, but you grant RAYMA a license to use it to provide the Service</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">14. Termination</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>You can delete your account anytime from Settings → Delete My Account</li>
            <li>RAYMA may suspend or terminate your account if you violate these Terms or misuse the Service</li>
            <li>Termination due to violation may result in permanent loss of access and data</li>
            <li>Upon termination, your data will be deleted per the Privacy Policy</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">15. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless RAYMA, its officers, employees, and agents from any claims, damages, or losses arising from your use of the Service, violation of these Terms, or infringement of any third-party rights.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">16. Governing Law</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of the United States, without regard to conflicts of law principles. You agree to submit to the exclusive jurisdiction of courts in New York.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">17. Dispute Resolution</h2>
          <p>
            Before pursuing legal action, please contact support@raymaapp.com to attempt resolution. If disputes cannot be resolved, you may pursue binding arbitration instead of litigation.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">18. Contact Us</h2>
          <p>
            For questions about these Terms, contact:
          </p>
          <div className="mt-3 p-3 bg-muted rounded-lg text-xs">
            <p className="font-semibold">RAYMA Legal Team</p>
            <p>Email: legal@raymaapp.com</p>
            <p>Response time: 30 days</p>
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