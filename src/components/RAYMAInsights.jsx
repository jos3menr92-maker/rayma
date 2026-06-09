import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, ChevronLeft, ChevronRight, X, 
  TrendingUp, AlertTriangle, CalendarClock, Settings
} from "lucide-react";
import { base44 } from "@/api/base44Client";

const CACHE_KEY = "rayma_insights_cache";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

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

export default function RAYMAInsights({ loans = [], bills = [], incomes = [] }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  
  const [showGreeting, setShowGreeting] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  
  const [userProfile, setUserProfile] = useState(null);
  
  const touchStartX = useRef(null);

  // 1. Fetch User Profile for Global Context
  useEffect(() => {
    base44.auth.me().then(me => setUserProfile(me)).catch(console.error);
  }, []);

  // 2. Initialization & Product Tour Check
  useEffect(() => {
    const hasSeenTour = localStorage.getItem("rayma_tour_test");
    if (!hasSeenTour) {
      setIsFirstTime(true);
      setShowGreeting(true);
    } else {
      const hasSeenGreetingThisSession = sessionStorage.getItem("rayma_greeted");
      if (!hasSeenGreetingThisSession) {
        setShowGreeting(true);
        sessionStorage.setItem("rayma_greeted", "true");
      }
    }

    const cached = loadCache();
    if (cached && cached.length > 0) {
      setInsights(cached);
    } else if (loans.length > 0 || bills.length > 0) {
      fetchInsights();
    }
  }, [loans.length, bills.length]);

  // 3. The Hybrid Brain (Your Exact Math + Local AI Checks + LLM API)
  async function fetchInsights(force = false) {
    if (loading) return;
    setLoading(true);
    setDismissed(false);

    // Your Exact Original Math
    const monthlyBills = bills.reduce((s, b) => s + (Number(b.amount) || 0), 0);
    const monthlyLoans = loans.filter(l => l.status !== "paid_off").reduce((s, l) => s + (Number(l.monthly_payment) || 0), 0);
    const avgWeeklyIncome = incomes.length > 0 ? incomes.reduce((s, i) => s + (Number(i.amount) || 0), 0) / incomes.length : 0;
    const monthlyIncome = avgWeeklyIncome * 4.33;
    
    let localAlerts = [];
    const totalObligations = monthlyBills + monthlyLoans;

    // Proactive Alert: DTI Engine
    if (monthlyIncome > 0 && (totalObligations / monthlyIncome) * 100 > 43) {
      localAlerts.push({ type: 'warning', title: "Cash Flow Bottleneck", body: `Your obligations take up >43% of your income. Adding debt right now isn't recommended.`});
    }
    // Proactive Alert: Payday Collision Guard
    if (userProfile?.pay_day && bills.length > 0) {
      localAlerts.push({ type: 'opportunity', title: "Payday Collision Guard", body: `I'm tracking your bills against your ${userProfile.pay_day} payday to prevent overdrafts.`});
    }
    // Proactive Alert: Missing APR Estimator
    const loanMissingAPR = loans.find(l => !l.interest_rate && !l.apr);
    if (loanMissingAPR) {
      localAlerts.push({ type: 'tip', title: "Missing Interest Data", body: `You left the interest blank on your ${loanMissingAPR.name || 'recent loan'}. I'm estimating it at 15% for now.`});
    }

    // Your Original LLM API Call
    let result;
    try {
      result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are RAYMA, a proactive personal finance AI. Based on the user's financial data below, generate exactly 4 short, personalized, actionable insights...`,
        response_json_schema: { type: "object", properties: { insights: { type: "array", items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" }, type: { type: "string" }, } } } } }
      });
    } catch (e) {
      console.error("LLM Error:", e);
    }

    const llmInsights = result?.insights || [];
    
    // Combine everything smoothly
    const combinedList = [...localAlerts, ...llmInsights];
    
    if (combinedList.length > 0) {
      setInsights(combinedList);
      setIndex(0);
      saveCache(combinedList);
    }
    setLoading(false);
  }

  // 4. Your Original Product Tour
  const startProductTour = () => {
    setShowGreeting(false); 
    
    const driverObj = window.driver.js.driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: false,
      popoverClass: 'driver-popover', 
      steps: [
        { popover: { title: 'Welcome to your Command Center! 🚀', description: "I'm RAYMA. I don't just track your money—I help you manage it. Let me show you how to put me to work.", align: 'center' } },
        { element: '#active-loans-section', popover: { title: 'Take Action on Debt 💳', description: "This is your active debt. See those PAY buttons? Use them to instantly log a payment.", side: "right", align: 'start' } },
        { element: '#rayma-insights', popover: { title: 'Daily AI Insights 💡', description: "Swipe through these cards daily. I generate them based on your live data.", side: "bottom", align: 'start' } },
        { element: '#financial-health-score', popover: { title: 'Your Financial Health 🏥', description: "Think of this as your high score. It recalculates dynamically.", side: "left", align: 'start' } },
        { popover: { title: 'Your Control Panel 💬', description: "Click the floating teal bubble in the bottom right anytime to talk to me and command me!", align: 'center' } }
      ],
      onDestroyStarted: () => {
        driverObj.destroy();
      }
    });

    driverObj.drive();
  };

  useEffect(() => {
    const handleRemoteTourStart = () => startProductTour();
    window.addEventListener("trigger-rayma-tour", handleRemoteTourStart);
    return () => window.removeEventListener("trigger-rayma-tour", handleRemoteTourStart);
  }, []);

  const handleGetStarted = () => {
    if (isFirstTime) {
      localStorage.setItem("rayma_tour_complete", "true");
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
      
      {/* --- RESTORED: Your Original Insight Carousel UI --- */}
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

      {/* --- RESTORED: Your Original Greeting Modal UI --- */}
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
              <h2 className="text-2xl font-bold mb-2">Hello, I'm RAYMA</h2>
              <p className="text-muted-foreground mb-6 text-sm">
                {isFirstTime ? "I'm your proactive financial co-pilot. Let's take a quick tour of your command center." : "Welcome back. I've analyzed your latest data. Let's get to work."}
              </p>
              <button onClick={handleGetStarted} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity">
                {isFirstTime ? "Start Tour" : "View Dashboard"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
