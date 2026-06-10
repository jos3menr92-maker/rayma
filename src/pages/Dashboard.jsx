import React, { useEffect, useState, useMemo, useCallback, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "@/hooks/useCurrency";
import { base44 } from "@/api/base44Client";
import DueSoonAlert from "../components/DueSoonAlert";
import RAYMAExpiryBanner from "../components/RAYMAExpiryBanner";
import RAYMAInsights from "../components/RAYMAInsights";
import { Wallet, TrendingDown, TrendingUp, CreditCard, AlertCircle, CalendarDays, BarChart2, FileText, RefreshCw } from "lucide-react";
import { getInitialsColor } from "@/components/AvatarPicker";
import StatsCard from "../components/StatsCard";
import LoanCard from "../components/LoanCard";
import DueThisWeek from "../components/DueThisWeek";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

// --- LAZY LOADED COMPONENTS (Optimized for Mobile Main Thread) ---
const MiniCalendar = lazy(() => import("../components/calendar/MiniCalendar"));
const FinancialHealthScore = lazy(() => import("../components/FinancialHealthScore"));
const NetWorthChart = lazy(() => import("../components/NetWorthChart"));

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", 
  "hsl(var(--chart-4))", "hsl(var(--destructive))", "#34d399", "#f97316", 
  "#a78bfa", "#38bdf8", "#fb7185", "#facc15", "#4ade80"
];

// --- NATIVE SKELETON LOADER (App Store Compliance) ---
function WidgetSkeleton({ height = "h-48" }) {
  return (
    <div className={`w-full ${height} bg-slate-800/20 rounded-3xl animate-pulse border border-slate-700/30 mb-4`}></div>
  );
}

function MiniPie({ title, data, total, innerRadius = 30, outerRadius = 52, height = 140, formatCurrency }) {
  const fmt = formatCurrency || ((v) => `$${Math.round(v || 0).toLocaleString()}`);
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
            <Tooltip formatter={(v) => fmt(v)} />
          </PieChart>
        </ResponsiveContainer>
      )}
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-center mt-1">{title}</p>
      <p className="text-sm font-bold font-heading text-foreground">{fmt(total)}</p>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const T = (key, fallback) => t(lang, key) !== key ? t(lang, key) : fallback;
  const { formatCurrency } = useCurrency();
  const [loans, setLoans] = useState([]);
  const [bills, setBills] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(null);
  const [pullDistance, setPullDistance] = useState(0);

  useEffect(() => {
    if (userProfile && userProfile.onboarding_complete === false) navigate("/onboarding");
  }, [userProfile, navigate]);

  useEffect(() => { loadData(); }, []);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const [loansData, billsData, me, incomesData, paymentsData] = await Promise.all([
        base44.entities.Loan.list("-created_date", 100),
        base44.entities.Bill.list("-created_date", 100),
        base44.auth.me(),
        base44.entities.WeeklyIncome.list("-week_start", 52),
        base44.entities.Payment.filter({ payment_type: "loan" }, "-payment_date", 200),
      ]);
      setLoans(loansData);
      setBills(billsData.filter((b) => b.is_active !== false));
      setIncomes(incomesData);
      setPayments(paymentsData);
      setUserProfile(me);
    } catch (error) { console.error("Failed to load dashboard data:", error); } 
    finally { if (isRefresh) setRefreshing(false); else setLoading(false); }
  }, []);

  const handleTouchStart = (e) => setPullStartY(e.touches[0].clientY);
  const handleTouchMove = (e) => {
    if (pullStartY === null) return;
    const dist = e.touches[0].clientY - pullStartY;
    if (dist > 0 && window.scrollY === 0) setPullDistance(Math.min(dist, 80));
  };
  const handleTouchEnd = () => {
    if (pullDistance > 50) loadData(true);
    setPullDistance(0); setPullStartY(null);
  };

  const { activeLoans, totalDebt, totalRemaining, totalPaid, monthlyLoans, monthlyBills, monthlyTotal, expensePieData, billsPieData, loansPieData, loanPaymentsPieData } = useMemo(() => {
    const activeLoans = loans.filter((l) => l.status !== "paid_off");
    const totalDebt = activeLoans.reduce((s, l) => s + (l.original_amount || 0), 0);
    const totalRemaining = activeLoans.reduce((s, l) => s + (l.current_balance || 0), 0);
    const totalPaid = totalDebt - totalRemaining;
    const monthlyLoans = activeLoans.reduce((s, l) => s + (l.monthly_payment || 0), 0);
    const monthlyBills = bills.reduce((s, b) => s + (b.amount || 0), 0);
    const monthlyTotal = monthlyLoans + monthlyBills;
    return { activeLoans, totalDebt, totalRemaining, totalPaid, monthlyLoans, monthlyBills, monthlyTotal,
      expensePieData: [...(monthlyLoans > 0 ? [{ name: "Loan Payments", value: monthlyLoans }] : []), ...(monthlyBills > 0 ? [{ name: "Bills", value: monthlyBills }] : [])],
      billsPieData: bills.map(b => ({ name: b.name, value: b.amount || 0 })),
      loansPieData: activeLoans.map(l => ({ name: l.name, value: l.current_balance || 0 })),
      loanPaymentsPieData: activeLoans.filter(l => l.monthly_payment).map(l => ({ name: l.name, value: l.monthly_payment || 0 }))
    };
  }, [loans, bills]);

  const today = new Date().getDate();
  const upcomingLoans = activeLoans.filter((l) => l.due_day).sort((a, b) => {
    const aDiff = a.due_day >= today ? a.due_day - today : a.due_day + 31 - today;
    const bDiff = b.due_day >= today ? b.due_day - today : b.due_day + 31 - today;
    return aDiff - bDiff;
  }).slice(0, 3);

  const monthlyIncome = useMemo(() => {
    if (incomes.length === 0) return 0;
    return (incomes.reduce((s, i) => s + (i.amount || 0), 0) / incomes.length) * 4.33;
  }, [incomes]);
  const cashLeft = monthlyIncome - (monthlyTotal || 0);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <AnimatePresence>
        {(pullDistance > 10 || refreshing) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 32 }} exit={{ opacity: 0, height: 0 }} className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-2">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            {refreshing ? T("refreshing", "Refreshing...") : pullDistance > 50 ? T("releaseRefresh", "Release to refresh") : T("pullRefresh", "Pull to refresh")}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground mb-0.5">
            {T("hello", "Hi")}, {userProfile?.preferred_name || userProfile?.full_name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-sm text-muted-foreground">{userProfile?.dashboard_greeting || T("stayOnTop", "Stay on top of your finances")}</p>
        </div>
        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: userProfile?.avatar_id ? getInitialsColor(userProfile?.preferred_name || userProfile?.full_name, userProfile?.avatar_id) : "#9ca3af" }}>
          {userProfile?.avatar_photo_url ? <img src={userProfile.avatar_photo_url} alt="avatar" className="w-full h-full object-cover rounded-full" /> : (userProfile?.preferred_name || userProfile?.full_name || "?").split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase() || "?"}
        </div>
      </motion.div>

      <RAYMAExpiryBanner user={userProfile} />

      {monthlyIncome > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl border px-4 py-3 mb-3 flex items-center justify-between ${cashLeft >= 0 ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/20"}`}>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{T("cashLeft", "Cash Left This Month")}</p>
            <p className={`text-xl font-bold font-heading ${cashLeft >= 0 ? "text-primary" : "text-destructive"}`}>
              {formatCurrency(Math.abs(cashLeft))}
              {cashLeft < 0 && <span className="text-xs font-normal ml-1">{T("overspent", "overspent")}</span>}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>{formatCurrency(monthlyIncome)} {T("income", "income")}</p>
            <p>− {formatCurrency(monthlyTotal)} {T("obligations", "obligations")}</p>
          </div>
        </motion.div>
      )}

      <DueThisWeek loans={activeLoans} bills={bills} />
      
      {/* LAZY LOADED: MiniCalendar */}
      <Suspense fallback={<WidgetSkeleton height="h-[340px]" />}>
        <MiniCalendar bills={bills} loans={activeLoans} userProfile={userProfile} />
      </Suspense>

      <DueSoonAlert loans={activeLoans} bills={bills} payments={payments} />
      <RAYMAInsights loans={activeLoans} bills={bills} incomes={incomes} />
      
      <div id="financial-health-score">
        {/* LAZY LOADED: Financial Health Score */}
        <Suspense fallback={<WidgetSkeleton height="h-32" />}>
          <FinancialHealthScore />
        </Suspense>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button onClick={() => navigate("/monthly-recap")} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 hover:border-primary/30 transition-colors text-left">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><CalendarDays className="w-4 h-4 text-primary" /></div>
          <div><p className="text-xs font-semibold text-foreground">{T("monthlyRecap", "Monthly Recap")}</p><p className="text-[10px] text-muted-foreground">{T("summary", "Income & spending summary")}</p></div>
        </button>
        <button onClick={() => navigate("/assets")} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 hover:border-primary/30 transition-colors text-left">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0"><BarChart2 className="w-4 h-4 text-accent" /></div>
          <div><p className="text-xs font-semibold text-foreground">{T("assets", "Assets")}</p><p className="text-[10px] text-muted-foreground">{T("netWorthTracker", "Net worth tracker")}</p></div>
        </button>
      </div>

      {/* LAZY LOADED: Net Worth Chart */}
      <Suspense fallback={<WidgetSkeleton height="h-64" />}>
        <NetWorthChart />
      </Suspense>

      <div className="mb-6 bg-card border border-border rounded-3xl p-4 shadow-sm">
        <h2 className="text-sm font-semibold font-heading text-foreground mb-4">{T("expenseBreakdown", "Expense Breakdown")}</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <MiniPie title={T("totalMonthly", "Total Monthly")} data={expensePieData} total={monthlyTotal} innerRadius={42} outerRadius={68} height={170} formatCurrency={formatCurrency} />
          <MiniPie title={T("loanBalances", "Loan Balances")} data={loansPieData} total={totalRemaining} innerRadius={42} outerRadius={68} height={170} formatCurrency={formatCurrency} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div onClick={() => navigate("/trend?type=totalDebt")} className="cursor-pointer"><StatsCard label={T("totalDebt", "Total Debt")} value={formatCurrency(totalDebt)} icon={Wallet} color="destructive" /></div>
        <div onClick={() => navigate("/trend?type=remaining")} className="cursor-pointer"><StatsCard label={T("remaining", "Remaining")} value={formatCurrency(totalRemaining)} icon={TrendingDown} color="accent" /></div>
        <div onClick={() => navigate("/trend?type=totalPaid")} className="cursor-pointer"><StatsCard label={T("totalPaid", "Total Paid")} value={formatCurrency(totalPaid)} icon={TrendingUp} color="primary" /></div>
        <div onClick={() => navigate("/trend?type=monthlyDue")} className="cursor-pointer"><StatsCard label={T("monthlyDue", "Monthly Due")} value={formatCurrency(monthlyTotal)} icon={CreditCard} color="muted" /></div>
      </div>

      {activeLoans.length > 0 ? (
        <div id="active-loans-section">
          <h2 className="text-sm font-semibold font-heading text-foreground mb-2">{T("activeLoans", "Active Loans")}</h2>
          <div className="space-y-2">{activeLoans.map((loan, i) => <LoanCard key={loan.id} loan={loan} index={i} />)}</div>
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="font-semibold font-heading text-foreground mb-1">{T("noLoans", "No loans yet")}</h3>
        </div>
      )}
    </div>
  );
}
