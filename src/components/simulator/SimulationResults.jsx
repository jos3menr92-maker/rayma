import { motion } from "framer-motion";
import { useMemo } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { TrendingUp, TrendingDown, Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const riskColors = {
  low: "text-primary bg-primary/10",
  medium: "text-amber-400 bg-amber-400/10",
  high: "text-destructive bg-destructive/10",
};

export default function SimulationResults({ result, onRerun }) {
  const { formatCurrency: fmt } = useCurrency();
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const cashflowDiff = (result.new_monthly_cashflow || 0) - (result.current_monthly_cashflow || 0);

  const confidenceLabels = {
    high: T("highConfidence", "High confidence"),
    medium: T("moderateConfidence", "Moderate confidence"),
    low: T("roughEstimate", "Rough estimate"),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-1">{T("simulationResult", "Simulation Result")}</p>
            <h2 className="text-base font-bold font-heading text-foreground">{result.scenario_name}</h2>
          </div>
          <div className="flex gap-2">
            <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${riskColors[result.risk_level]}`}>
              {result.risk_level} {T("riskSuffix", "risk")}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{result.summary}</p>
        <p className="text-[10px] text-muted-foreground mt-1 italic">{confidenceLabels[result.confidence]}</p>
      </div>

      {/* Key Numbers */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{T("newMonthlyCashFlow", "New Monthly Cash Flow")}</p>
          <p className={`text-xl font-bold font-heading ${result.new_monthly_cashflow >= 0 ? "text-primary" : "text-destructive"}`}>
            {fmt(result.new_monthly_cashflow)}
          </p>
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${cashflowDiff >= 0 ? "text-primary" : "text-destructive"}`}>
            {cashflowDiff >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {cashflowDiff >= 0 ? "+" : ""}{fmt(cashflowDiff)}/mo
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{T("interestSaved", "Interest Saved")}</p>
          <p className="text-xl font-bold font-heading text-primary">{fmt(result.total_interest_saved)}</p>
          {result.months_saved > 0 && (
            <p className="text-xs text-muted-foreground mt-1">{result.months_saved} {T("monthsFaster", "months faster")}</p>
          )}
        </div>
      </div>

      {/* Savings Projections */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{T("savingsProjections", "Savings Projections")}</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: T("year1", "Year 1"), value: result.year1_savings },
            { label: T("year3", "Year 3"), value: result.year3_savings },
            { label: T("year5", "Year 5"), value: result.year5_savings },
          ].map((item, i) => (
            <div key={i}>
              <p className="text-base font-bold font-heading text-primary">{fmt(item.value)}</p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {result.recommendations?.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{T("actionSteps", "Action Steps")}</p>
          <div className="space-y-3">
            {result.recommendations.map((rec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3"
              >
                <span className="text-xl shrink-0">{rec.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground leading-tight">{rec.title}</p>
                    {rec.monthly_impact !== 0 && (
                      <span className={`text-xs font-bold shrink-0 ${rec.monthly_impact > 0 ? "text-primary" : "text-destructive"}`}>
                        {rec.monthly_impact > 0 ? "+" : ""}{fmt(rec.monthly_impact)}/mo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{rec.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {result.timeline?.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> {T("milestoneTimeline", "Milestone Timeline")}
          </p>
          <div className="relative pl-4">
            <div className="absolute left-1.5 top-0 bottom-0 w-px bg-border" />
            {result.timeline.map((item, i) => (
              <div key={i} className="relative mb-4 last:mb-0">
                <div className="absolute -left-[11px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">{T("monthLabel", "Month")} {item.month}</p>
                <p className="text-sm text-foreground font-medium">{item.milestone}</p>
                {item.amount_saved > 0 && (
                  <p className="text-xs text-muted-foreground">{fmt(item.amount_saved)} {T("savedToDate", "saved to date")}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Button variant="outline" onClick={onRerun} className="w-full rounded-2xl gap-2">
        <RefreshCw className="w-4 h-4" /> {T("runAgain", "Run Again")}
      </Button>
    </motion.div>
  );
}