import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabaseClient"; // 🚀 NEW: Added Supabase
import { useFinancialData } from "@/lib/FinancialDataContext"; // 🚀 NEW: To get the User ID
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { ChevronRight, DollarSign, Receipt, CreditCard, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STEPS = ["welcome", "income", "bill", "loan", "done"];

function ProgressDots({ step }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.filter(s => s !== "welcome" && s !== "done").map((s, i) => (
        <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${STEPS.indexOf(step) > i + 1 ? "w-6 bg-primary" : STEPS[STEPS.indexOf(step) - 1] === s || STEPS.indexOf(step) === i + 1 ? "w-6 bg-primary" : "w-3 bg-muted"}`} />
      ))}
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { supaUser, reload } = useFinancialData(); // 🚀 NEW: Grab the Supabase ID

  const T = useMemo(() =>
    (key, fallback) => {
      const translated = t(lang, key);
      return translated !== key ? translated : fallback;
    },
    [lang]
  );

  const [step, setStep] = useState("welcome");
  const [loading, setLoading] = useState(false);

  const [weeklyIncome, setWeeklyIncome] = useState("");
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [loanName, setLoanName] = useState("");
  const [loanBalance, setLoanBalance] = useState("");
  const [loanPayment, setLoanPayment] = useState("");

  async function handleIncome() {
    if (!weeklyIncome || isNaN(weeklyIncome)) { setStep("bill"); return; }
    setLoading(true);
    
    // 🚀 FIXED: Save to Supabase
    if (supaUser?.id) {
      try {
        const { error } = await supabase.from('incomes').insert([{
          user_id: supaUser.id,
          source: "Weekly Income",
          amount: parseFloat(weeklyIncome),
          frequency: "weekly",
          week_start: new Date().toISOString().split("T")[0],
          note: "Set during onboarding",
          is_active: true
        }]);
        if (error) throw error;
      } catch (err) {
        console.error("Onboarding Error:", err.message);
      }
    }
    
    setLoading(false);
    setStep("bill");
  }

  async function handleBill() {
    if (billName && billAmount && !isNaN(billAmount)) {
      setLoading(true);
      
      // 🚀 FIXED: Save to Supabase
      if (supaUser?.id) {
        try {
          const { error } = await supabase.from('bills').insert([{
            user_id: supaUser.id,
            name: billName,
            amount: parseFloat(billAmount),
            payment_frequency: "monthly",
            is_active: true
          }]);
          if (error) throw error;
        } catch (err) {
          console.error("Onboarding Error:", err.message);
        }
      }
      
      setLoading(false);
    }
    setStep("loan");
  }

  async function handleLoan() {
    if (loanName && loanBalance && !isNaN(loanBalance)) {
      setLoading(true);
      
      // 🚀 FIXED: Save to Supabase
      if (supaUser?.id) {
        try {
          const { error } = await supabase.from('loans').insert([{
            user_id: supaUser.id,
            name: loanName,
            original_amount: parseFloat(loanBalance),
            current_balance: parseFloat(loanBalance),
            remaining_balance: parseFloat(loanBalance),
            monthly_payment: loanPayment ? parseFloat(loanPayment) : 0,
            status: "active"
          }]);
          if (error) throw error;
          await reload();
        } catch (err) {
          console.error("Onboarding Error:", err.message);
        }
      }
      
      setLoading(false);
    }
    setStep("done");
  }

  async function finish() {
    await base44.auth.updateMe({ onboarding_complete: true });
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="w-full max-w-sm">
        <AnimatePresence mode="wait">
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
              <Button className="w-full rounded-2xl h-12 text-base" onClick={finish}>
                {T("goToDashboard", "Go to Dashboard")}
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}