import { useNavigate } from "react-router-dom";
import { ChevronLeft, Mail, Phone, Globe, Shield, FileText, Headphones, Building2 } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { useMemo } from "react";

export default function BusinessInfo() {
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

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-heading">{T("businessInfoTitle", "Business Information")}</h1>
          <p className="text-sm text-muted-foreground">Rayma AI</p>
        </div>
      </div>

      <div className="space-y-6 text-sm leading-relaxed">
        {/* Company Identity */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-base font-semibold mb-3">{T("companyIdentity", "Company Identity")}</h2>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{T("legalName", "Legal Name")}</dt>
              <dd className="font-medium text-right">Rayma AI</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{T("product", "Product")}</dt>
              <dd className="font-medium text-right">Rayma AI Mobile & Web Application</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{T("category", "Category")}</dt>
              <dd className="font-medium text-right">{T("categoryFinance", "Financial Technology / Personal Finance")}</dd>
            </div>
          </dl>
        </section>

        {/* Contact */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-base font-semibold mb-4">{T("contactSupport", "Contact & Support")}</h2>
          <div className="space-y-3">
            <a href="mailto:rayma.app2026@gmail.com" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{T("emailLabel", "Email")}</p>
                <p className="font-medium">rayma.app2026@gmail.com</p>
              </div>
            </a>
            <a href="tel:+18166142216" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Phone className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{T("phoneLabel", "Phone")}</p>
                <p className="font-medium">+1 816-614-2216</p>
              </div>
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {T("supportHours", "Support is available via email and phone. For in-app support, open the Rayma AI app and visit the Support Center.")}
          </p>
        </section>

        {/* Payments */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-base font-semibold mb-3">{T("paymentProcessor", "Payment Processing")}</h2>
          <div className="flex items-start gap-3 mb-3">
            <Globe className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p>
              {T("paymentProcessorBody", "All payments for Rayma AI subscriptions and one-time purchases are processed securely by Stripe. Rayma AI does not store your credit card information.")}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p>
              {T("chargeDescriptor", "Charges will appear on your statement as \"RAYMA AI\". If you believe a charge was made in error, contact us within 7 days.")}
            </p>
          </div>
        </section>

        {/* In-App Support */}
        <section className="bg-primary/5 border border-primary/20 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Headphones className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h2 className="text-base font-semibold mb-1">{T("needHelp", "Need Help with a Payment?")}</h2>
              <p className="text-sm text-muted-foreground mb-3">
                {T("inAppSupportBody", "Open the Rayma AI app and tap Support in the menu. Our AI Payment Assistant can check your transactions, answer billing questions, and create a support ticket if needed.")}
              </p>
            </div>
          </div>
        </section>

        {/* Legal Links */}
        <section className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate("/terms")}
            className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <FileText className="w-4 h-4" />
            {T("termsOfService", "Terms of Service")}
          </button>
          <button
            onClick={() => navigate("/privacy")}
            className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <Shield className="w-4 h-4" />
            {T("privacyPolicy", "Privacy Policy")}
          </button>
        </section>

        <p className="text-xs text-muted-foreground text-center pt-4">
          {T("lastUpdatedJuly", "Last updated: July 2026")}
        </p>
      </div>
    </div>
  );
}