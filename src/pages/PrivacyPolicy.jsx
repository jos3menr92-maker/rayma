import { motion } from "framer-motion";
import { Shield, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

        <Link to="/profile" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 w-fit">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-heading text-foreground">Privacy Policy</h1>
            <p className="text-xs text-muted-foreground">Last updated: May 2025</p>
          </div>
        </div>

        <div className="space-y-5 text-sm text-foreground">

          <Section title="1. Introduction">
            RAYMA ("we", "our", or "us") is a personal finance management application. This Privacy Policy explains how we
            collect, use, and protect your information when you use our app.
          </Section>

          <Section title="2. Information We Collect">
            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs leading-relaxed">
              <li><strong>Account information:</strong> Your name and email address provided at registration.</li>
              <li><strong>Financial data:</strong> Loans, bills, income, budgets, and savings goals you manually enter.</li>
              <li><strong>Profile preferences:</strong> Currency, pay schedule, avatar, and custom display name.</li>
              <li><strong>Documents:</strong> Files you optionally upload to the Document Vault.</li>
              <li><strong>Usage data:</strong> Anonymous app interaction data to improve performance.</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs leading-relaxed">
              <li>To provide and personalize the app experience.</li>
              <li>To power the RAYMA AI financial advisor with your financial context.</li>
              <li>To send optional reminders and notifications.</li>
              <li>To process voluntary donations via Stripe.</li>
              <li>To improve app features and fix bugs.</li>
            </ul>
          </Section>

          <Section title="4. Data Sharing">
            We <strong>never sell, rent, or share</strong> your personal financial data with third parties for marketing purposes.
            Data may be shared only with:
            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs leading-relaxed mt-2">
              <li><strong>Stripe</strong> — for payment processing only (no financial account data is shared).</li>
              <li><strong>Base44</strong> — our hosting platform, which stores encrypted data on your behalf.</li>
              <li><strong>AI providers</strong> — anonymized prompts are sent to generate RAYMA financial insights.</li>
            </ul>
          </Section>

          <Section title="5. Data Security">
            All data is encrypted at rest and in transit using industry-standard TLS/AES encryption.
            Row-level security (RLS) ensures only you can access your own data — not other users, not even app administrators.
          </Section>

          <Section title="6. Data Retention">
            Your data is retained as long as your account is active. You may delete your account and all associated data at
            any time from the app (Settings → Delete Account). Data is permanently deleted within 30 days of a deletion request.
          </Section>

          <Section title="7. Your Rights">
            You have the right to:
            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs leading-relaxed mt-2">
              <li>Access all data we hold about you.</li>
              <li>Correct inaccurate data.</li>
              <li>Request full deletion of your account and data.</li>
              <li>Withdraw consent for AI features at any time.</li>
            </ul>
          </Section>

          <Section title="8. Children's Privacy">
            RAYMA is not directed at children under 13. We do not knowingly collect personal information from children.
          </Section>

          <Section title="9. Changes to This Policy">
            We may update this Privacy Policy from time to time. Significant changes will be communicated through the app.
            Continued use of the app constitutes acceptance of the updated policy.
          </Section>

          <Section title="10. Contact Us">
            For privacy-related questions or data deletion requests, contact us at:
            <p className="text-muted-foreground text-xs mt-1 font-medium">privacy@raymaapp.com</p>
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