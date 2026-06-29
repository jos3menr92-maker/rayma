import { useMemo } from "react";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { t } from "@/lib/i18n";
import { getMonthName } from "@/utils/formatLocalized";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown, CheckCircle2, DollarSign, Calendar } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--destructive))", "#34d399", "#f97316", "#a78bfa"];

export default function MonthlyRecap() {
  const { incomes, payments, bills, loans, loading } = useFinancialData();
  const { lang, locale } = useLanguage();
  const { formatCurrency: fmt } = useCurrency();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthName = getMonthName(currentMonth, locale, "long");

  const thisMonthIncomes = useMemo(() => incomes.filter(i => {
    if (!i.week_start) return false;
    const d = new Date(i.week_start + "T00:00:00");
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }), [incomes, currentMonth, currentYear]);
  const totalIncome = useMemo(() => thisMonthIncomes.reduce((s, i) => s + (i.amount || 0), 0), [thisMonthIncomes]);

  const thisMonthPayments = useMemo(() => (payments || []).filter(p => {
    if (!p.payment_date) return false;
    const d = new Date(p.payment_date + "T00:00:00");
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }), [payments, currentMonth, currentYear]);
  const totalPaid = useMemo(() => thisMonthPayments.reduce((s, p) => s + (p.amount || 0), 0), [thisMonthPayments]);
  const billsPaid = useMemo(() => thisMonthPayments.filter(p => p.payment_type === "bill").length, [thisMonthPayments]);
  const loansPaid = useMemo(() => thisMonthPayments.filter(p => p.payment_type === "loan").length, [thisMonthPayments]);

  const activeBills = useMemo(() => bills.filter(x => x.is_active !== false), [bills]);
  const activeLoans = useMemo(() => loans.filter(x => x.status !== "paid_off"), [loans]);
  const monthlyExpenses = useMemo(() =>
    activeBills.reduce((s, b) => s + (b.amount || 0), 0) + activeLoans.reduce((s, l) => s + (l.monthly_payment || 0), 0),
  [activeBills, activeLoans]);
  const cashFlow = useMemo(() => totalIncome - monthlyExpenses, [totalIncome, monthlyExpenses]);

  const last6 = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(currentYear, currentMonth - (5 - i), 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const monthIncomes = incomes.filter(inc => {
      if (!inc.week_start) return false;
      const id = new Date(inc.week_start + "T00:00:00");
      return id.getMonth() === m && id.getFullYear() === y;
    });
    const monthPayments = (payments || []).filter(p => {
      if (!p.payment_date) return false;
      const pd = new Date(p.payment_date + "T00:00:00");
      return pd.getMonth() === m && pd.getFullYear() === y;
    });
    return {
      month: getMonthName(m, locale, "short"),
      income: monthIncomes.reduce((s, x) => s + (x.amount || 0), 0),
      expenses: monthPayments.length > 0
        ? monthPayments.reduce((s, x) => s + (x.amount || 0), 0)
        : (m === currentMonth && y === currentYear ? monthlyExpenses : 0),
    };
  }), [incomes, payments, currentMonth, currentYear, monthlyExpenses, locale]);

  const billPieData = useMemo(() => Object.entries(activeBills.reduce((acc, b) => {
    const key = b.category || "other";
    acc[key] = (acc[key] || 0) + (b.amount || 0);
    return acc;
  }, {})).map(([name, value]) => ({ name, value })), [activeBills]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold font-heading text-foreground">{monthName} {T("recap", "Recap")}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">{T("recapSubtitle", "Your financial summary for this month")}</p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{T("incomeLogged", "Income Logged")}</p>
            <p className="text-xl font-bold font-heading text-primary">{fmt(totalIncome)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{thisMonthIncomes.length} {T("entries", "entries")}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{T("fixedExpenses", "Fixed Expenses")}</p>
            <p className="text-xl font-bold font-heading text-destructive">{fmt(monthlyExpenses)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{T("billsPlusLoans", "bills + loans")}</p>
          </div>
          <div className={`rounded-2xl p-4 border ${totalIncome === 0 && monthlyExpenses === 0 ? "bg-card border-border" : cashFlow >= 0 ? "bg-primary/10 border-primary/20" : "bg-destructive/10 border-destructive/20"}`}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{T("netCashFlow", "Net Cash Flow")}</p>
            {totalIncome === 0 && monthlyExpenses === 0 ? (
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <p className="text-xl font-bold font-heading text-muted-foreground">$0</p>
              </div>
            ) : cashFlow >= 0 ? (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <p className="text-xl font-bold font-heading text-primary">{fmt(cashFlow)}</p>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <TrendingDown className="w-4 h-4 text-destructive" />
                <p className="text-xl font-bold font-heading text-destructive">{fmt(cashFlow)}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">{T("incomeMinusExpenses", "income − expenses")}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{T("paymentsMade", "Payments Made")}</p>
            <p className="text-xl font-bold font-heading text-foreground">{fmt(totalPaid)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {loansPaid} {loansPaid === 1 ? T("loanSingular", "loan") : T("loans", "loans")} · {billsPaid} {billsPaid === 1 ? T("billSingular", "bill") : T("bills", "bills")}
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 mb-6 space-y-2">
          <h2 className="text-sm font-semibold font-heading text-foreground mb-3">{T("monthHighlights", "Month Highlights")}</h2>
          {(totalIncome > 0 || monthlyExpenses > 0) && (
            cashFlow >= 0 ? (
              <div className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{T("cameOutAhead", "You came out {amount} ahead this month.").replace("{amount}", fmt(cashFlow))}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <TrendingDown className="w-4 h-4 shrink-0" />
                <span>{T("expensesExceeded", "Expenses exceeded income by {amount}.").replace("{amount}", fmt(Math.abs(cashFlow)))}</span>
              </div>
            )
          )}
          {thisMonthPayments.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-foreground">
              <DollarSign className="w-4 h-4 shrink-0 text-muted-foreground" />
              <span>{T("madePayments", "Made {count} payments totaling {amount}.").replace("{count}", thisMonthPayments.length).replace("{amount}", fmt(totalPaid))}</span>
            </div>
          )}
          {totalIncome === 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>{T("noIncomeLoggedMonth", "No income logged yet for {month}. Log your income to see your cash flow.").replace("{month}", monthName)}</span>
            </div>
          )}
        </div>

        {last6.some(d => d.income > 0) && (
          <div className="bg-card border border-border rounded-3xl p-4 mb-6">
            <h2 className="text-sm font-semibold font-heading text-foreground mb-4">{T("incomeVsExpenses", "Income vs Expenses (6 months)")}</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={last6} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+"k" : v}`} width={36} />
                <Tooltip formatter={(v, n) => [fmt(v), n === "income" ? T("income", "Income") : T("expensesLabel", "Expenses")]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="income" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                <Bar dataKey="expenses" fill="hsl(var(--destructive))" opacity={0.6} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-2">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><div className="w-2 h-2 rounded-sm bg-primary" /> {T("income", "Income")}</div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><div className="w-2 h-2 rounded-sm bg-destructive opacity-60" /> {T("expensesLabel", "Expenses")}</div>
            </div>
          </div>
        )}

        {billPieData.length > 0 && (
          <div className="bg-card border border-border rounded-3xl p-4 mb-6">
            <h2 className="text-sm font-semibold font-heading text-foreground mb-3">{T("billsByCategory", "Bills by Category")}</h2>
            <div className="space-y-2">
              {billPieData.sort((a,b) => b.value - a.value).map((item, i) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-foreground capitalize">{item.name.replace(/_/g, " ")}</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{fmt(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-2xl">
          <p className="text-xs font-semibold text-destructive mb-1">{T("financialDisclaimerTitle", "⚠️ Financial Disclaimer")}</p>
          <p className="text-xs text-muted-foreground">
            {T("financialDisclaimerShort", "Rayma AI provides tools for personal finance tracking only. Not financial advice. Consult a qualified financial professional before making financial decisions. See")} <a href="/privacy" className="underline text-primary">{T("privacyPolicy", "Privacy Policy")}</a> {T("forFullTerms", "for full terms.")}
          </p>
        </div>
      </motion.div>
    </div>
  );
}