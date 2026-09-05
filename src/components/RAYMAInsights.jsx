import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, ChevronLeft, ChevronRight,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { monthlyObligation } from "@/utils/loanEngine";
import { monthlyBillAmount, incomeTotalForMonth } from "@/utils/financeMath";

const CACHE_KEY = "rayma_insights_cache";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function loadCache(userKey) {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}_${userKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed.insights;
  } catch {
    return null;
  }
}

function saveCache(insights, userKey) {
  localStorage.setItem(`${CACHE_KEY}_${userKey}`, JSON.stringify({ insights, timestamp: Date.now() }));
}

export default function RAYMAInsights({ loans = [], bills = [], incomes = [], userProfile = null }) {
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const touchStartX = useRef(null);

  // Per-user cache key — prevents a previous account's insights from leaking
  // after a sign-out/sign-in on the same device.
  const userKey = userProfile?.id || userProfile?.email || "guest";
  useEffect(() => {
    const cached = loadCache(userKey);
    if (cached && cached.length > 0) {
      setInsights(cached);
    } else if (loans.length > 0 || bills.length > 0 || incomes.length > 0) {
      fetchInsights();
    }
  }, [userKey, loans.length, bills.length, incomes.length]);

  async function fetchInsights(force = false) {
    if (loading) return;
    setLoading(true);
    setDismissed(false);

    const monthlyBills = bills.filter(b => b.is_active !== false).reduce((s, b) => s + monthlyBillAmount(b), 0);
    const monthlyLoans = loans.filter(l => l.status !== "paid_off").reduce((s, l) => s + monthlyObligation(l), 0);
    // Same income definition as the Dashboard (this month's real income entries)
    const now = new Date();
    const monthlyIncome = incomeTotalForMonth(incomes, now.getFullYear(), now.getMonth());
    
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

    // Build a compact snapshot of the user's actual finances so the LLM gives
    // personalized, number-specific insights instead of generic advice.
    const dataContext = JSON.stringify({
      monthlyIncome: Math.round(monthlyIncome),
      monthlyBills: Math.round(monthlyBills),
      monthlyLoans: Math.round(monthlyLoans),
      dti: monthlyIncome > 0 ? Math.round((totalObligations / monthlyIncome) * 100) : null,
      loans: loans.filter(l => l.status !== "paid_off").map(l => ({
        name: l.name, balance: l.current_balance, apr: l.interest_rate,
        monthly: monthlyObligation(l), category: l.category
      })),
      bills: bills.map(b => ({ name: b.name, amount: b.amount, frequency: b.payment_frequency, due_day: b.due_day })),
      incomes: incomes.map(i => ({ amount: i.amount, frequency: i.frequency || i.recurring_frequency, source: i.source }))
    });

    let result;
    try {
      result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are Rayma AI, a proactive personal finance AI. Based on the user's financial data below, generate exactly 4 short, personalized, actionable insights. Each insight MUST reference the user's actual numbers (names, amounts, rates). Keep each body under 2 sentences. Return JSON.\n\nUSER DATA:\n${dataContext}`,
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
      saveCache(combinedList, userKey);
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