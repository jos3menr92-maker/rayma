import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { createRecord } from "@/lib/supabaseHelpers";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage, useT } from "@/lib/LanguageContext";
import { ChevronRight, DollarSign, Receipt, CreditCard, CheckCircle2, Loader2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

const STEPS = ["language", "welcome", "income", "bill", "loan", "done"];

const LANG_OPTIONS = [
  { code: "en", locale: "en-US", label: "English", flag: "🇺🇸" },
  { code: "es", locale: "es-CO", label: "Español", flag: "🇪🇸" },
  { code: "pt", locale: "pt-BR", label: "Português", flag: "🇧🇷" },
  { code: "fr", locale: "fr-FR", label: "Français", flag: "🇫🇷" },
  { code: "de", locale: "de-DE", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", locale: "it-IT", label: "Italiano", flag: "🇮🇹" },
  { code: "ja", locale: "ja-JP", label: "日本語", flag: "🇯🇵" },
  { code: "zh", locale: "zh-CN", label: "中文", flag: "🇨🇳" },
  { code: "hi", locale: "hi-IN", label: "हिन्दी", flag: "🇮🇳" },
  { code: "ar", locale: "ar-AE", label: "العربية", flag: "🇦🇪" },
  { code: "ru", locale: "ru-RU", label: "Русский", flag: "🇷🇺" },
  { code: "bn", locale: "bn-BD", label: "বাংলা", flag: "🇧🇩" },
];

function ProgressDots({ step }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.filter(s => s !== "welcome" && s !== "done" && s !== "language").map((s, i) => (
        <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${STEPS.indexOf(step) > i + 1 ? "w-6 bg-primary" : STEPS[STEPS.indexOf(step) - 1] === s || STEPS.indexOf(step) === i + 1 ? "w-6 bg-primary" : "w-3 bg-muted"}`} />
      ))}
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { lang, setLang, setLocale } = useLanguage();
  const { reload, userProfile, bankAccounts } = useFinancialData();
  const T = useT();

  const [step, setStep] = useState("language");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [weeklyIncome, setWeeklyIncome] = useState("");
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [loanName, setLoanName] = useState("");
  const [loanBalance, setLoanBalance] = useState("");
  const [loanPayment, setLoanPayment] = useState("");
  const [billDueDay, setBillDueDay] = useState("");
  const [loanDueDay, setLoanDueDay] = useState("");
  const [savingLang, setSavingLang] = useState(false);
  const finishRef = useRef(false);

  async function selectLanguage(code, localeCode) {
    setSavingLang(true);
    setLang(code);
    setLocale(localeCode);
    try {
      await base44.auth.updateMe({ preferred_language: code, preferred_locale: localeCode });
    } catch (err) {
      console.error("Language save failed:", err?.message);
    }
    setSavingLang(false);
    setStep("welcome");
  }

  // Steps advance only — all data is logged at finish() via the working createRecord path
  function handleIncome() { setStep("bill"); }
  function handleBill() { setStep("loan"); }
  function handleLoan() { setStep("done"); }

  // Hand everything to Rayma's logging path (createRecord — same one manual forms use,
  // with session recovery + manageFinancialRecord fallback). Free: direct Supabase write, no AI tokens.
  async function finish() {
    if (finishRef.current) return;
    finishRef.current = true;
    setLoading(true);
    const logged = [];

    if (weeklyIncome && !isNaN(weeklyIncome)) {
      try {
        await createRecord('incomes', {
          source: "Weekly Income",
          amount: parseFloat(weeklyIncome),
          frequency: "weekly",
          week_start: new Date().toISOString().split("T")[0],
          note: "Set during onboarding",
          is_active: true
        });
        logged.push("income");
      } catch (err) {
        console.error("Onboarding income log failed:", err?.message);
      }
    }

    if (billName && billAmount && !isNaN(billAmount)) {
      try {
        const dueDay = billDueDay ? Math.min(31, Math.max(1, parseInt(billDueDay))) : 1;
        await createRecord('bills', {
          name: billName,
          amount: parseFloat(billAmount),
          payment_frequency: "monthly",
          due_day: dueDay,
          category: "other",
          is_active: true
        });
        logged.push("bill");
      } catch (err) {
        console.error("Onboarding bill log failed:", err?.message);
      }
    }

    if (loanName && loanBalance && !isNaN(loanBalance)) {
      try {
        const dueDay = loanDueDay ? Math.min(31, Math.max(1, parseInt(loanDueDay))) : 1;
        await createRecord('loans', {
          name: loanName,
          original_amount: parseFloat(loanBalance),
          current_balance: parseFloat(loanBalance),
          remaining_balance: parseFloat(loanBalance),
          monthly_payment: loanPayment ? parseFloat(loanPayment) : 0,
          payment_frequency: "monthly",
          due_day: dueDay,
          start_date: new Date().toISOString().split("T")[0],
          category: "other",
          status: "active"
        });
        logged.push("loan");
      } catch (err) {
        console.error("Onboarding loan log failed:", err?.message);
      }
    }

    // Auto-provision default checking account if user has no accounts
    if (bankAccounts && bankAccounts.length === 0) {
      try {
        const firstName = userProfile?.preferred_name || userProfile?.full_name?.split(' ')[0];
        const accountName = firstName ? `${firstName}'s Checking` : "Primary Checking";
        
        await createRecord('bank_accounts', {
          name: accountName,
          institution: "Primary",
          account_type: "checking",
          balance: 0.00,
          currency: userProfile?.preferred_currency || "USD",
          is_primary: true,
          is_active: true,
          link_method: "manual"
        });
      } catch (err) {
        console.error("Onboarding auto-provision bank account failed:", err?.message);
      }
    }

    try { await reload(); } catch (e) {}

    // Flag for Rayma to greet the user after the tour — only if something was actually logged
    if (logged.length > 0) {
      try { sessionStorage.setItem("rayma_post_tour_greeting", "true"); } catch (e) {}
    }

    await base44.auth.updateMe({ onboarding_complete: true });
    setLoading(false);
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="w-full max-w-sm">
        <AnimatePresence mode="wait">
          {/* LANGUAGE */}
          {step === "language" && (
            <motion.div key="language" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Globe className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-3xl font-bold font-heading text-foreground mb-3">{T("chooseLanguage", "Choose your language")}</h1>
              <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                {T("chooseLanguageDesc", "Select your preferred language. You can change this anytime in Settings.")}
              </p>
              <div className="grid grid-cols-3 gap-2 mb-8 max-h-72 overflow-y-auto">
                {LANG_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    onClick={() => selectLanguage(opt.code, opt.locale)}
                    disabled={savingLang}
                    className={`flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all ${lang === opt.code ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted"}`}
                  >
                    <span className="text-2xl">{opt.flag}</span>
                    <span className="text-xs font-medium text-foreground">{opt.label}</span>
                  </button>
                ))}
              </div>
              {savingLang && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> {T("saving", "Saving...")}
                </div>
              )}
            </motion.div>
          )}

          {/* WELCOME */}
          {step === "welcome" && (
            <motion.div key="welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">💸</span>
              </div>
              <h1 className="text-3xl font-bold font-heading text-foreground mb-3">{T("welcomeRayma", "Welcome to Rayma AI")}</h1>
              <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                {T("onboardingDesc", "Your personal finance tracker for loans, bills, and budgets. Let's get you set up in under a minute.")}
              </p>
              <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 mb-8 text-left">
                <p className="text-xs font-semibold text-destructive mb-1">⚠️ {T("importantLabel", "Important")}</p>
                <p className="text-xs text-muted-foreground">{T("disclaimerOnboarding", "Rayma AI is a personal tracking tool, not a financial advisor. Always consult a qualified professional before making major financial decisions.")}</p>
              </div>
              <Button className="w-full rounded-2xl h-12 text-base" onClick={() => setStep("income")}>
                {T("getStarted", "Get Started")} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <button onClick={finish} className="text-xs text-muted-foreground mt-4 underline">{T("skipSetup", "Skip setup")}</button>
            </motion.div>
          )}

          {/* INCOME */}
          {step === "income" && (
            <motion.div key="income" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
              <ProgressDots step={step} />
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <DollarSign className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold font-heading text-foreground mb-2">{T("howMuchEarn", "How much do you earn weekly?")}</h2>
              <p className="text-sm text-muted-foreground mb-6">{T("incomeHelps", "This helps Rayma AI calculate your monthly cash flow. You can update it anytime.")}</p>
              <div className="relative mb-6">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                <Input type="number" placeholder={T("exampleAmount", "e.g. 800")} value={weeklyIncome} onChange={e => setWeeklyIncome(e.target.value)} className="pl-7 rounded-xl h-12 text-base" />
              </div>
              <Button className="w-full rounded-2xl h-12" onClick={handleIncome} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : T("continue", "Continue")}
              </Button>
              <button onClick={() => setStep("bill")} className="text-xs text-muted-foreground mt-4 underline w-full text-center">{T("skipForNow", "Skip for now")}</button>
            </motion.div>
          )}

          {/* BILL */}
          {step === "bill" && (
            <motion.div key="bill" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
              <ProgressDots step={step} />
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <Receipt className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold font-heading text-foreground mb-2">{T("addFirstBill", "Add your first bill")}</h2>
              <p className="text-sm text-muted-foreground mb-6">{T("billExamples", "Rent, Netflix, electricity — anything you pay regularly.")}</p>
              <div className="space-y-3 mb-6">
                <Input placeholder={T("billNameEx", "Bill name (e.g. Netflix)")} value={billName} onChange={e => setBillName(e.target.value)} className="rounded-xl h-12" />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                  <Input type="number" placeholder={T("monthlyAmount", "Monthly amount")} value={billAmount} onChange={e => setBillAmount(e.target.value)} className="pl-7 rounded-xl h-12" />
                </div>
                <Input type="number" min="1" max="31" placeholder={T("dueDayOptional", "Due day of month (1-31, optional — recurs monthly)")} value={billDueDay} onChange={e => setBillDueDay(e.target.value)} className="rounded-xl h-12" />
              </div>
              <Button className="w-full rounded-2xl h-12" onClick={handleBill} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : T("continue", "Continue")}
              </Button>
              <button onClick={() => setStep("loan")} className="text-xs text-muted-foreground mt-4 underline w-full text-center">{T("skipForNow", "Skip for now")}</button>
            </motion.div>
          )}

          {/* LOAN */}
          {step === "loan" && (
            <motion.div key="loan" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
              <ProgressDots step={step} />
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <CreditCard className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold font-heading text-foreground mb-2">{T("anyLoans", "Any loans or debt?")}</h2>
              <p className="text-sm text-muted-foreground mb-6">{T("loanExamples", "Car loan, student debt, credit card — Rayma AI tracks it all.")}</p>
              <div className="space-y-3 mb-6">
                <Input placeholder={T("loanNameEx", "Loan name (e.g. Car Loan)")} value={loanName} onChange={e => setLoanName(e.target.value)} className="rounded-xl h-12" />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                  <Input type="number" placeholder={T("currentBalance", "Current balance")} value={loanBalance} onChange={e => setLoanBalance(e.target.value)} className="pl-7 rounded-xl h-12" />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                  <Input type="number" placeholder={T("monthlyPaymentOpt", "Monthly payment (optional)")} value={loanPayment} onChange={e => setLoanPayment(e.target.value)} className="pl-7 rounded-xl h-12" />
                </div>
                <Input type="number" min="1" max="31" placeholder={T("dueDayOptional", "Due day of month (1-31, optional — recurs monthly)")} value={loanDueDay} onChange={e => setLoanDueDay(e.target.value)} className="rounded-xl h-12" />
              </div>
              <Button className="w-full rounded-2xl h-12" onClick={handleLoan} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : T("continue", "Continue")}
              </Button>
              <button onClick={() => setStep("done")} className="text-xs text-muted-foreground mt-4 underline w-full text-center">{T("skipForNow", "Skip for now")}</button>
            </motion.div>
          )}

          {/* DONE */}
          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 200 }} className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </motion.div>
              <h2 className="text-2xl font-bold font-heading text-foreground mb-3">{T("allSet", "You're all set! 🎉")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                {T("readyHelp", "Rayma AI is ready to help you track your finances. You can always add more loans, bills, and income from the dashboard.")}
              </p>
              <Button className="w-full rounded-2xl h-12 text-base" onClick={finish} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : T("goToDashboard", "Go to Dashboard")}
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}