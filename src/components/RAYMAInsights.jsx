import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, MessageSquare, AlertCircle } from "lucide-react";
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

export default function RAYMAInsights({ loans = [], bills = [], incomes = [] }) {
  const stats = useMemo(() => {
    const safeLoans = Array.isArray(loans) ? loans : [];
    const safeBills = Array.isArray(bills) ? bills : [];
    const safeIncomes = Array.isArray(incomes) ? incomes : [];

    const monthlyBills = safeBills.reduce((s, b) => s + (b?.amount || 0), 0);
    const monthlyLoans = safeLoans.filter(l => l?.status !== "paid_off").reduce((s, l) => s + (l?.monthly_payment || 0), 0);
    const avgWeeklyIncome = safeIncomes.length > 0 ? safeIncomes.reduce((s, i) => s + (i?.amount || 0), 0) / safeIncomes.length : 0;
    const monthlyIncome = avgWeeklyIncome * 4.33;
    
    return { cashFlow: monthlyIncome - monthlyLoans - monthlyBills };
  }, [loans, bills, incomes]);

  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem("rayma_greeting_shown")) setShowGreeting(true);
    
    const cached = loadCache();
    if (cached?.length > 0) {
      setInsights(cached);
    } else if (loans?.length > 0 || bills?.length > 0) {
      fetchInsights();
    }
  }, []);

  async function fetchInsights() {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      if (!base44?.integrations?.Core?.InvokeLLM) throw new Error("AI not initialized.");
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are RAYMA. Generate 4 insights. Cash flow: $${stats.cashFlow.toFixed(0)}. Return JSON with "insights" array.`,
        response_json_schema: { type: "object", properties: { insights: { type: "array", items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" }, type: { type: "string" } } } } } }
      });
      const list = result?.insights || [];
      if (list.length === 0) throw new Error("No insights generated.");
      setInsights(list);
      saveCache(list);
    } catch (e) {
      setError("Unable to load insights.");
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

  return (
    <div className="mb-6">
      {showGreeting && (
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-4">
          <p className="text-sm font-medium text-foreground mb-3">Hi! I'm RAYMA. I've analyzed your data to help balance your budget.</p>
          <button onClick={() => { setShowGreeting(false); sessionStorage.setItem("rayma_greeting_shown", "true"); }} className="text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg">Let's see insights</button>
        </div>
      )}

      {!dismissed && (insights.length > 0 || loading || error) && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-primary">RAYMA Insights</span>
            <button onClick={() => setDismissed(true)}><X className="w-3.5 h-3.5" /></button>
          </div>

          {loading ? <div className="p-4 text-xs">Thinking...</div> : error ? (
            <div className="border border-destructive/20 bg-destructive/5 p-4 rounded-2xl">
              <p className="text-xs text-destructive mb-2">{error}</p>
              <button onClick={fetchInsights} className="text-xs underline text-destructive">Retry</button>
            </div>
          ) : insights[index] && (
            <motion.div className={`border p-4 rounded-2xl ${typeStyles[insights[index].type]}`}>
              <p className="text-sm font-semibold mb-1">{insights[index].title}</p>
              <p className="text-xs text-muted-foreground mb-4">{insights[index].body}</p>
              <button className="text-[10px] font-bold uppercase text-primary"><MessageSquare className="w-3 h-3 inline" /> Ask RAYMA</button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}