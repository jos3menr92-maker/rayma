import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { computeHealthScore } from "@/utils/healthScore";
import { ShieldCheck, ChevronRight } from "lucide-react";

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
  // Shared data brain — same live context as every widget (no private queries)
  const { loans, bills, savingsGoals, incomes, budgetCategories, transactions, transactionSplits } = useFinancialData();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);

  function getColor(score) {
    if (score >= 80) return { ring: "stroke-primary", text: "text-primary", label: T("excellent", "Excellent"), bg: "bg-primary/10" };
    if (score >= 60) return { ring: "stroke-amber-400", text: "text-amber-400", label: T("good", "Good"), bg: "bg-amber-400/10" };
    if (score >= 40) return { ring: "stroke-orange-400", text: "text-orange-400", label: T("fair", "Fair"), bg: "bg-orange-400/10" };
    return { ring: "stroke-destructive", text: "text-destructive", label: T("needsWork", "Needs Work"), bg: "bg-destructive/10" };
  }

  // One brain: src/utils/healthScore.js — shared with the Monthly Recap
  // breakdown so the "why" page can never drift from this card.
  const data = useMemo(
    () => computeHealthScore({ loans, bills, incomes, savingsGoals, budgets: budgetCategories, transactions, transactionSplits }),
    [loans, bills, incomes, savingsGoals, budgetCategories, transactions, transactionSplits]
  );

  const { ring, text, label, bg } = getColor(data.total);

  const r = 44, cx = 56, cy = 56;
  const circ = 2 * Math.PI * r;
  const offset = circ - (data.total / 100) * circ;

  return (
    <Link
      to="/monthly-recap"
      className={`block rounded-2xl border border-border p-4 mb-5 ${bg} active:scale-[0.98] transition-transform cursor-pointer`}
    >
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
            <ScorePillar label={data.budgetMeasured ? T("budgetAdherence", "Budget Adherence") : T("budgetNotSet", "Budget — not set")} score={data.budgetScore} max={25} color={data.budgetMeasured ? (data.budgetScore >= 18 ? "bg-primary" : data.budgetScore >= 10 ? "bg-amber-400" : "bg-destructive") : "bg-muted-foreground/40"} />
            <ScorePillar label={T("savingsRate", "Savings Rate")} score={data.savingsScore} max={25} color={data.savingsScore >= 18 ? "bg-primary" : data.savingsScore >= 10 ? "bg-amber-400" : "bg-destructive"} />
            <ScorePillar label={T("billCoverage", "Bill Coverage")} score={data.coverageScore} max={20} color={data.coverageScore >= 15 ? "bg-primary" : data.coverageScore >= 8 ? "bg-amber-400" : "bg-destructive"} />
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-center gap-1">
        <span className="text-[10px] text-muted-foreground">{T("healthScoreTapHint", "Tap to see the breakdown")}</span>
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
      </div>
    </Link>
  );
}