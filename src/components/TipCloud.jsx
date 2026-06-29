import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, X, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

export default function TipCloud({ loans, bills, incomes }) {
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const [open, setOpen] = useState(false);
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const [generated, setGenerated] = useState(false);

  async function generateTips() {
    setLoading(true);
    setOpen(true);

    const totalDebt = loans.filter(l => l.status !== "paid_off").reduce((s, l) => s + (l.current_balance || 0), 0);
    const monthlyBills = bills.filter(b => b.is_active !== false).reduce((s, b) => s + (b.amount || 0), 0);
    const monthlyLoans = loans.filter(l => l.status !== "paid_off").reduce((s, l) => s + (l.monthly_payment || 0), 0);
    const avgWeeklyIncome = incomes.length > 0 ? incomes.reduce((s, i) => s + (i.amount || 0), 0) / incomes.length : 0;
    const monthlyIncome = avgWeeklyIncome * 4.33;
    const highestInterestLoan = loans.filter(l => l.status !== "paid_off").sort((a, b) => (b.interest_rate || 0) - (a.interest_rate || 0))[0];
    const subscriptions = bills.filter(b => b.category === "subscriptions");

    const prompt = `You are a personal finance advisor. Based on this user's financial data, give them 5 short, actionable, personalized tips to save money, reduce interest, and improve their finances.

User's Financial Snapshot:
- Total remaining debt: $${totalDebt.toFixed(0)}
- Monthly income (estimated): $${monthlyIncome.toFixed(0)}
- Monthly loan payments: $${monthlyLoans.toFixed(0)}
- Monthly bills: $${monthlyBills.toFixed(0)}
- Net monthly cash flow: $${(monthlyIncome - monthlyLoans - monthlyBills).toFixed(0)}
- Highest interest loan: ${highestInterestLoan ? `${highestInterestLoan.name} at ${highestInterestLoan.interest_rate}% APR, balance $${highestInterestLoan.current_balance}` : "none"}
- Active subscriptions: ${subscriptions.length > 0 ? subscriptions.map(s => `${s.name} $${s.amount}/mo`).join(", ") : "none"}
- Active loans: ${loans.filter(l => l.status !== "paid_off").map(l => l.name).join(", ") || "none"}

Return exactly 5 tips. Each tip should be 1-2 sentences max. Be specific to their data. Focus on: interest savings, debt payoff strategy, subscription trimming, cash flow improvement, emergency fund.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          tips: {
            type: "array",
            items: {
              type: "object",
              properties: {
                emoji: { type: "string" },
                title: { type: "string" },
                tip: { type: "string" },
              },
            },
          },
        },
      },
    });

    setTips(result.tips || []);
    setIndex(0);
    setGenerated(true);
    setLoading(false);
  }

  function refresh() {
    setGenerated(false);
    setTips([]);
    generateTips();
  }

  const tip = tips[index];

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => generated ? setOpen(true) : generateTips()}
        className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-full bg-accent shadow-lg shadow-accent/30 flex items-center justify-center"
        title={T("getFinancialTips", "Get financial tips")}
      >
        <Lightbulb className="w-5 h-5 text-accent-foreground" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 22, stiffness: 300 }}
              className="fixed bottom-24 right-4 z-50 w-72 bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-accent/10 border-b border-border px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-accent-foreground" />
                  <span className="text-sm font-bold font-heading text-foreground">{T("smartTips", "Smart Tips")}</span>
                  {tips.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">{index + 1}/{tips.length}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {generated && (
                    <button onClick={refresh} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-4 min-h-[120px] flex items-center justify-center">
                {loading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-3 border-accent/30 border-t-accent rounded-full animate-spin" />
                    <p className="text-xs text-muted-foreground">{T("analyzingFinances", "Analyzing your finances…")}</p>
                  </div>
                ) : tip ? (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="w-full"
                    >
                      <div className="text-2xl mb-2">{tip.emoji}</div>
                      <p className="text-sm font-semibold text-foreground mb-1">{tip.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{tip.tip}</p>
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <p className="text-xs text-muted-foreground text-center">{T("noTipsAvailable", "No tips available")}</p>
                )}
              </div>

              {tips.length > 1 && (
                <div className="border-t border-border px-4 py-2 flex items-center justify-between">
                  <button
                    onClick={() => setIndex(i => Math.max(0, i - 1))}
                    disabled={index === 0}
                    className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex gap-1">
                    {tips.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setIndex(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? "bg-accent" : "bg-muted"}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setIndex(i => Math.min(tips.length - 1, i + 1))}
                    disabled={index === tips.length - 1}
                    className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}