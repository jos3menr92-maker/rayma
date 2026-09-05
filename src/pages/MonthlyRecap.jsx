import { useMemo, useState } from "react";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { t } from "@/lib/i18n";
import { monthlyBillAmount, incomeTotalForMonth, realIncomeEntries, netWorthFrom } from "@/utils/financeMath";
import { monthlyObligation } from "@/utils/loanEngine";
import { getMonthName } from "@/utils/formatLocalized";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown, CheckCircle2, DollarSign, Calendar, PiggyBank, Wallet } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--destructive))", "#34d399", "#f97316", "#a78bfa"];

export default function MonthlyRecap() {
  const { incomes, payments, bills, loans, assets, bankAccounts, netWorthSnapshots, loading } = useFinancialData();
  const { lang, locale } = useLanguage();
  const { formatCurrency: fmt, currency } = useCurrency();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Month selector — 0 = current month, -1..-5 = look back (tappable chips)
  const [viewOffset, setViewOffset] = useState(0);
  const viewDate = new Date(currentYear, currentMonth + viewOffset, 1);
  const viewMonth = viewDate.getMonth();
  const viewYear = viewDate.getFullYear();
  const monthName = getMonthName(viewMonth, locale, "long");

  // Chip row: current month first, then 5 back (matches the 6-month chart range)
  const monthChips = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(currentYear, currentMonth - i, 1);
    return { back: i, label: getMonthName(d.getMonth(), locale, "short"), year: d.getFullYear() };
  }), [currentMonth, currentYear, locale]);

  const thisMonthIncomes = useMemo(() => realIncomeEntries(incomes).filter(i => {
    if (!i.week_start) return false;
    const d = new Date(i.week_start + "T00:00:00");
    return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
  }), [incomes, viewMonth, viewYear]);
  const totalIncome = useMemo(() => incomeTotalForMonth(incomes, viewYear, viewMonth), [incomes, viewYear, viewMonth]);

  const thisMonthPayments = useMemo(() => (payments || []).filter(p => {
    if (!p.payment_date) return false;
    const d = new Date(p.payment_date + "T00:00:00");
    return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
  }), [payments, viewMonth, viewYear]);
  const totalPaid = useMemo(() => thisMonthPayments.reduce((s, p) => s + (p.amount || 0), 0), [thisMonthPayments]);
  const billsPaid = useMemo(() => thisMonthPayments.filter(p => p.payment_type === "bill").length, [thisMonthPayments]);
  const loansPaid = useMemo(() => thisMonthPayments.filter(p => p.payment_type === "loan").length, [thisMonthPayments]);

  const activeBills = useMemo(() => bills.filter(x => x.is_active !== false), [bills]);
  const activeLoans = useMemo(() => loans.filter(x => x.status !== "paid_off"), [loans]);
  const monthlyExpenses = useMemo(() =>
    activeBills.reduce((s, b) => s + monthlyBillAmount(b), 0) + activeLoans.reduce((s, l) => s + monthlyObligation(l), 0),
  [activeBills, activeLoans]);
  const cashFlow = useMemo(() => totalIncome - monthlyExpenses, [totalIncome, monthlyExpenses]);

  // Previous-month figures for the delta chips (real income + actual payments)
  const prevIncome = useMemo(() => {
    const d = new Date(viewYear, viewMonth - 1, 1);
    return incomeTotalForMonth(incomes, d.getFullYear(), d.getMonth());
  }, [incomes, viewMonth, viewYear]);
  const prevPaid = useMemo(() => {
    const d = new Date(viewYear, viewMonth - 1, 1);
    return (payments || []).filter(p => {
      if (!p.payment_date) return false;
      const pd = new Date(p.payment_date + "T00:00:00");
      return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
    }).reduce((s, p) => s + (p.amount || 0), 0);
  }, [payments, viewMonth, viewYear]);
  const delta = (cur, prev) => (prev > 0 && cur !== prev) ? `${cur > prev ? "↑" : "↓"} ${Math.round(Math.abs((cur - prev) / prev) * 100)}%` : "";

  // One consistent definition for every month: income = real income entries,
  // expenses = payments actually made (no planned-vs-actual mixing).
  const last6 = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(currentYear, currentMonth - (5 - i), 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const monthPayments = (payments || []).filter(p => {
      if (!p.payment_date) return false;
      const pd = new Date(p.payment_date + "T00:00:00");
      return pd.getMonth() === m && pd.getFullYear() === y;
    });
    return {
      month: getMonthName(m, locale, "short"),
      income: incomeTotalForMonth(incomes, y, m),
      expenses: monthPayments.reduce((s, x) => s + (x.amount || 0), 0),
    };
  }), [incomes, payments, currentMonth, currentYear, locale]);

  const billPieData = useMemo(() => Object.entries(activeBills.reduce((acc, b) => {
    const key = b.category || "other";
    acc[key] = (acc[key] || 0) + monthlyBillAmount(b);
    return acc;
  }, {})).map(([name, value]) => ({ name, value })), [activeBills]);

  // Savings rate — share of income kept (negative when overspending)
  const savingsRate = totalIncome > 0 ? cashFlow / totalIncome : null;

  // Net worth at the end of the selected month, from the daily snapshot history.
  // Snapshots are the ONE source of historical net worth (written by the cron job).
  const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const sortedSnaps = useMemo(() =>
    [...(netWorthSnapshots || [])].sort((a, b) => String(b.snapshot_date || "").localeCompare(String(a.snapshot_date || ""))),
  [netWorthSnapshots]);
  const snapAtOrBefore = (dayStr) => sortedSnaps.find(s => s?.snapshot_date && String(s.snapshot_date).slice(0, 10) <= dayStr);
  const endSnap = snapAtOrBefore(isoDay(new Date(viewYear, viewMonth + 1, 0)));
  const prevSnap = snapAtOrBefore(isoDay(new Date(viewYear, viewMonth, 0)));
  const netWorthValue = endSnap ? (endSnap.net_worth || 0)
    : (viewOffset === 0 ? netWorthFrom({ assets, bankAccounts, loans }).netWorth : null);
  const netWorthDeltaValue = (endSnap && prevSnap && endSnap.id !== prevSnap.id)
    ? (endSnap.net_worth || 0) - (prevSnap.net_worth || 0) : null;

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
          <h1 className="text-2xl font-bold font-heading text-foreground">{monthName}{viewYear !== currentYear ? ` ${viewYear}` : ""} {T("recap", "Recap")}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{T("recapSubtitleFor", "Your financial summary for {month}").replace("{month}", monthName)}</p>

        {/* Month selector — tappable chips, current month first */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6">
          {monthChips.map((c) => (
            <button
              key={c.back}
              onClick={() => setViewOffset(-c.back)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${viewOffset === -c.back ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"}`}
            >
              {c.label}{c.year !== currentYear ? ` ${c.year}` : ""}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{T("incomeLogged", "Income Logged")}</p>
            <p className="text-xl font-bold font-heading text-primary">{fmt(totalIncome)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{thisMonthIncomes.length} {T("entries", "entries")}{delta(totalIncome, prevIncome) ? ` · ${delta(totalIncome, prevIncome)}` : ""}</p>
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
              {loansPaid} {loansPaid === 1 ? T("loanSingular", "loan") : T("loans", "loans")} · {billsPaid} {billsPaid === 1 ? T("billSingular", "bill") : T("bills", "bills")}{delta(totalPaid, prevPaid) ? ` · ${delta(totalPaid, prevPaid)}` : ""}
            </p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{T("savingsRateLabel", "Savings Rate")}</p>
            {savingsRate == null ? (
              <p className="text-xl font-bold font-heading text-muted-foreground">—</p>
            ) : savingsRate >= 0 ? (
              <div className="flex items-center gap-1">
                <PiggyBank className="w-4 h-4 text-primary" />
                <p className="text-xl font-bold font-heading text-primary">{Math.round(savingsRate * 100)}%</p>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <TrendingDown className="w-4 h-4 text-destructive" />
                <p className="text-xl font-bold font-heading text-destructive">{Math.round(savingsRate * 100)}%</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">{T("ofIncomeKept", "of income kept")}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{T("netWorthLabel", "Net Worth")}</p>
            <div className="flex items-center gap-1">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <p className={`text-xl font-bold font-heading ${netWorthValue == null ? "text-muted-foreground" : netWorthValue >= 0 ? "text-foreground" : "text-destructive"}`}>
                {netWorthValue == null ? "—" : fmt(netWorthValue)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {netWorthDeltaValue != null
                ? `${netWorthDeltaValue >= 0 ? "↑" : "↓"} ${fmt(Math.abs(netWorthDeltaValue))} ${T("vsLastMonthShort", "vs last month")}`
                : viewOffset === 0 && !endSnap
                  ? T("currentEstimateShort", "current estimate")
                  : endSnap ? T("endOfMonthShort", "end of month") : T("noSnapshotData", "no data for this month")}
            </p>
          </div>
        </div>

        {monthlyExpenses > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold font-heading text-foreground">{T("plannedVsPaid", "Planned vs Paid")}</h2>
              <span className="text-xs font-semibold text-foreground">{fmt(Math.min(totalPaid, monthlyExpenses))} / {fmt(monthlyExpenses)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.min((totalPaid / monthlyExpenses) * 100, 100)}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {T("paidSoFar", "You've paid {paid} of {planned} in fixed obligations this month.").replace("{paid}", fmt(totalPaid)).replace("{planned}", fmt(monthlyExpenses))}
            </p>
          </div>
        )}

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
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => new Intl.NumberFormat(locale, { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(v)} width={44} />
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
                    <span className="text-sm text-foreground capitalize">{T(`billCategory_${item.name}`, item.name.replace(/_/g, " "))}</span>
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