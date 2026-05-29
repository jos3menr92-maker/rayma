import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import DueSoonAlert from "../components/DueSoonAlert";
import RAYMAInsights from "../components/RAYMAInsights";
import MiniCalendar from "../components/calendar/MiniCalendar";
import { Wallet, TrendingDown, TrendingUp, CreditCard, AlertCircle, CalendarDays, BarChart2, FileText } from "lucide-react";
import FinancialHealthScore from "../components/FinancialHealthScore";
import StatsCard from "../components/StatsCard";
import ProgressRing from "../components/ProgressRing";
import LoanCard from "../components/LoanCard";
import DueThisWeek from "../components/DueThisWeek";
import NetWorthChart from "../components/NetWorthChart";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

const COLORS = [
  "hsl(var(--primary))",      // teal
  "hsl(var(--chart-2))",      // amber/yellow
  "hsl(var(--chart-3))",      // blue
  "hsl(var(--chart-4))",      // purple
  "hsl(var(--destructive))",  // red
  "#34d399",                  // emerald
  "#f97316",                  // orange
  "#a78bfa",                  // violet
  "#38bdf8",                  // sky blue
  "#fb7185",                  // pink
  "#facc15",                  // yellow
  "#4ade80",                  // green
];

function MiniPie({ title, data, total, innerRadius = 30, outerRadius = 52, height = 140 }) {
  return (
    <div className="flex flex-col items-center">
      {data.length === 0 ? (
        <div style={{ height }} className="flex items-center justify-center">
          <p className="text-xs text-muted-foreground">No data</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={innerRadius} outerRadius={outerRadius} paddingAngle={2} dataKey="value">
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => formatCurrency(v)} />
          </PieChart>
        </ResponsiveContainer>
      )}
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-center mt-1">{title}</p>
      <p className="text-sm font-bold font-heading text-foreground">{formatCurrency(total)}</p>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [bills, setBills] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [loansData, billsData, me, incomesData] = await Promise.all([
      base44.entities.Loan.list("-created_date", 50),
      base44.entities.Bill.list("-created_date", 50),
      base44.auth.me(),
      base44.entities.WeeklyIncome.list("-week_start", 52),
    ]);
    setLoans(loansData);
    setBills(billsData.filter(b => b.is_active !== false));
    setIncomes(incomesData);
    setUserProfile(me);
    setLoading(false);
  }

  const { activeLoans, totalDebt, totalRemaining, totalPaid, overallProgress, monthlyLoans, monthlyBills, monthlyTotal, expensePieData, billsPieData, loansPieData, loanPaymentsPieData } = useMemo(() => {
    const activeLoans = loans.filter((l) => l.status !== "paid_off");
    const totalDebt = activeLoans.reduce((s, l) => s + (l.original_amount || 0), 0);
    const totalRemaining = activeLoans.reduce((s, l) => s + (l.current_balance || 0), 0);
    const totalPaid = totalDebt - totalRemaining;
    const overallProgress = totalDebt > 0 ? (totalPaid / totalDebt) * 100 : 0;
    const monthlyLoans = activeLoans.reduce((s, l) => s + (l.monthly_payment || 0), 0);
    const monthlyBills = bills.reduce((s, b) => s + (b.amount || 0), 0);
    const monthlyTotal = monthlyLoans + monthlyBills;

    return {
      activeLoans,
      totalDebt,
      totalRemaining,
      totalPaid,
      overallProgress,
      monthlyLoans,
      monthlyBills,
      monthlyTotal,
      expensePieData: [
        ...(monthlyLoans > 0 ? [{ name: "Loan Payments", value: monthlyLoans }] : []),
        ...(monthlyBills > 0 ? [{ name: "Bills", value: monthlyBills }] : []),
      ],
      billsPieData: bills.map(b => ({ name: b.name, value: b.amount || 0 })),
      loansPieData: activeLoans.map(l => ({ name: l.name, value: l.current_balance || 0 })),
      loanPaymentsPieData: activeLoans.filter(l => l.monthly_payment).map(l => ({ name: l.name, value: l.monthly_payment || 0 })),
    };
  }, [loans, bills]);

  const today = new Date().getDate();
  const upcomingLoans = activeLoans
    .filter((l) => l.due_day)
    .sort((a, b) => {
      const aDiff = a.due_day >= today ? a.due_day - today : a.due_day + 31 - today;
      const bDiff = b.due_day >= today ? b.due_day - today : b.due_day + 31 - today;
      return aDiff - bDiff;
    })
    .slice(0, 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground mb-0.5">
            Hi, {userProfile?.preferred_name || userProfile?.full_name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            {userProfile?.dashboard_greeting || 'Stay on top of your finances'}
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
          {userProfile?.avatar_emoji || '😊'}
        </div>
      </motion.div>

      {/* Due This Week */}
      <DueThisWeek loans={activeLoans} bills={bills} />

      {/* Mini Calendar */}
      <MiniCalendar bills={bills} loans={activeLoans} userProfile={userProfile} />

      {/* Due Soon Alert */}
      <DueSoonAlert loans={activeLoans} bills={bills} />

      {/* RAYMA Proactive Insights */}
      <RAYMAInsights loans={activeLoans} bills={bills} incomes={incomes} />

      {/* Financial Health Score */}
      <FinancialHealthScore />

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button onClick={() => navigate("/monthly-recap")} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 hover:border-primary/30 transition-colors text-left">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <CalendarDays className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Monthly Recap</p>
            <p className="text-[10px] text-muted-foreground">Income & spending summary</p>
          </div>
        </button>
        <button onClick={() => navigate("/assets")} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 hover:border-primary/30 transition-colors text-left">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <BarChart2 className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Assets</p>
            <p className="text-[10px] text-muted-foreground">Net worth tracker</p>
          </div>
        </button>
        <button onClick={() => navigate("/tax-summary")} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 hover:border-primary/30 transition-colors text-left col-span-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Tax Summary</p>
            <p className="text-[10px] text-muted-foreground">Annual report · deductible categories · CSV export</p>
          </div>
        </button>
      </div>

      {/* Net Worth Trend */}
      <NetWorthChart />

      {/* Pie Charts - TOP */}
      <div className="mb-6 bg-card border border-border rounded-3xl p-4 shadow-sm">
        <h2 className="text-sm font-semibold font-heading text-foreground mb-4">Expense Breakdown</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <MiniPie title="Total Monthly" data={expensePieData} total={monthlyTotal} innerRadius={42} outerRadius={68} height={170} />
          <MiniPie title="Loan Balances" data={loansPieData} total={totalRemaining} innerRadius={42} outerRadius={68} height={170} />
        </div>
        <div className="border-t border-border mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <MiniPie title="Bills" data={billsPieData} total={monthlyBills} innerRadius={24} outerRadius={40} height={120} />
          <MiniPie title="Loan Payments" data={loanPaymentsPieData} total={monthlyLoans} innerRadius={24} outerRadius={40} height={120} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div onClick={() => navigate("/trend?type=totalDebt")} className="cursor-pointer">
          <StatsCard label="Total Debt" value={formatCurrency(totalDebt)} icon={Wallet} color="destructive" subtitle={`${activeLoans.length} active loan${activeLoans.length !== 1 ? "s" : ""}`} />
        </div>
        <div onClick={() => navigate("/trend?type=remaining")} className="cursor-pointer">
          <StatsCard label="Remaining" value={formatCurrency(totalRemaining)} icon={TrendingDown} color="accent" />
        </div>
        <div onClick={() => navigate("/trend?type=totalPaid")} className="cursor-pointer">
          <StatsCard label="Total Paid" value={formatCurrency(totalPaid)} icon={TrendingUp} color="primary" />
        </div>
        <div onClick={() => navigate("/trend?type=monthlyDue")} className="cursor-pointer">
          <StatsCard label="Monthly Due" value={formatCurrency(monthlyTotal)} icon={CreditCard} color="muted" subtitle={`Loans ${formatCurrency(monthlyLoans)} · Bills ${formatCurrency(monthlyBills)}`} />
        </div>
      </div>

      {/* Upcoming Reminders */}
      {upcomingLoans.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold font-heading text-foreground mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-accent" />
            Upcoming Payments
          </h2>
          <div className="space-y-2">
            {upcomingLoans.map((loan) => {
              const daysUntil = loan.due_day >= today
                ? loan.due_day - today
                : loan.due_day + 31 - today;
              return (
                <motion.div
                  key={loan.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    daysUntil <= 3
                      ? "bg-destructive/5 border-destructive/20"
                      : "bg-card border-border"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{loan.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Due in {daysUntil} day{daysUntil !== 1 ? "s" : ""} · {formatCurrency(loan.monthly_payment)}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                    daysUntil <= 3
                      ? "bg-destructive/10 text-destructive"
                      : "bg-primary/10 text-primary"
                  }`}>
                    {loan.due_day}th
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Loans */}
      {activeLoans.length > 0 ? (
        <div>
          <h2 className="text-sm font-semibold font-heading text-foreground mb-3">
            Active Loans
          </h2>
          <div className="space-y-3">
            {activeLoans.map((loan, i) => (
              <LoanCard key={loan.id} loan={loan} index={i} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold font-heading text-foreground mb-1">No loans yet</h3>
          <p className="text-sm text-muted-foreground">
            Add your first loan to start tracking your debt
          </p>
        </div>
      )}


    </div>
  );
}