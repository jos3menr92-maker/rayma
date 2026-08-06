import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, ChevronLeft, ChevronRight,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

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

export default function RAYMAInsights({ loans = [], bills = [], incomes = [], userProfile = null }) {
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const touchStartX = useRef(null);

  useEffect(() => {
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
    
    // ⬇️ THE FIX: Removed the 15% hallucination text.
    const loanMissingAPR = loans.find(l => !l.interest_rate && !l.apr);
    if (loanMissingAPR) {
      localAlerts.push({ 
        type: 'tip', 
        title: T("missingInterestData", "Missing Interest Data"), 
        body: T("missingInterestBody", "You left the interest blank on your {name}. Please edit this loan to add the correct rate so your payoff math is accurate.").replace("{name}", loanMissingAPR.name || 'recent loan')
      });
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
    </div>
  );
}
