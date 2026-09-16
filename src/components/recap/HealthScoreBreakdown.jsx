import { useMemo } from "react";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { t } from "@/lib/i18n";
import { computeHealthScore } from "@/utils/healthScore";
import { ShieldCheck } from "lucide-react";

// score >= high → primary, >= mid → amber, else destructive (same thresholds as the card)
const barColor = (score, mid, high) =>
  score >= high ? "bg-primary" : score >= mid ? "bg-amber-400" : "bg-destructive";

function BreakdownRow({ label, score, max, color, detail }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="py-2.5 first:pt-1 last:pb-0">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-[11px] font-semibold text-foreground">{score}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">{detail}</p>
    </div>
  );
}

/**
 * HealthScoreBreakdown — the "why your score" section on the Monthly Recap.
 * Uses the SAME brain (src/utils/healthScore.js) as the Dashboard card, so
 * every number here matches the card by construction.
 */
export default function HealthScoreBreakdown() {
  const { lang } = useLanguage();
  const { formatCurrency: fmt } = useCurrency();
  const { loans, bills, savingsGoals, incomes, budgetCategories, transactions, transactionSplits } = useFinancialData();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);

  const s = useMemo(
    () => computeHealthScore({ loans, bills, incomes, savingsGoals, budgets: budgetCategories, transactions, transactionSplits }),
    [loans, bills, incomes, savingsGoals, budgetCategories, transactions, transactionSplits]
  );

  const incomeWord = `${T("income", "income")}${s.isProjectedPace ? ` · ${T("projectedShort", "projected")}` : ""}`;
  const noIncome = T("noIncomeLoggedShort", "No income logged this month yet");

  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold font-heading text-foreground">{T("scoreBreakdownTitle", "Why Your Score")}</h2>
        <span className="ml-auto text-sm font-bold font-heading text-primary">{s.total}/100</span>
      </div>
      <div className="divide-y divide-border">
        <BreakdownRow
          label={T("debtToIncome", "Debt-to-Income")}
          score={s.debtScore} max={30}
          color={barColor(s.debtScore, 10, 20)}
          detail={s.paceIncome > 0 ? `${fmt(s.totalObligation)} ${T("vsLabel", "vs")} ${fmt(s.paceIncome)} ${incomeWord}` : noIncome}
        />
        <BreakdownRow
          label={T("budgetAdherence", "Budget Adherence")}
          score={s.budgetScore} max={25}
          color={barColor(s.budgetScore, 10, 18)}
          detail={s.budgetCount > 0
            ? `${fmt(s.budgetSpent)} ${T("spentOf", "spent of")} ${fmt(s.budgetLimits)} ${T("budgetsPlural", "budgeted")}`
            : T("noBudgetsSet", "No budgets set yet")}
        />
        <BreakdownRow
          label={T("savingsRate", "Savings Rate")}
          score={s.savingsScore} max={25}
          color={barColor(s.savingsScore, 10, 18)}
          detail={s.income > 0 ? `${Math.round(s.savingsRate * 100)}% ${T("ofIncomeKept", "of income kept")}` : noIncome}
        />
        <BreakdownRow
          label={T("billCoverage", "Bill Coverage")}
          score={s.coverageScore} max={20}
          color={barColor(s.coverageScore, 8, 15)}
          detail={s.paceIncome > 0
            ? `${Math.round((s.totalObligation / s.paceIncome) * 100)}% ${T("ofIncomeForBills", "of income goes to bills & loans")}`
            : noIncome}
        />
      </div>
    </div>
  );
}