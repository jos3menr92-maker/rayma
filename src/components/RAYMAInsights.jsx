import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RefreshCw, X, MessageSquare, AlertCircle } from "lucide-react";
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
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const touchStartX = useRef(null);

  // Safe calculation logic: defaults to 0 if data is missing
  const monthlyBills = bills.reduce((s, b) => s + (b?.amount || 0), 0);
  const monthlyLoans = loans.filter(l => l?.status !== "paid_off").reduce((s, l) => s + (l?.monthly_payment || 0), 0);
  const avgWeeklyIncome = incomes.length > 0 ? incomes.reduce((s, i) => s + (i?.amount || 0), 0) / incomes.length : 0;
  const monthlyIncome = avgWeeklyIncome * 4.33;
  const cashFlow = monthlyIncome - monthlyLoans - monthlyBills;

  useEffect(() => {
    const cached = loadCache();
    if (cached && cached.length > 0) {
      setInsights(cached);
    } else if (loans.length > 0 || bills.length > 0) {
      fetchInsights();
    }
  }, [loans.length, bills.length]);

  async function fetchInsights() {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      if (!base44?.integrations?.Core?.InvokeLLM) throw new Error("AI not ready");

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are RAYMA, a financial AI. Cash flow: $${cashFlow.toFixed(0)}. Return 4 insights as JSON.`,
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
      saveCache(list);
    } catch (e) {
      console.error(e);
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

  if (dismissed || (insights.length === 0 && !loading && !error)) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">RAYMA Insights</span>
        </div>
        <button onClick={() => setDismissed(true)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
      </div>

      {loading ? (
        <div className="rounded-2xl border p-4 text-xs text-muted-foreground">Analyzing your finances...</div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex flex-col gap-2">
          <p className="text-xs font-medium text-destructive">{error}</p>
          <button onClick={fetchInsights} className="text-xs font-bold text-destructive underline">Retry</button>
        </div>
      ) : (
        <div className={`rounded-2xl border p-4 ${typeStyles[insights[index]?.type] || typeStyles.tip}`}>
          <p className="text-sm font-semibold mb-1">{insights[index]?.title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{insights[index]?.body}</p>
        </div>
      )}
    </div>
  );
}