import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, ChevronLeft, ChevronRight, X, 
  TrendingUp, AlertTriangle, CalendarClock, Settings
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

const CACHE_KEY = "rayma_insights_cache";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const TOUR_COMPLETED_KEY = "rayma_tour_completed";

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed.insights;
  } catch {
    return null;
  }
}

function saveCache(insights) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ insights, timestamp: Date.now() }));
}

export default function RAYMAInsights({ loans = [], bills = [], incomes = [], userProfile = null }) {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  
  const [showGreeting, setShowGreeting] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  
  const touchStartX = useRef(null);

  useEffect(() => {
    const tourCompleted = localStorage.getItem(TOUR_COMPLETED_KEY);
    const hasSeenGreetingThisSession = sessionStorage.getItem("rayma_greeted");
    
    if (!tourCompleted) {
      setIsFirstTime(true);
      setShowGreeting(true);
    } else if (!hasSeenGreetingThisSession) {
      setShowGreeting(true);
      sessionStorage.setItem("rayma_greeted", "true");
    }

    const cached = loadCache();
    if (cached && cached.length > 0) {
      setInsights(cached);
    } else if (loans.length > 0 || bills.length > 0) {
      fetchInsights();
    }
  }, [loans.length, bills.length]);

  async function fetchInsights(force = false) {
    if (loading) return;
    setLoading(true);
    setDismissed(false);

    const monthlyBills = bills.reduce((s, b) => s + (Number(b.amount) || 0), 0);
    const monthlyLoans = loans.filter(l => l.status !== "paid_off").reduce((s, l) => s + (Number(l.monthly_payment) || 0), 0);
    const avgWeeklyIncome = incomes.length > 0 ? incomes.reduce((s, i) => s + (Number(i.amount) || 0), 0) / incomes.length : 0;
    const monthlyIncome = avgWeeklyIncome * 4.33;
    
    let localAlerts = [];
    const totalObligations = monthlyBills + monthlyLoans;

    if (monthlyIncome > 0 && (totalObligations / monthlyIncome) * 100 > 43) {
      localAlerts.push({ type: 'warning', title: T("cashFlowBottleneck", "Cash Flow Bottleneck"), body: T("cashFlowBottleneckBody", "Your obligations take up >43% of your income. Adding debt right now isn't recommended.")});
    }
    if (userProfile?.pay_day && bills.length > 0) {
      localAlerts.push({ type: 'opportunity', title: T("paydayCollisionGuard", "Payday Collision Guard"), body: T("paydayCollisionBody", "I'm tracking your bills against your {pay_day} payday to prevent overdrafts.").replace("{pay_day}", userProfile.pay_day)});
    }
    const loanMissingAPR = loans.find(l => !l.interest_rate && !l.apr);
    if (loanMissingAPR) {
      localAlerts.push({ type: 'tip', title: T("missingInterestData", "Missing Interest Data"), body: T("missingInterestBody", "You left the interest blank on your {name}. I'm estimating it at 15% for now.").replace("{name}", loanMissingAPR.name || 'recent loan')});
    }

    let result;
    try {
      result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are Rayma AI, a proactive personal finance AI. Based on the user's financial data below, generate exactly 4 short, personalized, actionable insights...`,
        response_json_schema: { type: "object", properties: { insights: { type: "array", items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" }, type: { type: "string" } } } } } }
      });
    } catch (e) {
      console.error("LLM Error:", e);
    }

    const llmInsights = result?.insights || [];
    const combinedList = [...localAlerts, ...llmInsights];
    
    if (combinedList.length > 0) {
      setInsights(combinedList);
      setIndex(0);
      saveCache(combinedList);
    }
    setLoading(false);
  }

  // 4. APPLE/GOOGLE COMPLIANT LAZY-LOADER
  const startProductTour = () => {
    setShowGreeting(false);
    document.body.classList.add('tour-active');

    // Inject the script natively to bypass bundler limits and save app memory
    const loadDriverNatively = () => {
      return new Promise((resolve) => {
        if (window.driver) return resolve(window.driver);
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.js.iife.js';
        script.onload = () => resolve(window.driver);
        document.head.appendChild(script);
      });
    };

    const cleanupTour = () => {
      document.body.classList.remove('tour-active');
      navigate('/');
    };

    loadDriverNatively().then((driverModule) => {
      const driverObj = driverModule.js.driver({
        showProgress: true,
        animate: true,
        smoothScroll: true,
        allowClose: false,
        popoverClass: 'driver-popover rayma-flat-theme',
        steps: [
          { popover: { title: T("tourWelcomeTitle", "Welcome to your Command Center! 🚀"), description: T("tourWelcomeDesc", "I'm Rayma AI. I don't just track your money—I help you manage it. Let me show you how to put me to work."), align: 'center' } },
          { element: '#monthly-bills-section', popover: { title: T("tourBillsTitle", "Monthly Bills 🧾"), description: T("tourBillsDesc", "Your recurring bills live here. Tap any bill to manage it, or tap View All to see everything."), side: "right", align: 'start' } },
          { element: '#active-loans-section', popover: { title: T("tourDebtTitle", "Your Active Loans 💳"), description: T("tourDebtDesc", "Tap any loan to see its details, log payments, and track your payoff progress."), side: "right", align: 'start' } },
          { element: '#rayma-insights', popover: { title: T("tourInsightsTitle", "Daily AI Insights 💡"), description: T("tourInsightsDesc", "Swipe through these cards daily. I generate them based on your live data."), side: "bottom", align: 'start' } },
          { element: '#financial-health-score', popover: { title: T("tourHealthTitle", "Your Financial Health 🏥"), description: T("tourHealthDesc", "Think of this as your high score. It recalculates dynamically."), side: "left", align: 'start' } },
          { element: '#quick-add-button', popover: { title: T("tourQuickAddTitle", "Quick Add ➕"), description: T("tourQuickAddDesc", "This floating button lets you instantly add a loan, bill, income, or scan a document."), side: "right", align: 'center' } },
          { element: '#bottom-nav', popover: { title: T("tourNavTitle", "Navigation 🧭"), description: T("tourNavDesc", "Use this bar to jump between Home, Finance, Bills, and More features."), side: "top", align: 'center' } },
          { popover: { title: T("tourControlPanelTitle", "Your AI Co-Pilot 💬"), description: T("tourControlPanelDesc", "Tap the glowing button in the bottom center anytime to chat with me and command your finances. If you ever need another tour, just tell Rayma 'tour' and I'll walk you through the app again."), align: 'center' } }
        ],
        onDestroyStarted: () => {
          driverObj.destroy();
          cleanupTour();
        }
      });
      driverObj.drive();
    });
  };

  useEffect(() => {
    const handleRemoteTourStart = () => startProductTour();
    window.addEventListener("trigger-rayma-tour", handleRemoteTourStart);
    return () => {
      window.removeEventListener("trigger-rayma-tour", handleRemoteTourStart);
      document.body.classList.remove('tour-active');
    };
  }, []);

  const handleGetStarted = () => {
    if (isFirstTime) {
      localStorage.setItem(TOUR_COMPLETED_KEY, "true");
      setIsFirstTime(false);
      startProductTour();
    } else {
      setShowGreeting(false);
    }
  };

  const typeStyles = {
    tip: "border-primary/30 bg-primary/5 text-primary",
    warning: "border-amber-400/30 bg-amber-400/5 text-amber-500",
    opportunity: "border-chart-3/30 bg-chart-3/5 text-chart-3",
    win: "border-green-500/30 bg-green-500/10 text-green-500",
  };

  const nextInsight = () => setIndex((i) => (i + 1) % insights.length);
  const prevInsight = () => setIndex((i) => (i - 1 + insights.length) % insights.length);

  const current = insights[index];

  return (
    <div className="mb-6 space-y-4" id="rayma-insights">
      {insights.length > 0 && !dismissed && (
        <AnimatePresence mode="wait">
          <motion.div
            key={current?.title || index}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`relative p-5 rounded-3xl border transition-all duration-500 ${typeStyles[current?.type] || typeStyles.tip} backdrop-blur-sm shadow-sm`}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-background/80 shadow-sm">
                <Sparkles className="w-6 h-6 currentColor" />
              </div>
              <div className="flex-1 pr-8">
                <h3 className="font-bold text-foreground mb-1">{current?.title}</h3>
                <p className="text-sm text-foreground/80 leading-relaxed">{current?.body}</p>
              </div>
            </div>

            {insights.length > 1 && (
              <div className="absolute top-4 right-4 flex gap-1">
                <button onClick={prevInsight} className="p-1.5 rounded-full hover:bg-background/80 text-foreground/60 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={nextInsight} className="p-1.5 rounded-full hover:bg-background/80 text-foreground/60 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <AnimatePresence>
        {showGreeting && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <div className="bg-card border border-border p-6 rounded-3xl shadow-xl max-w-sm w-full text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{T("helloRayma", "Hello, I'm Rayma AI")}</h2>
              <p className="text-muted-foreground mb-6 text-sm">
                {isFirstTime ? T("raymaCoPilotIntro", "I'm your proactive financial co-pilot. Let's take a quick tour of your command center.") : T("raymaWelcomeBack", "Welcome back. I've analyzed your latest data. Let's get to work.")}
              </p>
              <button onClick={handleGetStarted} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity">
                {isFirstTime ? T("startTour", "Start Tour") : T("viewDashboard", "View Dashboard")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}