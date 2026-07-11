import { base44 } from "@/api/base44Client";
import { ShieldCheck, TrendingDown, Brain, CalendarCheck, BarChart2, FileText, Star, CheckCircle2, ChevronRight, Menu, X } from "lucide-react";
import { useState, useMemo } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

const features = [
  { icon: TrendingDown, title: "Loan & Debt Tracker", desc: "Track every loan, see your balance drop, and know exactly when you'll be debt-free." },
  { icon: CalendarCheck, title: "Bill Calendar", desc: "Never miss a payment. See every due date on a calendar and get alerts before they hit." },
  { icon: BarChart2, title: "Net Worth Tracker", desc: "Connect your assets and liabilities to watch your net worth grow over time." },
  { icon: Brain, title: "Rayma AI Advisor", desc: "Your personal AI financial coach — analyzes your data and gives actionable, specific advice." },
  { icon: FileText, title: "Tax Summary", desc: "Auto-generated annual report with deductible categories. Export to CSV in one tap." },
  { icon: ShieldCheck, title: "Bank-Level Security", desc: "All data is encrypted, privately scoped per user, and never sold to third parties." },
];

const testimonials = [
  { name: "Maria R.", text: "Having all my loans and bills in one place finally made my finances feel manageable. Rayma AI keeps me focused on making progress.", stars: 5 },
  { name: "James T.", text: "Finally an app that doesn't require connecting to my bank and still gives me the full picture. I control my data.", stars: 5 },
  { name: "Priya S.", text: "The AI advisor helped me see exactly where my money was going and gave me a clear plan for tackling debt. Love it.", stars: 5 },
];

const faqs = [
  { q: "Is Rayma AI free?", a: "Yes — all core features (loans, bills, budget, net worth) are free forever. Rayma AI gives you 5 free consultations every month. Buy Insert Coin for a one-time energy boost, or subscribe to Lithium or Generator for daily energy bars." },
  { q: "Does Rayma AI connect to my bank?", a: "No. Rayma AI is manual-entry by design. Your financial data stays on your device and our secure servers — never shared with banks or third parties." },
  { q: "Is my data private?", a: "Absolutely. Every record is privately scoped to your account with row-level security. We never sell or share your data." },
  { q: "What platforms does Rayma AI work on?", a: "Rayma AI works on any device — iPhone, Android, tablet, or desktop — directly in your browser. You can also install it as an app from your browser." },
  { q: "What currencies and languages are supported?", a: "Rayma AI supports 25+ currencies and is available in 10 languages: English, Chinese, Hindi, Spanish, French, Arabic, Bengali, Portuguese, Russian, and Japanese. Set your preference in Profile settings." },
  { q: "How do I get started?", a: "Sign up for free, add your first loan or bill in under 2 minutes, and Rayma AI starts giving you insights immediately." },
];

function Stars({ n }) {
  return <div className="flex gap-0.5">{Array.from({ length: n }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}</div>;
}

export default function Landing() {
  const { lang } = useLanguage();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  // 🌍 FIXED: Recreate T() when lang changes so translations update in real-time
  const T = useMemo(() =>
    (key, fallback) => {
      const translated = t(lang, key);
      return translated !== key ? translated : fallback;
    },
    [lang]
  );

  // 🌍 MOVED: Features now use translations
  const features = [
    { icon: TrendingDown, titleKey: "loanDebtTracker", title: "Loan & Debt Tracker", descKey: "loanDesc", desc: "Track every loan, see your balance drop, and know exactly when you'll be debt-free." },
    { icon: CalendarCheck, titleKey: "billCalendar", title: "Bill Calendar", descKey: "billCalendarDesc", desc: "Never miss a payment. See every due date on a calendar and get alerts before they hit." },
    { icon: BarChart2, titleKey: "netWorthTracker", title: "Net Worth Tracker", descKey: "netWorthDesc", desc: "Connect your assets and liabilities to watch your net worth grow over time." },
    { icon: Brain, titleKey: "raymaAI", title: "Rayma AI Advisor", descKey: "aiDesc", desc: "Your personal AI financial coach — analyzes your data and gives actionable, specific advice." },
    { icon: FileText, titleKey: "taxSummary", title: "Tax Summary", descKey: "taxDesc", desc: "Auto-generated annual report with deductible categories. Export to CSV in one tap." },
    { icon: ShieldCheck, titleKey: "bankSecurity", title: "Bank-Level Security", descKey: "securityDesc", desc: "All data is encrypted, privately scoped per user, and never sold to third parties." },
  ];

  // 🌍 MOVED: Testimonials with translation keys
  const testimonials = [
    { nameKey: "testimonial1Name", name: "Maria R.", textKey: "testimonial1Text", text: "Having all my loans and bills in one place finally made my finances feel manageable. Rayma AI keeps me focused on making progress.", stars: 5 },
    { nameKey: "testimonial2Name", name: "James T.", textKey: "testimonial2Text", text: "Finally an app that doesn't require connecting to my bank and still gives me the full picture. I control my data.", stars: 5 },
    { nameKey: "testimonial3Name", name: "Priya S.", textKey: "testimonial3Text", text: "The AI advisor helped me see exactly where my money was going and gave me a clear plan for tackling debt. Love it.", stars: 5 },
  ];

  // 🌍 MOVED: FAQs with translation keys
  const faqs = [
    { qKey: "faq1Q", q: "Is Rayma AI free?", aKey: "faq1A", a: "Yes — all core features (loans, bills, budget, net worth) are free forever. Rayma AI gives you 5 free consultations every month. Buy token packs if you need more, or get the Annual Pass for unlimited AI." },
    { qKey: "faq2Q", q: "Does Rayma AI connect to my bank?", aKey: "faq2A", a: "No. Rayma AI is manual-entry by design. Your financial data stays on your device and our secure servers — never shared with banks or third parties." },
    { qKey: "faq3Q", q: "Is my data private?", aKey: "faq3A", a: "Absolutely. Every record is privately scoped to your account with row-level security. We never sell or share your data." },
    { qKey: "faq4Q", q: "What platforms does Rayma AI work on?", aKey: "faq4A", a: "Rayma AI works on any device — iPhone, Android, tablet, or desktop — directly in your browser. You can also install it as an app from your browser." },
    { qKey: "faq5Q", q: "What currencies and languages are supported?", aKey: "faq5A", a: "Rayma AI supports 25+ currencies and is available in 10 languages: English, Chinese, Hindi, Spanish, French, Arabic, Bengali, Portuguese, Russian, and Japanese. Set your preference in Profile settings." },
    { qKey: "faq6Q", q: "How do I get started?", aKey: "faq6A", a: "Sign up for free, add your first loan or bill in under 2 minutes, and Rayma AI starts giving you insights immediately." },
  ];

  const handleLogin = () => base44.auth.redirectToLogin();

  return (
    <div className="min-h-screen bg-background text-foreground font-body">

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold font-heading text-foreground">Rayma AI</span>
          </div>
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">{T("features", "Features")}</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">{T("reviews", "Reviews")}</a>
            <a href="#faq" className="hover:text-foreground transition-colors">{T("faq", "FAQ")}</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">{T("pricing", "Pricing")}</a>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button onClick={handleLogin} className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
              {T("signIn", "Sign in")}
            </button>
            <button onClick={handleLogin} className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-1.5 rounded-xl hover:bg-primary/90 transition-colors">
              {T("getStartedFree", "Get Started Free")}
            </button>
          </div>
          <button className="md:hidden p-2 text-muted-foreground" onClick={() => setMobileMenu(v => !v)}>
            {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileMenu && (
          <div className="md:hidden border-t border-border bg-background px-4 py-4 space-y-3">
            {[{key: "features", label: "Features"}, {key: "testimonials", label: "Reviews"}, {key: "faq", label: "FAQ"}, {key: "pricing", label: "Pricing"}].map(s => (
              <a key={s.key} href={`#${s.key}`} onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-muted-foreground hover:text-foreground capitalize">
                {s.label}
              </a>
            ))}
            <button onClick={handleLogin} className="w-full mt-2 text-sm font-semibold bg-primary text-primary-foreground px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors">
              {T("getStartedFree", "Get Started Free")}
            </button>
          </div>
        )}
      </nav>

      {/* Disclaimer Banner */}
      <div className="bg-muted/60 border-b border-border py-2 px-4 text-center">
        <p className="text-[11px] text-muted-foreground">
          {T("disclaimerLanding", "Rayma AI is a personal finance tracking tool — not a financial advisor. All information is for tracking purposes only.")} <a href="/terms" className="underline hover:text-foreground">{T("terms", "Terms")}</a> · <a href="/privacy" className="underline hover:text-foreground">{T("privacy", "Privacy")}</a>
        </p>
      </div>

      {/* HERO */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <Star className="w-3 h-3 fill-primary" /> {T("freeForeverNoBankConnection", "Free forever · No bank connection required")}
        </div>
        <h1 className="text-4xl md:text-6xl font-bold font-heading text-foreground leading-tight mb-5">
          {T("takeControl", "Take Control of Your")}<br />
          <span className="text-primary">{T("debtBillsHero", "Debt & Bills")}</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
          {T("heroDescription", "Rayma AI tracks your loans, bills, budget, and net worth — all in one place. Your AI financial coach tells you exactly what to do next.")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <button onClick={handleLogin} className="flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-2xl hover:bg-primary/90 transition-colors text-base">
            {T("startTrackingFree", "Start Tracking Free")} <ChevronRight className="w-4 h-4" />
          </button>
          <a href="#features" className="flex items-center justify-center gap-2 border border-border text-foreground font-semibold px-6 py-3 rounded-2xl hover:border-primary/40 transition-colors text-base">
            {T("seeHowItWorks", "See How It Works")}
          </a>
        </div>
        {/* Social proof bar */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> {T("noCreditCard", "No credit card required")}</div>
          <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> {T("noBankLogin", "No bank login")}</div>
          <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> {T("worksAnyDevice", "Works on any device")}</div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-muted/40 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold font-heading text-foreground mb-3">{T("everythingYouNeed", "Everything you need to get out of debt")}</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">{T("builtForRealPeople", "Built for real people managing real debt — not investors or finance pros.")}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold font-heading text-foreground mb-3">{T("whatUsersSaying", "What users are saying")}</h2>
            <p className="text-muted-foreground">{T("joinPeople", "Join people around the world tracking their path to financial clarity.")}</p>
            <p className="text-[11px] text-muted-foreground mt-1 italic">{T("testimonialNote", "Testimonials are illustrative of typical user experiences.")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-card border border-border rounded-2xl p-5">
                <Stars n={t.stars} />
                <p className="text-sm text-muted-foreground leading-relaxed mt-3 mb-4">"{t.text}"</p>
                <p className="text-sm font-semibold text-foreground">— {t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-muted/40 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold font-heading text-foreground mb-3">{T("simplePricing", "Simple, honest pricing")}</h2>
          <p className="text-muted-foreground mb-10">{T("pricingDesc", "No hidden fees. Core features are free forever — pay only for extra AI consultations if you need them.")}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {/* Free */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{T("freePlan", "Free Forever")}</p>
              <p className="text-3xl font-bold font-heading text-foreground mb-1">$0</p>
              <p className="text-xs text-muted-foreground mb-4">{T("freeIncluded", "5 AI consults/month included")}</p>
              {[T("featureLoans", "Loans & debt tracking"), T("featureBills", "Bills & calendar"), T("featureBudget", "Budget categories"), T("featureNetWorth", "Net worth tracking"), T("featureDocuments", "Document vault"), T("featureAIFree", "5 free AI queries/mo")].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground mb-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />{f}
                </div>
              ))}
            </div>
            {/* Insert Coin */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{T("insertCoin", "Insert Coin")}</p>
              <p className="text-3xl font-bold font-heading text-foreground mb-1">$1.99</p>
              <p className="text-xs text-muted-foreground mb-4">{T("oneTimeInstantEnergy", "One-time · Instant Energy")}</p>
              {[T("featureInstantEnergy", "Instant energy boost"), T("featureAnytime", "Use anytime"), T("featureNoExpiry", "No expiry"), T("featureOccasional", "Great for occasional use")].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground mb-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />{f}
                </div>
              ))}
            </div>
            {/* Lithium */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-300 rounded-2xl p-5 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">{T("popular", "POPULAR")}</div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-1">{T("lithium", "Lithium")}</p>
              <p className="text-3xl font-bold font-heading text-foreground mb-1">$5.99<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <p className="text-xs text-muted-foreground mb-4">{T("lithiumDesc", "$5.99/mo or $49.99/year · 50 daily energy bars")}</p>
              {[T("feature50DailyEnergy", "50 daily energy bars"), T("featureMonthly", "Billed monthly"), T("featureAnnual", "or $49.99/year"), T("featureBestValue", "Best per-token value")].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground mb-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />{f}
                </div>
              ))}
            </div>
            {/* Generator */}
            <div className="bg-primary/5 border-2 border-primary rounded-2xl p-5 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-0.5 rounded-full">{T("bestValue", "BEST VALUE")}</div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">{T("generator", "Generator")}</p>
              <p className="text-3xl font-bold font-heading text-foreground mb-1">$11.99<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <p className="text-xs text-muted-foreground mb-4">{T("generatorDesc", "$11.99/mo or $95.99/year · 200 daily energy bars")}</p>
              {[T("feature200DailyEnergy", "200 daily energy bars"), T("featureAllFeatures", "All future features"), T("featurePriority", "Priority experience"), T("featureAnnualGen", "or $95.99/year")].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground mb-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />{f}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 justify-center text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> {T("availableWorldwide", "Available worldwide")}</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> {T("currenciesSupported", "25+ currencies supported")}</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> {T("languagesAvailable", "10 languages available")}</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> {T("securePayment", "Secure card payment via Stripe")}</span>
          </div>
          <button onClick={handleLogin} className="mt-8 bg-primary text-primary-foreground font-semibold px-8 py-3 rounded-2xl hover:bg-primary/90 transition-colors text-base">
            {T("getStartedNoCard", "Get Started Free — No Card Needed")}
          </button>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold font-heading text-foreground text-center mb-10">{T("faqTitle", "Frequently Asked Questions")}</h2>
          <div className="space-y-3">
            {faqs.map((item, i) => (
              <div key={i} className="border border-border rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/40 transition-colors"
                >
                  <span className="font-semibold text-sm text-foreground">{item.q}</span>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ml-3 ${openFaq === i ? "rotate-90" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16 text-center">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-3xl font-bold font-heading text-primary-foreground mb-3">{T("startJourney", "Start your debt-free journey today")}</h2>
          <p className="text-primary-foreground/80 mb-7">{T("journeyDesc", "Free to start. Takes 2 minutes. No bank login required.")}</p>
          <button onClick={handleLogin} className="bg-white text-primary font-bold px-8 py-3 rounded-2xl hover:bg-white/90 transition-colors text-base">
            {T("createFreeAccount", "Create Free Account")}
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Rayma AI</span>
            <span>· {T("debtBillsTracker", "Debt & Bills Tracker")}</span>
          </div>
          <div className="flex gap-5">
            <a href="/privacy" className="hover:text-foreground transition-colors">{T("privacyPolicy", "Privacy Policy")}</a>
            <a href="/terms" className="hover:text-foreground transition-colors">{T("termsOfService", "Terms of Service")}</a>
            <button onClick={handleLogin} className="hover:text-foreground transition-colors">{T("signIn", "Sign In")}</button>
          </div>
          <p>© {new Date().getFullYear()} Rayma AI. {T("allRightsReserved", "All rights reserved.")}</p>
        </div>
      </footer>

    </div>
  );
}