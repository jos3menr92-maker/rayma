import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, CheckCircle2, DollarSign, Calendar } from "lucide-react";

const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n || 0);

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--destructive))", "#34d399", "#f97316", "#a78bfa"];

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function MonthlyRecap() {
  const [incomes, setIncomes] = useState([]);
  const [payments, setPayments] = useState([]);
  const [bills, setBills] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthName = MONTH_NAMES[currentMonth];

  useEffect(() => {
    Promise.all([
      base44.entities.WeeklyIncome.list("-week_start", 52),
      base44.entities.Payment.list("-payment_date", 200),
      base44.entities.Bill.list("-created_date", 100),
      base44.entities.Loan.list("-created_date", 100),
    ]).then(([inc, pay, b, l]) => {
      setIncomes(inc);
      setPayments(pay);
      setBills(b.filter(x => x.is_active !== false));
      setLoans(l.filter(x => x.status !== "paid_off"));
      setLoading(false);
    });
  }, []);

  // This month's income (weeks that started in this month)
  const thisMonthIncomes = incomes.filter(i => {
    const d = new Date(i.week_start + "T00:00:00");
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const totalIncome = thisMonthIncomes.reduce((s, i) => s + (i.amount || 0), 0);

  // This month's payments
  const thisMonthPayments = payments.filter(p => {
    const d = new Date(p.payment_date + "T00:00:00");
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const totalPaid = thisMonthPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const billsPaid = thisMonthPayments.filter(p => p.payment_type === "bill").length;
  const loansPaid = thisMonthPayments.filter(p => p.payment_type === "loan").length;

  // Monthly fixed expenses
  const monthlyExpenses = bills.reduce((s, b) => s + (b.amount || 0), 0) + loans.reduce((s, l) => s + (l.monthly_payment || 0), 0);
  const cashFlow = totalIncome - monthlyExpenses;

  // Last 6 months income chart
  const last6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(currentYear, currentMonth - (5 - i), 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const monthIncomes = incomes.filter(inc => {
      const id = new Date(inc.week_start + "T00:00:00");
      return id.getMonth() === m && id.getFullYear() === y;
    });
    return {
      month: MONTH_NAMES[m],
      income: monthIncomes.reduce((s, x) => s + (x.amount || 0), 0),
      expenses: monthlyExpenses,
    };
  });

  // Bill categories breakdown
  const billCategories = bills.reduce((acc, b) => {
    const key = b.category || "other";
    acc[key] = (acc[key] || 0) + (b.amount || 0);
    return acc;
  }, {});
  const billPieData = Object.entries(billCategories).map(([name, value]) => ({ name, value }));

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
          <h1 className="text-2xl font-bold font-heading text-foreground">{monthName} Recap</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Your financial summary for this month</p>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Income Logged</p>
            <p className="text-xl font-bold font-heading text-primary">{fmt(totalIncome)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{thisMonthIncomes.length} entries</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Fixed Expenses</p>
            <p className="text-xl font-bold font-heading text-destructive">{fmt(monthlyExpenses)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">bills + loans</p>
          </div>
          <div className={`rounded-2xl p-4 border ${cashFlow >= 0 ? "bg-primary/10 border-primary/20" : "bg-destructive/10 border-destructive/20"}`}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Net Cash Flow</p>
            <div className="flex items-center gap-1">
              {cashFlow >= 0 ? <TrendingUp className="w-4 h-4 text-primary" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
              <p className={`text-xl font-bold font-heading ${cashFlow >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(cashFlow)}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">income − expenses</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Payments Made</p>
            <p className="text-xl font-bold font-heading text-foreground">{fmt(totalPaid)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{loansPaid} loan · {billsPaid} bill</p>
          </div>
        </div>

        {/* Highlights */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-6 space-y-2">
          <h2 className="text-sm font-semibold font-heading text-foreground mb-3">Month Highlights</h2>
          {cashFlow >= 0 ? (
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>You came out <strong>{fmt(cashFlow)} ahead</strong> this month.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <TrendingDown className="w-4 h-4 shrink-0" />
              <span>Expenses exceeded income by <strong>{fmt(Math.abs(cashFlow))}</strong>.</span>
            </div>
          )}
          {thisMonthPayments.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-foreground">
              <DollarSign className="w-4 h-4 shrink-0 text-muted-foreground" />
              <span>Made <strong>{thisMonthPayments.length} payments</strong> totaling <strong>{fmt(totalPaid)}</strong>.</span>
            </div>
          )}
          {totalIncome === 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>No income logged yet for {monthName}. Log your income to see your cash flow.</span>
            </div>
          )}
        </div>

        {/* Last 6 Months Chart */}
        {last6.some(d => d.income > 0) && (
          <div className="bg-card border border-border rounded-3xl p-4 mb-6">
            <h2 className="text-sm font-semibold font-heading text-foreground mb-4">Income vs Expenses (6 months)</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={last6} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+"k" : v}`} width={36} />
                <Tooltip formatter={(v, n) => [fmt(v), n === "income" ? "Income" : "Expenses"]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="income" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                <Bar dataKey="expenses" fill="hsl(var(--destructive))" opacity={0.6} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-2">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><div className="w-2 h-2 rounded-sm bg-primary" /> Income</div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><div className="w-2 h-2 rounded-sm bg-destructive opacity-60" /> Expenses</div>
            </div>
          </div>
        )}

        {/* Bills Breakdown */}
        {billPieData.length > 0 && (
          <div className="bg-card border border-border rounded-3xl p-4 mb-6">
            <h2 className="text-sm font-semibold font-heading text-foreground mb-3">Bills by Category</h2>
            <div className="space-y-2">
              {billPieData.sort((a,b) => b.value - a.value).map((item, i) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-foreground capitalize">{item.name.replace("_", " ")}</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{fmt(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}