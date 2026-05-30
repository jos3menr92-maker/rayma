import { motion } from "framer-motion";
import { FileText, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function TermsOfService() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

        <Link to="/profile" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 w-fit">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-heading text-foreground">Terms of Service</h1>
            <p className="text-xs text-muted-foreground">Last updated: May 2026</p>
          </div>
        </div>

        <div className="space-y-5 text-sm text-foreground">

          <Section title="1. Acceptance of Terms">
            By using RAYMA, you agree to these Terms of Service. If you do not agree, please do not use the app.
          </Section>

          <Section title="2. Description of Service">
            RAYMA is a personal finance <strong>tracking</strong> app that helps users manage loans, bills, budgets, and savings goals. RAYMA does not provide loans, credit, investment products, or any regulated financial services.
            <br /><br />
            <strong>⚠️ NOT FINANCIAL ADVICE:</strong> The RAYMA AI advisor feature provides general informational insights only. Nothing in RAYMA constitutes financial, investment, tax, or legal advice. RAYMA is not a licensed financial advisor, broker, or credit counselor. Always consult a licensed financial professional before making important financial decisions.
          </Section>

          <Section title="3. Eligibility & User Accounts">
            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs leading-relaxed">
              <li><strong>Age:</strong> You must be at least 13 years old to use RAYMA. By using the app you confirm you meet this requirement.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must provide accurate information when registering.</li>
              <li>You may not use the app for illegal purposes.</li>
              <li>One account per person. Account sharing is not permitted.</li>
            </ul>
          </Section>

          <Section title="4. Free Tier & Donations">
            RAYMA provides 6 months of full access free of charge to all new users. After the trial period, a voluntary
            donation of any amount (minimum $1) extends RAYMA AI access for another 6 months. All other app features
            (loan tracking, bill management, budgets) remain free forever. Donations are non-refundable.
          </Section>

          <Section title="5. Payments">
            Payments are processed securely by Stripe. RAYMA does not store your payment card information.
            By making a donation, you agree to Stripe's Terms of Service.
          </Section>

          <Section title="6. Disclaimer of Warranties">
            RAYMA is provided "as is" without warranties of any kind. We do not guarantee the accuracy of financial
            calculations or AI-generated insights. Use the app at your own risk.
          </Section>

          <Section title="7. Limitation of Liability">
            RAYMA and its developers are not liable for any financial losses, damages, or decisions made based on
            information displayed in the app.
          </Section>

          <Section title="8. Account Termination">
            You may delete your account at any time. We reserve the right to terminate accounts that violate these terms.
            Upon deletion, all your data is permanently removed within 30 days.
          </Section>

          <Section title="9. Changes to Terms">
            We may update these Terms from time to time. Continued use of the app after changes constitutes acceptance
            of the revised Terms.
          </Section>

          <Section title="10. Governing Law">
            These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law provisions. Any disputes shall be resolved in the courts of Delaware. If you are located in the European Union, mandatory local consumer protection laws of your country may also apply.
          </Section>

          <Section title="11. Contact">
            Questions about these Terms? Contact us at:
            <p className="text-muted-foreground text-xs mt-1 font-medium">legal@raymaapp.com</p>
          </Section>

        </div>
      </motion.div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <h2 className="text-sm font-semibold text-foreground mb-2">{title}</h2>
      <div className="text-xs text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}