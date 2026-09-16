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

function BreakdownRow({ label, score, max, color, detail, muted = false }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="py-2.5 first:pt-1 last:pb-0">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className={`text-[11px] font-semibold ${muted ? "text-muted-foreground" : "text-foreground"}`}>{score}/{max}</span>
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
 * every number here matches the card by construction. Each pillar's
 * explanation adapts to the band the score landed in, and unmeasured
 * pillars (no budgets set) render as neutral gray placeholder credit
 * instead of a fake "perfect" bar.
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

  // Debt-to-Income — the explanation names the band the user landed in
  const dtiPct = s.paceIncome > 0 ? Math.round((s.totalObligation / s.paceIncome) * 100) : 0;
  const dtiBand = s.debtScore >= 30
    ? T("dtiExcellent", "comfortably under the 25% excellent line")
    : s.debtScore >= 20
      ? T("dtiGood", "above the 25% excellent line but under the 35% caution line")
      : s.debtScore >= 10
        ? T("dtiCaution", "in the risky 35–50% zone lenders watch closely")
        : T("dtiDanger", "above the 50% danger line — banks decline loans above ~43%");
  const dtiDetail = s.paceIncome > 0
    ? `${fmt(s.totalObligation)} ${T("vsLabel", "vs")} ${fmt(s.paceIncome)} ${incomeWord} — ${dtiPct}% ${dtiBand}`
    : noIncome;

  // Budget Adherence — no budgets = neutral gray "not measured", not a perfect bar
  const budgetDetail = s.budgetMeasured
    ? `${fmt(s.budgetSpent)} ${T("spentOf", "spent of")} ${fmt(s.budgetLimits)} ${T("budgetsPlural", "budgeted")}`
    : T("budgetPlaceholderDetail", "No budgets set — these 25 points are placeholder credit, not an achievement. Set budgets to earn them for real.");

  // Savings Rate — measured against what survives obligations AND everyday spending
  const savingsPct = Math.round(s.savingsRate * 100);
  const savingsBand = s.savingsScore >= 25
    ? T("savingsExcellent", "excellent — 20% or more of your income stays with you")
    : s.savingsScore >= 18
      ? T("savingsSolid", "solid — 10–20% of your income stays with you")
      : s.savingsScore >= 10
        ? T("savingsBuilding", "building — 5–10% of your income stays with you")
        : s.savingsScore >= 5
          ? T("savingsThin", "thin — under 5% of your income stays with you")
          : T("savingsNone", "nothing left to save after obligations and spending");
  const savingsDetail = s.paceIncome > 0
    ? `${savingsPct}% ${T("ofIncomeLeftToSave", "of income left after bills, loans & everyday spending")} — ${savingsBand}`
    : noIncome;

  // Bill Coverage — states which side of the 80% warning threshold it landed on
  const covBand = s.coverageScore >= 20
    ? T("coverageComfortable", "comfortably below the 80% warning threshold")
    : s.coverageScore >= 8
      ? T("coverageTight", "above 80% of income, leaving little room for surprises")
      : T("coverageExceeded", "obligations exceed your projected income");
  const covDetail = s.paceIncome > 0
    ? `${dtiPct}% ${T("ofIncomeForBills", "of income goes to bills & loans")}${s.isProjectedPace ? ` (${T("projectedShort", "projected")})` : ""} — ${covBand}`
    : noIncome;

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
          detail={dtiDetail}
        />
        <BreakdownRow
          label={T("budgetAdherence", "Budget Adherence")}
          score={s.budgetScore} max={25}
          muted={!s.budgetMeasured}
          color={s.budgetMeasured ? barColor(s.budgetScore, 10, 18) : "bg-muted-foreground/40"}
          detail={budgetDetail}
        />
        <BreakdownRow
          label={T("savingsRate", "Savings Rate")}
          score={s.savingsScore} max={25}
          color={barColor(s.savingsScore, 10, 18)}
          detail={savingsDetail}
        />
        <BreakdownRow
          label={T("billCoverage", "Bill Coverage")}
          score={s.coverageScore} max={20}
          color={barColor(s.coverageScore, 8, 15)}
          detail={covDetail}
        />
      </div>
    </div>
  );
}