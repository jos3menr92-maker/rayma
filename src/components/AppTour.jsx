import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useT } from "@/lib/LanguageContext";
import { X, ChevronRight, ChevronLeft, Sparkles, CreditCard, Receipt, TrendingUp, LayoutDashboard, MoreHorizontal, CheckCircle2 } from "lucide-react";

const TOUR_STEPS = [
  {
    icon: Sparkles,
    titleKey: "tourWelcome", titleFallback: "Welcome to Rayma AI",
    descKey: "tourWelcomeDesc", descFallback: "Your personal financial co-pilot. Let's take a quick tour of the key features.",
  },
  {
    icon: LayoutDashboard,
    titleKey: "tourDashboard", titleFallback: "Your Dashboard",
    descKey: "tourDashboardDesc", descFallback: "This is your command center. See your cash flow, upcoming bills, loans, and financial health score at a glance.",
  },
  {
    icon: CreditCard,
    titleKey: "tourLoans", titleFallback: "Loans & Debt",
    descKey: "tourLoansDesc", descFallback: "Tap the Loans tab in the bottom menu to track balances, log payments, and watch your debt shrink.",
  },
  {
    icon: Receipt,
    titleKey: "tourBills", titleFallback: "Bills Tracking",
    descKey: "tourBillsDesc", descFallback: "Track all your upcoming bills, see due dates, and never miss a payment. Tap the Bills icon in the bottom nav.",
  },
  {
    icon: TrendingUp,
    titleKey: "tourFinance", titleFallback: "Finance Tab",
    descKey: "tourFinanceDesc", descFallback: "Tap the Finance button in the bottom nav to see your cash flow, track spending, manage budgets, and view all your transactions in one place.",
  },
  {
    icon: Sparkles,
    titleKey: "tourChat", titleFallback: "Rayma AI Assistant",
    descKey: "tourChatDesc", descFallback: "Tap the floating Rayma button anytime to chat, log transactions, or get advice — you can even drag it anywhere on screen.",
  },
  {
    icon: MoreHorizontal,
    titleKey: "tourMore", titleFallback: "More Features",
    descKey: "tourMoreDesc", descFallback: "Tap the More menu (•••) to access the Document Vault, Budget Dashboard, Tax Summary, Store, and more.",
  },
  {
    icon: CheckCircle2,
    titleKey: "tourDone", titleFallback: "You're All Set!",
    descKey: "tourDoneDesc", descFallback: "That's it! You're ready to take control of your finances. You can restart this tour anytime by asking Rayma AI.",
  },
];

export default function AppTour({ onboardingComplete = true }) {
  const T = useT();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const handler = () => {
      setActive(true);
      setStep(0);
    };
    window.addEventListener("trigger-rayma-tour", handler);

    // Auto-start for first-time users — only AFTER onboarding is complete
    const completed = localStorage.getItem("rayma_tour_completed");
    if (!completed && onboardingComplete) {
      const timer = setTimeout(() => setActive(true), 1200);
      return () => {
        window.removeEventListener("trigger-rayma-tour", handler);
        clearTimeout(timer);
      };
    }

    return () => window.removeEventListener("trigger-rayma-tour", handler);
  }, [onboardingComplete]);

  useEffect(() => {
    if (active) {
      document.body.classList.add("tour-active");
      return () => document.body.classList.remove("tour-active");
    }
  }, [active]);

  const handleClose = () => {
    localStorage.setItem("rayma_tour_completed", "true");
    setActive(false);
    setStep(0);
    // After the tour, pop Rayma up with a congratulatory greeting if onboarding just logged data
    try {
      if (sessionStorage.getItem("rayma_post_tour_greeting")) {
        sessionStorage.removeItem("rayma_post_tour_greeting");
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("rayma:open", { detail: { greeting: true } }));
        }, 700);
      }
    } catch (e) {}
  };

  const handleNext = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      handleClose();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const current = TOUR_STEPS[step];
  const Icon = current.icon;
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <AnimatePresence>
      {active && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[71] bg-card rounded-t-3xl border-t border-border shadow-2xl p-6 pb-8"
          >
            <button
              onClick={handleClose}
              aria-label={T("closeTour", "Close tour")}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5 mb-6">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : i < step ? "w-3 bg-primary/50" : "w-3 bg-muted"}`}
                />
              ))}
            </div>

            {/* Step content */}
            <div className="text-center max-w-sm mx-auto">
              <motion.div
                key={step}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"
              >
                <Icon className="w-8 h-8 text-primary" />
              </motion.div>

              <h2 className="text-xl font-bold font-heading text-foreground mb-2">
                {T(current.titleKey, current.titleFallback)}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {T(current.descKey, current.descFallback)}
              </p>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between max-w-sm mx-auto">
              <button
                onClick={handleBack}
                disabled={step === 0}
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground disabled:opacity-30 hover:text-foreground transition-colors px-3 py-2"
              >
                <ChevronLeft className="w-4 h-4" /> {T("back", "Back")}
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-1 text-sm font-bold text-primary-foreground bg-primary px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
              >
                {isLast ? T("gotIt", "Got it!") : T("next", "Next")} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}