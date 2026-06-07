import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, MessageSquare, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [showGreeting, setShowGreeting] = useState(false);
  const touchStartX = useRef(null);

  const monthlyBills = bills.reduce((s, b) => s + (b?.amount || 0), 0);
  const monthlyLoans = loans.filter(l => l?.status !== "paid_off").reduce((s, l) => s + (l?.monthly_payment || 0), 0);
  const avgWeeklyIncome = incomes.length > 0 ? incomes.reduce((s, i) => s + (i?.amount || 0), 0) / incomes.length : 0;
  const monthlyIncome = avgWeeklyIncome * 4.33;
  const cashFlow = monthlyIncome - monthlyLoans - monthlyBills;

  useEffect(() => {
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

  async function fetchInsights() {
    if (loading) return;
    setLoading(true);
    setDismissed(false);
    setError(null);

    try {
      if (!base44?.integrations?.Core?.InvokeLLM) throw new Error("AI not initialized.");
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are RAYMA, a proactive financial AI. Generate 4 insights. Cash flow: $${cashFlow.toFixed(0)}. Return JSON with "insights" array containing title, body, and type (tip, warning, opportunity, win).`,
        response_json_schema: { type: "object", properties: { insights: { type: "array", items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" }, type: { type: "string" } } } } } }
      });
      const list = result?.insights || [];
      if (list.length === 0) throw new Error("No data returned.");
      setInsights(list);
      saveCache(list);
    } catch (e) {
      setError("Unable to load insights. Please try again.");
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
          <p className="text-sm text-foreground mb-3">
            {cashFlow > 0 ? "Hi! You're tracking positive. Want to explore savings?" : "Hi! I'm RAYMA. I have tips to help you balance your budget."}
          </p>
          <button onClick={() => { setShowGreeting(false); sessionStorage.setItem("rayma_greeting_shown", "true"); }} className="text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg">Let's see insights</button>
        </motion.div>
      )}

      {!dismissed && (insights.length > 0 || loading || error) && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-semibold uppercase text-primary">RAYMA Insights</span></div>
            <button onClick={() => setDismissed(true)} className="text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
          </div>
          {loading ? <div className="rounded-2xl border p-4 text-xs">RAYMA is thinking...</div> : error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
              <div className="flex items-center gap-2 text-destructive mb-2"><AlertCircle className="w-4 h-4" />{error}</div>
              <button onClick={() => fetchInsights()} className="text-xs font-bold text-destructive underline">Retry</button>
            </div>
          ) : current && (
            <motion.div className={`rounded-2xl border p-4 ${typeStyles[current.type]}`}>
              <p className="text-sm font-semibold mb-1">{current.title}</p>
              <p className="text-xs text-muted-foreground mb-4">{current.body}</p>
              <div className="flex justify-between items-center">
                 <button className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-primary"><MessageSquare className="w-3 h-3" /> Ask RAYMA</button>
                 <div className="flex gap-1">
                    {insights.map((_, i) => (
                      <button key={i} onClick={() => setIndex(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === index ? "bg-primary w-3" : "bg-muted-foreground/40"}`} />
                    ))}
                 </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}