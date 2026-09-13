import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useT } from "@/lib/LanguageContext";
import { motion } from "framer-motion";
import { TrendingDown, CalendarClock, Target, ArrowRight, TrendingUp } from "lucide-react";

/**
 * ShareProgress — public, login-free debt payoff progress page at
 * /share/:slug. Shows only the anonymized snapshot the owner published:
 * percent of debt reduced, months remaining, strategy, and amounts
 * only if the owner explicitly opted in.
 */
export default function ShareProgress() {
  const { slug } = useParams();
  const T = useT();
  // undefined = loading, null = not found
  const [record, setRecord] = useState(undefined);

  useEffect(() => {
    let alive = true;
    base44.entities.DebtProgressShare.filter({ share_slug: slug })
      .then((rows) => { if (alive) setRecord(rows[0] || null); })
      .catch(() => { if (alive) setRecord(null); });
    return () => { alive = false; };
  }, [slug]);

  const fmtAmount = (v) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: record?.currency || "USD",
        maximumFractionDigits: 0,
      }).format(v);
    } catch (e) {
      return String(v);
    }
  };

  if (record === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (record === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Target className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-base font-semibold text-foreground mb-1">
          {T("sharePageHeading", "Debt Payoff Progress")}
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          {T("sharePageNotFound", "This progress page doesn't exist or is no longer shared.")}
        </p>
        <Link
          to="/home"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20"
        >
          {T("getRaymaFree", "Get Rayma AI free")} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const percent = Math.min(Math.max(Math.round(record.percent_reduced || 0), 0), 100);
  const months = record.months_remaining;
  const strategyKey = record.strategy === "snowball" ? "snowball" : "avalanche";

  return (
    <div className="min-h-screen bg-background px-4 py-10 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-primary mb-1">
          {T("sharePageHeading", "Debt Payoff Progress")}
        </p>
        <h1 className="text-center text-2xl font-bold font-heading text-foreground mb-6">
          {percent}% {T("debtPaidOffPct", "of debt paid off")}
        </h1>

        {/* Progress bar */}
        <div className="h-3 rounded-full bg-muted overflow-hidden mb-8 border border-border">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full bg-primary"
          />
        </div>

        {/* Anonymized stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-2xl bg-card border border-border p-4 text-center">
            <TrendingDown className="w-5 h-5 text-primary mx-auto mb-1.5" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {T("debtReducedLabel", "Debt Reduced")}
            </p>
            <p className="text-xl font-bold font-heading text-primary">{percent}%</p>
          </div>
          <div className="rounded-2xl bg-card border border-border p-4 text-center">
            <CalendarClock className="w-5 h-5 text-accent mx-auto mb-1.5" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {T("monthsRemainingLabel", "Months Remaining")}
            </p>
            <p className="text-xl font-bold font-heading text-foreground">
              {months == null ? "—" : months}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-4 mb-4 flex items-center gap-3">
          <Target className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {T("strategyInUse", "Strategy in use")}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {T(strategyKey, strategyKey === "avalanche" ? "Avalanche" : "Snowball")}
            </p>
          </div>
        </div>

        {/* Amounts — only if the owner opted in */}
        {record.show_amounts ? (
          <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 mb-4 grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {T("startingDebt", "Starting Debt")}
              </p>
              <p className="text-base font-bold font-heading text-foreground">{fmtAmount(record.original_total)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {T("currentDebt", "Current Debt")}
              </p>
              <p className="text-base font-bold font-heading text-primary">{fmtAmount(record.current_total)}</p>
            </div>
          </div>
        ) : (
          <p className="text-center text-[11px] text-muted-foreground mb-4">
            {T("sharePageAmountsHidden", "Amounts hidden by the owner")}
          </p>
        )}

        {/* CTA */}
        <Link
          to="/home"
          className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
        >
          <TrendingUp className="w-4 h-4" />
          {T("getRaymaFree", "Get Rayma AI free")}
        </Link>

        <p className="text-center text-[11px] text-muted-foreground mt-5">
          {T("poweredByRayma", "Debt payoff journey powered by Rayma AI")}
        </p>
      </motion.div>
    </div>
  );
}