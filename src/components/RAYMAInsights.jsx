import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronLeft, ChevronRight, RefreshCw, X, MessageSquare, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

const CACHE_KEY = "rayma_insights_cache";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed.insights;
  } catch { return null; }
}

function saveCache(insights) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ insights, timestamp: Date.now() }));
}

export default function RAYMAInsights({ loans, bills, incomes }) {
  // Add an early exit if data is totally missing
  if (!loans && !bills) return null;

  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const touchStartX = useRef(null);

  // Safe calculations with fallbacks
  const safeBills = bills || [];
  const safeLoans = loans || [];
  const safeIncomes = incomes || [];

  const monthlyBills = safeBills.reduce((s, b) => s + (b?.amount || 0), 0);
  const monthlyLoans = safeLoans.filter(l => l?.status !== "paid_off").reduce((s, l) => s + (l?.monthly_payment || 0), 0);
  const avgWeeklyIncome = safeIncomes.length > 0 ? safeIncomes.reduce((s, i) => s + (i?.amount || 0), 0) / safeIncomes.length : 0;
  const monthlyIncome = avgWeeklyIncome * 4.33;
  const cashFlow = monthlyIncome - monthlyLoans - monthlyBills;

  useEffect(() => {
    if (!sessionStorage.getItem("rayma_greeting_shown")) {
      setShowGreeting(true);
    }
    const cached = loadCache();
    if (cached && cached.length > 0) {
      setInsights(cached);
    } else if (safeLoans.length > 0 || safeBills.length > 0) {
      fetchInsights();
    }
  }, [safeLoans.length, safeBills.length]);

  async function fetchInsights(force = false) {
    if (loading) return;
    setLoading(true);
    setDismissed(false);
    setError(null);

    try {
      if (!base44?.integrations?.Core?.InvokeLLM) {
        throw new Error("AI connection not available.");
      }

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
      if (list.length === 0) throw new Error("No insights could be generated.");
      
      setInsights(list);
      setIndex(0);
      saveCache(list);
    } catch (e) {
      console.error("RAYMA Insights Error:", e);
      setError("Unable to load AI insights. Please try again.");
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
      {showGreeting && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-4">
          <p className="text-sm font-medium text-foreground mb-3">
            {cashFlow > 0 ? "Hi! You're tracking positive this month. Want to explore some savings opportunities?" : "Hi! I'm RAYMA. I've analyzed your data and have some tips to help you balance your budget."}
          </p>
          <button onClick={() => { setShowGreeting(false); sessionStorage.setItem("rayma_greeting_shown", "true"); }} className="text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg">
            Let's see insights
          </button>
        </motion.div>
      )}

      {!dismissed && (insights.length > 0 || loading || error) && (
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
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">RAYMA Insights</span>
            </div>
            <button onClick={() => setDismissed(true)} className="p-1 text-muted-foreground hover:text-foreground transition-colors"><X className="w-3.5 h-3.5" /></button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-xs text-muted-foreground">RAYMA is thinking...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                <p className="text-xs font-medium">{error}</p>
              </div>
              <button onClick={() => fetchInsights()} className="text-xs font-bold text-destructive underline self-start">
                Retry Connection
              </button>
            </div>
          ) : current && (
            <motion.div key={index} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} 
                        className={`rounded-2xl border p-4 ${typeStyles[current.type] || typeStyles.tip}`}>
              <p className="text-sm font-semibold text-foreground mb-1">{current.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">{current.body}</p>
              <button className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80">
                <MessageSquare className="w-3 h-3" /> Ask RAYMA about this
              </button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
