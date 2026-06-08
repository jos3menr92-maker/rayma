import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronLeft, ChevronRight, RefreshCw, X } from "lucide-react";
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

export default function RAYMAInsights({ loans, bills, incomes }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  
  // Greeting and First-Time states
  const [showGreeting, setShowGreeting] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  
  const touchStartX = useRef(null);

  useEffect(() => {
    // 1. Handle Greeting Logic
    const hasSeenTour = localStorage.getItem("rayma_tour_test");
    if (!hasSeenTour) {
      setIsFirstTime(true);
      setShowGreeting(true);
    } else {
      // Show greeting once per session for returning users
      const hasSeenGreetingThisSession = sessionStorage.getItem("rayma_greeted");
      if (!hasSeenGreetingThisSession) {
        setShowGreeting(true);
        sessionStorage.setItem("rayma_greeted", "true");
      }
    }

    // 2. Handle Data Fetching
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

    const monthlyBills = bills.reduce((s, b) => s + (b.amount || 0), 0);
    const monthlyLoans = loans.filter(l => l.status !== "paid_off").reduce((s, l) => s + (l.monthly_payment || 0), 0);
    const avgWeeklyIncome = incomes.length > 0 ? incomes.reduce((s, i) => s + (i.amount || 0), 0) / incomes.length : 0;
    const monthlyIncome = avgWeeklyIncome * 4.33;
    const today = new Date().getDate();

    let result;
    try {
      result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are RAYMA, a proactive personal finance AI. Based on the user's financial data below, generate exactly 4 short, personalized, actionable insights. Each should be a different type (e.g. debt tip, savings opportunity, upcoming risk, positive reinforcement). Be specific and reference real numbers from their data.

FINANCIAL DATA:
- Monthly income: $${monthlyIncome.toFixed(0)} (avg from weekly logs)
- Monthly loan payments: $${monthlyLoans.toFixed(0)}
- Monthly bills: $${monthlyBills.toFixed(0)}
- Monthly cash flow: $${(monthlyIncome - monthlyLoans - monthlyBills).toFixed(0)}
- Today is day ${today} of the month
- Active loans: ${loans.filter(l => l.status !== "paid_off").map(l => `${l.name} ($${l.current_balance} remaining, ${l.interest_rate || 0}% APR, due day ${l.due_day || "N/A"}`).join("; ")}
- Bills: ${bills.map(b => `${b.name} $${b.amount}/mo (${b.category})`).join("; ")}

Return 4 insights. Each should have:
- A short emoji-prefixed title (max 6 words)
- A 1-2 sentence actionable body referencing real numbers
- A "type": one of "tip", "warning", "opportunity", "win"`,
        response_json_schema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  body: { type: "string" },
                  type: { type: "string" },
                }
              }
            }
          }
        }
      });
    } catch (e) {
      setLoading(false);
      setDismissed(true);
      return;
    }

    const list = result?.insights || [];
    setInsights(list);
    setIndex(0);
    saveCache(list);
    setLoading(false);
  }

  const focusChatInput = () => {
    const chatInput = document.getElementById("rayma-chat-input") || document.querySelector('input[placeholder*="Ask RAYMA"]');
    if (chatInput) {
      chatInput.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => chatInput.focus(), 300);
    }
  };
// 1. Reusable Tour Function
  const startProductTour = () => {
    setShowGreeting(false); 
    
    const driverObj = window.driver.js.driver({
      showProgress: true,
      animate: true,
      steps: [
        {
          element: '#rayma-insights',
          popover: {
            title: 'AI Insights 💡',
            description: 'I analyze your data daily to find savings, track debt progress, and flag upcoming risks.',
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '#rayma-chat-input',
          popover: {
            title: 'Ask Me Anything 💬',
            description: 'Want to run a simulation or adjust your budget? Just type it here and let’s figure it out together.',
            side: "top",
            align: 'center'
          }
        }
      ],
      onDestroyStarted: () => {
        driverObj.destroy();
        focusChatInput(); 
      }
    });

    driverObj.drive();
  };

  // 2. The Global Listener (The "Walkie-Talkie")
  useEffect(() => {
    const handleRemoteTourStart = () => {
      startProductTour();
    };

    window.addEventListener("trigger-rayma-tour", handleRemoteTourStart);
    
    return () => window.removeEventListener("trigger-rayma-tour", handleRemoteTourStart);
  }, []);

  // 3. Updated Button Logic
  const handleGetStarted = () => {
    if (isFirstTime) {
      localStorage.setItem("rayma_tour_complete", "true");
      setIsFirstTime(false);
      startProductTour();
    } else {
      setShowGreeting(false);
      focusChatInput();
    }
  };


  const typeStyles = {
    tip:         "border-primary/30 bg-primary/5",
    warning:     "border-amber-400/30 bg-amber-400/5",
    opportunity: "border-chart-3/30 bg-chart-3/5",
    win:         "border-primary/40 bg-primary/10",
  };

  const current = insights[index];

  return (
    <div className="mb-6" id="rayma-insights">
      {/* Proactive Greeting */}
      {showGreeting && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-4"
        >
          <p className="text-sm font-medium text-foreground mb-3">
            {isFirstTime 
              ? "Hi! I'm RAYMA. Let me give you a quick tour of your new financial dashboard."
              : "Hi! I'm ready to analyze your latest data—how can I help you take control of your finances today?"}
          </p>
          <button
            onClick={handleGetStarted}
            className="text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg"
          >
            {isFirstTime ? "Start Tour" : "Let's get started"}
          </button>
        </motion.div>
      )}

      {/* Insights Carousel (hidden if dismissed) */}
      {!dismissed && (insights.length > 0 || loading) && (
        <div
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            if (touchStartX.current === null || insights.length < 2) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (dx < -40) setIndex(i => (i + 1) % insights.length);
            else if (dx > 40) setIndex(i => (i - 1 + insights.length) % insights.length);
            touchStartX.current = null;
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">RAYMA Insights</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchInsights(true)}
                disabled={loading}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                title="Refresh insights"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button onClick={() => setDismissed(true)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className={`rounded-2xl border border-border bg-card p-4 flex items-center gap-3`}>
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
              <p className="text-xs text-muted-foreground">RAYMA is analyzing your finances…</p>
            </div>
          ) : current ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className={`rounded-2xl border p-4 ${typeStyles[current.type] || typeStyles.tip}`}
              >
                <p className="text-sm font-semibold text-foreground mb-1">{current.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{current.body}</p>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex gap-1">
                    {insights.map((_, i) => (
                      <button key={i} onClick={() => setIndex(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${i === index ? "bg-primary w-3" : "bg-muted-foreground/40"}`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setIndex((i) => (i - 1 + insights.length) % insights.length)}
                      className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIndex((i) => (i + 1) % insights.length)}
                      className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : null}
        </div>
      )}
    </div>
  );
}
