import { useMemo } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { t } from "@/lib/i18n";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { projectCashFlow } from "@/utils/financeMath";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

/**
 * 30-Day Cash Flow Forecast — renders projectCashFlow from financeMath
 * (the ONE forecast brain): real bank-balance start line, paychecks on
 * their actual cadence, obligations on their true payment cycle,
 * savings-goal contributions, and an everyday-spending rate from the
 * user's transaction history.
 */
export default function CashFlowForecast({ loans, bills, incomes }) {
  const { lang, locale } = useLanguage();
  const { formatCurrency: fmt } = useCurrency();
  const T = useMemo(() => (key, fallback) => { const tr = t(lang, key); return tr !== key ? tr : fallback; }, [lang]);
  const ctx = useFinancialData();

  const projection = useMemo(() => projectCashFlow({
    loans: loans ?? ctx.loans ?? [],
    bills: bills ?? ctx.bills ?? [],
    incomes: incomes ?? ctx.incomes ?? [],
    payments: ctx.payments,
    transactions: ctx.transactions,
    transactionSplits: ctx.transactionSplits,
    savingsGoals: ctx.savingsGoals,
    bankAccounts: ctx.bankAccounts,
  }), [loans, bills, incomes, ctx.payments, ctx.transactions, ctx.transactionSplits, ctx.savingsGoals, ctx.bankAccounts]);

  if (!projection || !projection.hasIncomeData) return null;

  const { startBalance, dailySpend, finalBalance, lowestBalance, lowestDate, estimatedIncome, days } = projection;
  const isPositive = finalBalance >= 0;

  let minIdx = 0;
  const chartData = days.map((d, i) => {
    const dt = new Date(d.date);
    if (d.balance < days[minIdx].balance) minIdx = i;
    return {
      label: dt.toLocaleDateString(locale, { month: "numeric", day: "numeric" }),
      fullLabel: dt.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" }),
      balance: Math.round(d.balance),
      events: d.events,
      variableSpend: d.variableSpend,
    };
  });

  const renderTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const day = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-xl p-2.5 text-[10px] shadow-lg max-w-[190px]">
        <p className="font-semibold text-foreground mb-0.5">{day.fullLabel}</p>
        <p className={`font-bold ${day.balance >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(day.balance)}</p>
        {day.events.length > 0 && (
          <div className="mt-1.5 pt-1.5 border-t border-border space-y-0.5">
            {day.events.map((e, i) => (
              <div key={i} className="flex justify-between gap-2">
                <span className="text-muted-foreground truncate">{e.name || T("paycheck", "Paycheck")}</span>
                <span className={`font-medium shrink-0 ${e.amount > 0 ? "text-primary" : "text-destructive"}`}>
                  {e.amount > 0 ? "+" : "−"}{fmt(Math.abs(e.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="text-muted-foreground mt-1.5">{T("everydaySpending", "Everyday spending")}: −{fmt(day.variableSpend)}</p>
      </div>
    );
  };

  return (
    <div className="mb-6 bg-card border border-border rounded-3xl p-4 shadow-sm">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-sm font-semibold font-heading text-foreground">{T("cashFlowForecast30", "30-Day Cash Flow Forecast")}</h2>
          <p className="text-[10px] text-muted-foreground">
            {T("forecastFromBalance", "From today's {amount} balance").replace("{amount}", fmt(startBalance))}
          </p>
        </div>
        <div className={`flex items-center gap-1 text-base font-bold font-heading ${isPositive ? "text-primary" : "text-destructive"}`}>
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {fmt(finalBalance)}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={130}>
        <AreaChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))"} stopOpacity={0.3} />
              <stop offset="95%" stopColor={isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))"} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} interval={4} axisLine={false} tickLine={false} />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip content={renderTooltip} />
          <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" strokeOpacity={0.5} />
          <ReferenceLine y={startBalance} stroke="hsl(var(--border))" strokeDasharray="2 4" />
          {lowestBalance < startBalance && (
            <ReferenceDot
              x={chartData[minIdx].label}
              y={Math.round(lowestBalance)}
              r={3}
              fill={lowestBalance < 0 ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
              stroke="hsl(var(--card))"
            />
          )}
          <Area type="monotone" dataKey="balance" stroke={isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))"} strokeWidth={2} fill="url(#balGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-2 mt-2">
        <div className="bg-muted/50 rounded-xl p-2 text-center">
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-medium">{T("today", "Today")}</p>
          <p className="text-xs font-bold text-foreground">{fmt(startBalance)}</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-2 text-center">
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-medium">{T("lowestPoint", "Lowest")}</p>
          <p className={`text-xs font-bold ${lowestBalance < 0 ? "text-destructive" : "text-foreground"}`}>{fmt(lowestBalance)}</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-2 text-center">
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-medium">{T("dailySpend", "Daily spend")}</p>
          <p className="text-xs font-bold text-foreground">{fmt(dailySpend)}</p>
        </div>
      </div>

      {lowestBalance < 0 ? (
        <p className="text-[10px] text-destructive mt-2 text-center font-medium">
          {T("projectedDeficit", "⚠️ Projected deficit of {amount} at lowest point")
            .replace("{amount}", fmt(Math.abs(lowestBalance)))}
          {lowestDate ? ` · ${new Date(lowestDate).toLocaleDateString(locale, { month: "short", day: "numeric" })}` : ""}
        </p>
      ) : estimatedIncome ? (
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          {T("forecastEstimateNote", "Paycheck schedule estimated from your recent logs")}
        </p>
      ) : null}
    </div>
  );
}