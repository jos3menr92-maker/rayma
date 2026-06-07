import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
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

function RAYMAInsights({ loans = [], bills = [], incomes = [] }) {
  const stats = useMemo(() => {
    const sL = Array.isArray(loans) ? loans : [];
    const sB = Array.isArray(bills) ? bills : [];
    const sI = Array.isArray(incomes) ? incomes : [];
    const monthlyBills = sB.reduce((s, b) => s + (b?.amount || 0), 0);
    const monthlyLoans = sL.filter(l => l?.status !== "paid_off").reduce((s, l) => s + (l?.monthly_payment || 0), 0);
    const avgWeeklyIncome = sI.length > 0 ? sI.reduce((s, i) => s + (i?.amount || 0), 0) / sI.length : 0;
    return { cashFlow: (avgWeeklyIncome * 4.33) - monthlyLoans - monthlyBills };
  }, [loans, bills, incomes]);

  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const cached = loadCache();
    if (cached?.length > 0) setInsights(cached);
    else if (loans.length > 0 || bills.length > 0) fetchInsights();
  }, []);

  async function fetchInsights() {
    setLoading(true);
    try {
      if (!base44?.integrations?.Core?.InvokeLLM) throw new Error("AI not ready.");
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate 4 financial insights. Cash flow: $${stats.cashFlow.toFixed(0)}. Return JSON with "insights" array.`,
        response_json_schema: { type: "object", properties: { insights: { type: "array", items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" }, type: { type: "string" } } } } } }
      });
      setInsights(result?.insights || []);
      saveCache(result?.insights || []);
    } catch (e) { setError("Unable to load."); } finally { setLoading(false); }
  }

  return (
    <div className="mb-6">
      {!dismissed && (insights.length > 0 || loading || error) && (
        <div>
          {loading ? <p className="text-xs">Analyzing...</p> : error ? <p className="text-xs text-red-500">{error}</p> : insights[index] && (
            <div className="p-4 border rounded-2xl">
              <p className="font-semibold">{insights[index].title}</p>
              <p className="text-sm">{insights[index].body}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RAYMAInsights;