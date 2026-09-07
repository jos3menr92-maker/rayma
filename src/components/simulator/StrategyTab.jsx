import { useMemo, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { t } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, Zap, Snowflake, ListOrdered } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { compareStrategies } from "@/utils/payoffStrategies";
import { monthlyObligation } from "@/utils/loanEngine";
import StrategyComparisonChart from "./StrategyComparisonChart";

// Projection window options: 6 months → 30 years (mortgage-length max)
const HORIZON_OPTIONS = [6, 12, 24, 36, 60, 120, 180, 240, 360];

const payoffDateLabel = (months) => {
  const d = new Date();
  d.setMonth(d.getMonth() + Math.round(months));
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
};

function RunCard({ icon, title, badge, run, baselineInterest, fmt, fmtNoDecimal, T, highlight, horizonText }) {
  return (
    <Card className={`bg-card ${highlight ? "border-primary/40" : "border-border"}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {icon}
            <p className="text-sm font-semibold text-foreground truncate">{title}</p>
          </div>
          {badge}
        </div>
        <p className="text-lg font-bold text-foreground">
          {run.monthsToDebtFree != null
            ? `${Math.round(run.monthsToDebtFree)} ${T("monthsShort", "mo")}`
            : run.horizonMonths != null
              ? fmtNoDecimal(run.endBalance)
              : T("never", "Never")}
        </p>
        <p className="text-xs text-muted-foreground">
          {run.monthsToDebtFree != null ? (
            <>{T("totalInterestLabel", "Total interest")}: <span className="text-destructive font-medium">{fmtNoDecimal(run.totalInterest)}</span></>
          ) : run.horizonMonths != null ? (
            <>{T("stillOwedAfter", "Still owed after")} {horizonText} {T("ofMinimums", "of minimum payments")} · {T("interestPaidWindow", "Interest paid")}: <span className="text-destructive font-medium">{fmtNoDecimal(run.totalInterest)}</span></>
          ) : (
            T("interestGrowsForever", "Interest grows faster than the payments")
          )}
        </p>
        {run.monthsToDebtFree != null && baselineInterest != null && baselineInterest > run.totalInterest && (
          <p className="text-xs text-primary font-medium mt-0.5">
            {T("savesLabel", "Saves")} {fmt(Math.round((baselineInterest - run.totalInterest) * 100) / 100)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function StrategyTab({ loans }) {
  const { lang } = useLanguage();
  const { formatCurrency: fmt, formatCurrencyNoDecimal: fmtNoDecimal } = useCurrency();
  const T = useMemo(() => (key, fallback) => { const tr = t(lang, key); return tr !== key ? tr : fallback; }, [lang]);
  const [extraPayment, setExtraPayment] = useState(0);
  const [horizonMonths, setHorizonMonths] = useState(60); // default 5-year window
  const horizonLabel = (m) => (m < 12 ? `${m} ${T("monthsShort", "mo")}` : `${m / 12} ${T("yearsShort", "yr")}`);

  const runs = useMemo(() => compareStrategies(loans, extraPayment, horizonMonths), [loans, extraPayment, horizonMonths]);

  const totalDebt = loans.reduce((s, l) => s + (l.current_balance || 0), 0);
  const totalMonthly = loans.reduce((s, l) => s + monthlyObligation(l), 0);

  const minimumsPaidOff = runs.minimums.monthsToDebtFree != null;
  const warned = runs.avalanche.loans.filter((l) => l.warnings.length > 0);
  const orderLoans = runs.avalanche.order.map((id) => runs.avalanche.loans.find((l) => l.id === id)).filter(Boolean);
  const neverLoans = runs.avalanche.loans.filter((l) => l.payoffMonths == null);

  return (
    <div className="space-y-4">
      {/* Budget */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">{T("totalDebt", "Total Debt")}</p>
              <p className="font-bold text-foreground">{fmt(totalDebt)}</p>
            </div>
            <div className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">{T("monthlyPayments", "Monthly Payments")}</p>
              <p className="font-bold text-foreground">{fmt(totalMonthly)}</p>
            </div>
          </div>
          <div>
            <Label>{T("extraBudget", "Extra Monthly Budget")}: <span className="text-primary font-bold">{fmt(extraPayment)}</span></Label>
            <Slider className="mt-2" min={0} max={1000} step={25} value={[extraPayment]} onValueChange={([v]) => setExtraPayment(v)} />
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>{fmt(0)}</span><span>{fmt(1000)}</span></div>
            <p className="text-xs text-muted-foreground mt-2">{T("cascadeDesc", "Every loan pays its real minimum. Your extra budget — plus each payment freed as a loan dies — rolls into the target loan.")}</p>
          </div>
          <div>
            <Label>{T("projectionWindow", "Minimums Projection Window")}</Label>
            <Select value={String(horizonMonths)} onValueChange={(v) => setHorizonMonths(Number(v))}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {HORIZON_OPTIONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>{horizonLabel(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1.5">{T("projectionWindowDesc", "How far ahead the Minimums Only card looks. If your loans aren't paid off by then, it shows what you'd still owe.")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Honest warnings — never a fantasy schedule */}
      {warned.length > 0 && (
        <Card className="bg-card border border-destructive/40">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              {warned.map((l) => (
                <p key={l.id}>
                  <span className="font-semibold text-destructive">{l.name}</span>{" "}
                  {l.warnings.includes("no_payment")
                    ? T("noPaymentWarn", "has no payment set — it can only be paid off with your extra budget")
                    : T("belowInterestWarn", "— its minimum can't cover the interest, so the balance would grow forever")}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Three-way comparison */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <RunCard icon={<TrendingDown className="w-4 h-4 text-muted-foreground shrink-0" />} title={T("minimumsOnlyLabel", "Minimums Only")} run={runs.minimums} baselineInterest={null} fmt={fmt} fmtNoDecimal={fmtNoDecimal} T={T} horizonText={horizonLabel(horizonMonths)} />
        <RunCard icon={<Zap className="w-4 h-4 text-primary shrink-0" />} title={T("avalancheLabel", "Avalanche")} badge={<Badge className="bg-primary/20 text-primary border-0 text-xs">{T("savesMost", "Saves most")}</Badge>} run={runs.avalanche} baselineInterest={minimumsPaidOff ? runs.minimums.totalInterest : null} fmt={fmt} fmtNoDecimal={fmtNoDecimal} T={T} highlight />
        <RunCard icon={<Snowflake className="w-4 h-4 text-chart-2 shrink-0" />} title={T("snowballLabel", "Snowball")} run={runs.snowball} baselineInterest={minimumsPaidOff ? runs.minimums.totalInterest : null} fmt={fmt} fmtNoDecimal={fmtNoDecimal} T={T} />
      </div>

      {/* Combined debt-over-time chart */}
      <Card className="bg-card border-border">
        <CardContent className="px-2 pb-4 pt-2">
          <p className="text-sm text-muted-foreground px-2 mb-1">{T("balanceOverTime", "Balance Over Time")}</p>
          <StrategyComparisonChart runs={runs} fmt={fmt} fmtNoDecimal={fmtNoDecimal} T={T} />
        </CardContent>
      </Card>

      {/* Avalanche payoff plan with real cascade dates */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{T("avalanchePayoffPlan", "Avalanche Payoff Plan")}</h3>
          </div>
          <div className="space-y-3">
            {orderLoans.map((l, i) => {
              const roll = runs.avalanche.freedRolls.find((r) => r.fromId === l.id);
              return (
                <div key={l.id} className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{i + 1}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground">{l.name}</p>
                      {i === 0 && <Badge className="bg-primary/20 text-primary border-0 text-xs">{T("focusHere", "Focus Here")}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {T("paidOffBy", "Paid off by")} {payoffDateLabel(l.payoffMonths)} · {Math.round(l.payoffMonths)} {T("monthsShort", "mo")} · {T("interest", "Interest")} <span className="text-destructive">{fmtNoDecimal(l.totalInterest)}</span>
                    </p>
                    {roll && (
                      <p className="text-xs text-primary mt-0.5">
                        → {T("thenIts", "then its")} {fmt(roll.freedMonthly)}/mo {roll.toName ? `${T("rollsInto", "rolls into")} ${roll.toName}` : T("meansDebtFree", "means you're debt-free")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {neverLoans.length > 0 && (
            <p className="text-xs text-destructive">
              {neverLoans.map((l) => l.name).join(", ")} {neverLoans.length === 1 ? T("neverPaysOff", "never pays off with this budget — raise the extra budget or that loan's payment.") : T("neverPayOffPlural", "never pay off with this budget — raise the extra budget or their payments.")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}