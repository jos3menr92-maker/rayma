import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { ShieldCheck } from "lucide-react";

function ScorePillar({ label, score, max, color }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-[11px] font-semibold text-foreground">{score}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function FinancialHealthScore() {
  const { lang } = useLanguage();
  const { loans: ctxLoans, bills: ctxBills } = useFinancialData();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const [data, setData] = useState(null);

  function getColor(score) {
    if (score >= 80) return { ring: "stroke-primary", text: "text-primary", label: T("excellent", "Excellent"), bg: "bg-primary/10" };
    if (score >= 60) return { ring: "stroke-amber-400", text: "text-amber-400", label: T("good", "Good"), bg: "bg-amber-400/10" };
    if (score >= 40) return { ring: "stroke-orange-400", text: "text-orange-400", label: T("fair", "Fair"), bg: "bg-orange-400/10" };
    return { ring: "stroke-destructive", text: "text-destructive", label: T("needsWork", "Needs Work"), bg: "bg-destructive/10" };
  }

  useEffect(() => {
    let cancelled = false;
    async function compute() {
      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const [txRes, budRes, goalRes] = await Promise.all([
        supabase.from('transactions').select('*').order('date', { ascending: false }).limit(200),
        supabase.from('budget_categories').select('*'),
        supabase.from('savings_goals').select('*'),
      ]);
      const loans = ctxLoans.filter(l => l.status === "active");
      const bills = ctxBills.filter(b => b.is_active !== false);
      const transactions = txRes.data || [];
      const budgets = budRes.data || [];
      const goals = (goalRes.data || []).filter(g => g.status === "active");

      const monthTxs = transactions.filter(t => t.date?.startsWith(thisMonth));
      const income = monthTxs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const expenses = monthTxs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
      const totalDebt = loans.reduce((s, l) => s + (l.current_balance || 0), 0);
      const monthlyDebt = loans.reduce((s, l) => s + (l.monthly_payment || 0), 0);
      const monthlyBills = bills.reduce((s, b) => s + (b.amount || 0), 0);
      const totalObligation = monthlyDebt + monthlyBills;

      let debtScore = 30;
      if (income > 0) {
        const dti = totalObligation / income;
        if (dti > 0.5) debtScore = 0;
        else if (dti > 0.35) debtScore = 10;
        else if (dti > 0.25) debtScore = 20;
        else debtScore = 30;
      } else {
        debtScore = totalDebt === 0 ? 30 : 5;
      }

      let budgetScore = 25;
      if (budgets.length > 0 && expenses > 0) {
        const totalLimit = budgets.reduce((s, b) => s + (b.monthly_limit || 0), 0);
        if (totalLimit > 0) {
          const adherence = Math.min(totalLimit / expenses, 1);
          budgetScore = Math.round(adherence * 25);
        }
      }

      let savingsScore = 0;
      const savingsRate = income > 0 ? (income - expenses) / income : 0;
      if (savingsRate >= 0.2) savingsScore = 25;
      else if (savingsRate >= 0.1) savingsScore = 18;
      else if (savingsRate >= 0.05) savingsScore = 10;
      else if (savingsRate > 0) savingsScore = 5;
      if (goals.length > 0) savingsScore = Math.min(savingsScore + 5, 25);

      let coverageScore = 20;
      if (income > 0 && totalObligation > income) coverageScore = 0;
      else if (income > 0 && totalObligation > income * 0.8) coverageScore = 8;
      else if (income > 0) coverageScore = 20;

      const total = debtScore + budgetScore + savingsScore + coverageScore;

      if (!cancelled) {
        setData({
          total,
          debtScore, budgetScore, savingsScore, coverageScore,
          income, expenses, totalDebt, totalObligation,
          savingsRate,
        });
      }
    }
    compute();
    return () => { cancelled = true; };
  }, [ctxLoans, ctxBills]);

  if (!data) return null;

  const { ring, text, label, bg } = getColor(data.total);

  const r = 44, cx = 56, cy = 56;
  const circ = 2 * Math.PI * r;
  const offset = circ - (data.total / 100) * circ;

  return (
    <div className={`rounded-2xl border border-border p-4 mb-5 ${bg}`}>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <svg width="80" height="80" viewBox="0 0 112 112">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
            <circle
              cx={cx} cy={cy} r={r} fill="none"
              className={ring}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-bold font-heading ${text}`}>{data.total}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className={`w-4 h-4 ${text}`} />
            <span className="text-sm font-bold text-foreground">{T("financialHealth", "Financial Health")}</span>
          </div>
          <p className={`text-xs font-semibold mb-3 ${text}`}>{label}</p>
          <div className="space-y-2">
            <ScorePillar label={T("debtToIncome", "Debt-to-Income")} score={data.debtScore} max={30} color={data.debtScore >= 20 ? "bg-primary" : data.debtScore >= 10 ? "bg-amber-400" : "bg-destructive"} />
            <ScorePillar label={T("budgetAdherence", "Budget Adherence")} score={data.budgetScore} max={25} color={data.budgetScore >= 18 ? "bg-primary" : data.budgetScore >= 10 ? "bg-amber-400" : "bg-destructive"} />
            <ScorePillar label={T("savingsRate", "Savings Rate")} score={data.savingsScore} max={25} color={data.savingsScore >= 18 ? "bg-primary" : data.savingsScore >= 10 ? "bg-amber-400" : "bg-destructive"} />
            <ScorePillar label={T("billCoverage", "Bill Coverage")} score={data.coverageScore} max={20} color={data.coverageScore >= 15 ? "bg-primary" : data.coverageScore >= 8 ? "bg-amber-400" : "bg-destructive"} />
          </div>
        </div>
      </div>
    </div>
  );
}