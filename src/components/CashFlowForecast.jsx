import { useMemo } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { getWeekdayNames } from "@/utils/formatLocalized";

export default function CashFlowForecast({ loans, bills, incomes }) {
  const { locale } = useLanguage();
  const { formatCurrency: fmt } = useCurrency();

  const forecast = useMemo(() => {
    const today = new Date();
    const dayNames = getWeekdayNames(locale, "short");
    const avgWeeklyIncome = incomes.length > 0
      ? incomes.slice(0, 8).reduce((s, i) => s + (i.amount || 0), 0) / Math.min(incomes.length, 8)
      : 0;

    // Build 30-day daily forecast
    const days = [];
    let runningBalance = 0;

    for (let d = 0; d < 30; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() + d);
      const dayOfMonth = date.getDate();
      const dayOfWeek = dayNames[date.getDay()];
      const label = `${date.getMonth() + 1}/${dayOfMonth}`;

      let dayIncome = 0;
      let dayExpense = 0;
      const events = [];

      // Weekly income split daily (avg income / 7)
      dayIncome += avgWeeklyIncome / 7;

      // Monthly loan payments
      loans.forEach(loan => {
        if (loan.payment_frequency === "monthly" && loan.due_day === dayOfMonth) {
          dayExpense += loan.monthly_payment || 0;
          events.push({ name: loan.name, amount: -(loan.monthly_payment || 0) });
        }
        if ((loan.payment_frequency === "weekly" || loan.payment_frequency === "biweekly") && loan.due_day_of_week === dayOfWeek) {
          if (loan.payment_frequency === "weekly" || (loan.payment_frequency === "biweekly" && d % 14 === 0)) {
            dayExpense += loan.monthly_payment || 0;
            events.push({ name: loan.name, amount: -(loan.monthly_payment || 0) });
          }
        }
      });

      // Bills
      bills.forEach(bill => {
        if (!bill.is_active) return;
        if (bill.payment_frequency === "monthly" && bill.due_day === dayOfMonth) {
          dayExpense += bill.amount || 0;
          events.push({ name: bill.name, amount: -(bill.amount || 0) });
        }
        if ((bill.payment_frequency === "weekly" || bill.payment_frequency === "biweekly") && bill.due_day_of_week === dayOfWeek) {
          if (bill.payment_frequency === "weekly" || (bill.payment_frequency === "biweekly" && d % 14 === 0)) {
            dayExpense += bill.amount || 0;
            events.push({ name: bill.name, amount: -(bill.amount || 0) });
          }
        }
      });

      runningBalance += dayIncome - dayExpense;
      days.push({ label, balance: Math.round(runningBalance), events, dayExpense: Math.round(dayExpense) });
    }
    return days;
  }, [loans, bills, incomes]);

  const finalBalance = forecast[forecast.length - 1]?.balance || 0;
  const lowestPoint = Math.min(...forecast.map(d => d.balance));
  const isPositive = finalBalance >= 0;

  if (incomes.length === 0) return null;

  return (
    <div className="mb-6 bg-card border border-border rounded-3xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold font-heading text-foreground">30-Day Cash Flow Forecast</h2>
        <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? "text-primary" : "text-destructive"}`}>
          {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {fmt(finalBalance)}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mb-3">Based on avg income & scheduled payments</p>

      <ResponsiveContainer width="100%" height={110}>
        <AreaChart data={forecast} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))"} stopOpacity={0.3} />
              <stop offset="95%" stopColor={isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))"} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} interval={4} axisLine={false} tickLine={false} />
          <YAxis hide />
          <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <Tooltip
            formatter={(v) => [fmt(v), "Balance"]}
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 10 }}
            labelStyle={{ color: "hsl(var(--muted-foreground))" }}
          />
          <Area type="monotone" dataKey="balance" stroke={isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
            strokeWidth={2} fill="url(#balGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>

      {lowestPoint < 0 && (
        <p className="text-[10px] text-destructive mt-2 text-center">
          ⚠️ Projected deficit of {fmt(Math.abs(lowestPoint))} at lowest point
        </p>
      )}
    </div>
  );
}