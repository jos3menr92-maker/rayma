import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronLeft, ChevronRight, RefreshCw, X, MessageSquare } from "lucide-react";
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
  const [showGreeting, setShowGreeting] = useState(false);
  const touchStartX = useRef(null);

// Change your calculation logic to this:
const monthlyBills = (bills || []).reduce((s, b) => s + (b.amount || 0), 0);
const monthlyLoans = (loans || []).filter(l => l?.status !== "paid_off").reduce((s, l) => s + (l?.monthly_payment || 0), 0);
const avgWeeklyIncome = (incomes || []).length > 0 ? (incomes || []).reduce((s, i) => s + (i.amount || 0), 0) / incomes.length : 0;
const monthlyIncome = avgWeeklyIncome * 4.33;
const cashFlow = monthlyIncome - monthlyLoans - monthlyBills;

  useEffect(() => {
    // Only show greeting if not previously dismissed this session
    if (!sessionStorage.getItem("rayma_greeting_shown")) {
      setShowGreeting(true);
    }

    const cached = loadCache();
    if (cached && cached.length > 0) {
      setInsights(cached);
    } else if (loans.length > 0 || bills.length > 0) {
      fetchInsights();
    }
  }, [loans.length, bills.length]);

  const handleDismissGreeting = () => {
    setShowGreeting(false);
    sessionStorage.setItem("rayma_greeting_shown", "true");
  };

  async function fetchInsights(force = false) {
    if (loading) return;
    setLoading(true);
    setDismissed(false);
    const today = new Date().getDate();

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are RAYMA, a proactive personal finance AI. Generate exactly 4 short, personalized, actionable insights. 
        Current monthly cash flow: $${cashFlow.toFixed(0)}.
        Return 4 insights as a JSON object with array "insights", each with title, body, and type (tip, warning, opportunity, win).`,
        response_json_schema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" }, type: { type: "string" } } }
            }
          }
        }
      });
      const list = result?.insights || [];
      setInsights(list);
      setIndex(0);
      saveCache(list);
    } catch (e) {
      setDismissed(true);
    } finally {
      setLoading(false);
    }
  }

  const typeStyles = {
    tip: "border-primary/30 bg-primary/5",
    warning: "border-amber-400/30 bg-amber-400/5",
    opportunity: "border-chart-3/30 bg-chart-3/5",
    win: "border-primary/40 bg-primary/10",
  };

  const current = insights[index];

  return (
    <div className="mb-6">
      {/* Smart Proactive Greeting */}
      {showGreeting && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-4"
        >
          <p className="text-sm font-medium text-foreground mb-3">
            {cashFlow > 0 
              ? "Hi! You're currently tracking positive this month. Want to explore some savings opportunities?" 
              : "Hi! I'm RAYMA. I've analyzed your data and have some tips to help you balance your budget."}
          </p>
          <button onClick={handleDismissGreeting} className="text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg">
            Let's see insights
          </button>
        </motion.div>
      )}

      {/* Insights Carousel */}
      {!dismissed && (insights.length > 0 || loading) && (
        <div onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
             onTouchEnd={e => {
               if (touchStartX.current === null || insights.length < 2) return;
               const dx = e.changedTouches[0].clientX - touchStartX.current;
               if (dx < -40) setIndex(i => (i + 1) % insights.length);
               else if (dx > 40) setIndex(i => (i - 1 + insights.length) % insights.length);
               touchStartX.current = null;
             }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">RAYMA Insights</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchInsights(true)} disabled={loading} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button onClick={() => setDismissed(true)} className="p-1 text-muted-foreground hover:text-foreground transition-colors"><X className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-xs text-muted-foreground">RAYMA is thinking...</p>
            </div>
          ) : current && (
            <AnimatePresence mode="wait">
              <motion.div key={index} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
                          className={`rounded-2xl border p-4 ${typeStyles[current.type] || typeStyles.tip}`}>
                <p className="text-sm font-semibold text-foreground mb-1">{current.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">{current.body}</p>
                
                <div className="flex items-center justify-between">
                  <button className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80">
                    <MessageSquare className="w-3 h-3" /> Ask RAYMA about this
                  </button>
                  <div className="flex gap-1">
                    {insights.map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === index ? "bg-primary w-3" : "bg-muted-foreground/40"}`} />
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  );
}
