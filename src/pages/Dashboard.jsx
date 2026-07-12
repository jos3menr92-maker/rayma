import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "@/hooks/useCurrency";
import { useFinancialData } from "@/lib/FinancialDataContext"; 
import DueSoonAlert from "../components/DueSoonAlert";
import RAYMAExpiryBanner from "../components/RAYMAExpiryBanner";
import RAYMAInsights from "../components/RAYMAInsights";
import MiniCalendar from "../components/calendar/MiniCalendar";
import { Wallet, TrendingDown, TrendingUp, CreditCard, CalendarDays, BarChart2, RefreshCw, ChevronRight } from "lucide-react";
import { getInitialsColor } from "@/components/AvatarPicker";
import FinancialHealthScore from "../components/FinancialHealthScore";
import StatsCard from "../components/StatsCard";
import DueThisWeek from "../components/DueThisWeek";
import NetWorthChart from "../components/NetWorthChart";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useT } from "@/lib/LanguageContext";

const HUMAN_AVATARS = [
  { id: "face1", url: "https://i.pravatar.cc/150?img=11" },
  { id: "face2", url: "https://i.pravatar.cc/150?img=12" },
  { id: "face3", url: "https://i.pravatar.cc/150?img=14" },
  { id: "face4", url: "https://i.pravatar.cc/150?img=32" },
];

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--destructive))"];

const iconMap = {
  utilities: "⚡", subscriptions: "📱", insurance: "🛡️", rent: "🏠", food: "🍔", transport: "🚗", 
  health: "🏥", mortgage: "🏠", auto: "🚗", student: "🎓", personal: "💰", credit_card: "💳", medical: "🏥", other: "📋"
};

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
  const T = useT();
  const { formatCurrency } = useCurrency();
  
  const { loans, bills, incomes, userProfile, loading, reload } = useFinancialData();
  const [payments, setPayments] = useState([]); 
  const [refreshing, setRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(null);
  const [pullDistance, setPullDistance] = useState(0);

  useEffect(() => {
    if (!loading && !userProfile) {
      navigate("/auth", { replace: true });
      return;
    }
    if (userProfile && userProfile.onboarding_complete === false) {
      navigate("/onboarding");
    }
  }, [userProfile, loading, navigate]);

  const handleTouchStart = (e) => setPullStartY(e.touches[0].clientY);
  const handleTouchMove = (e) => {
    if (pullStartY === null) return;
    const dist = e.touches[0].clientY - pullStartY;
    if (dist > 0 && window.scrollY === 0) setPullDistance(Math.min(dist, 80));
  };
  const handleTouchEnd = async () => {
    if (pullDistance > 50) {
      setRefreshing(true);
      await reload(); 
      setRefreshing(false);
    }
    setPullDistance(0); setPullStartY(null);
  };

  const { activeLoans, totalDebt, totalRemaining, totalPaid, monthlyLoans, monthlyBills, monthlyTotal, expensePieData, loansPieData } = useMemo(() => {
    const activeLoans = loans.filter((l) => l.status !== "paid_off");
    const totalDebt = activeLoans.reduce((s, l) => s + (l.original_amount || 0), 0);
    const totalRemaining = activeLoans.reduce((s, l) => s + (l.current_balance || l.remaining_balance || 0), 0);
    const totalPaid = totalDebt - totalRemaining;
    const monthlyLoans = activeLoans.reduce((s, l) => s + (l.monthly_payment || 0), 0);
    const monthlyBills = bills.reduce((s, b) => s + (b.amount || 0), 0);
    const monthlyTotal = monthlyLoans + monthlyBills;
    
    return { activeLoans, totalDebt, totalRemaining, totalPaid, monthlyLoans, monthlyBills, monthlyTotal,
      expensePieData: [...(monthlyLoans > 0 ? [{ name: "Loan Payments", value: monthlyLoans }] : []), ...(monthlyBills > 0 ? [{ name: "Bills", value: monthlyBills }] : [])],
      loansPieData: activeLoans.map(l => ({ name: l.name || "Unnamed Loan", value: l.current_balance || l.remaining_balance || 0 })),
    };
  }, [loans, bills]);

  const monthlyIncome = useMemo(() => {
    if (incomes.length === 0) return 0;
    return (incomes.reduce((s, i) => s + (i.amount || 0), 0) / incomes.length) * 4.33;
  }, [incomes]);
  const cashLeft = monthlyIncome - (monthlyTotal || 0);

  const presetAvatar = HUMAN_AVATARS.find(a => a.id === userProfile?.avatar_id);
  const imageToShow = userProfile?.avatar_photo_url || presetAvatar?.url;

  const renderBattery = (tokens, max, plan) => {
    const isInf = plan === 'Generator' || tokens > 900;
    const pct = isInf ? 100 : Math.max(0, Math.min(100, (tokens / (max || 10)) * 100));
    const color = isInf ? "bg-amber-400" : (pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-yellow-500" : "bg-destructive");
    return (
      <div onClick={() => navigate("/store")} className="flex items-center gap-1.5 cursor-pointer bg-card border border-border px-2 py-1.5 rounded-lg shadow-sm active:scale-95 transition-transform">
        <div className="relative w-6 h-3 border-2 border-muted-foreground/40 rounded-sm p-[1px] flex">
          <div className={`h-full rounded-sm transition-all ${color}`} style={{ width: `${pct}%` }} />
          <div className="absolute -right-[3px] top-0.5 w-[2px] h-1 bg-muted-foreground/40 rounded-r-sm" />
        </div>
        <span className="text-[10px] font-bold font-mono text-foreground">{isInf ? "∞" : tokens}</span>
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  if (!userProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {T("loadingProfile", "Loading your profile...")}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <AnimatePresence>
        {(pullDistance > 10 || refreshing) && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 48, marginBottom: 8 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex items-center justify-center gap-3"
          >
            <div
              className="relative w-7 h-7 flex items-center justify-center"
              style={{ transform: `rotate(${pullDistance * 4}deg)` }}
            >
              <RefreshCw
                className={`w-7 h-7 ${refreshing ? "animate-spin" : ""}`}
                style={{ color: refreshing || pullDistance > 50 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
              />
            </div>
            <span
              className={`text-sm font-medium ${refreshing || pullDistance > 50 ? "text-primary" : "text-muted-foreground"}`}
            >
              {refreshing
                ? T("refreshing", "Refreshing...")
                : pullDistance > 50
                  ? T("releaseRefresh", "Release to refresh")
                  : T("pullRefresh", "Pull to refresh")}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground mb-0.5">
            {T("hello", "Hi")}, {userProfile?.preferred_name || userProfile?.full_name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-sm text-muted-foreground">{userProfile?.dashboard_greeting || T("stayOnTop", "Stay on top of your finances")}</p>
        </div>
        
        <div className="flex items-center gap-3">
          {renderBattery(userProfile?.ai_tokens_remaining || 0, userProfile?.ai_tokens_daily_limit || 10, userProfile?.subscription_type)}
          <button onClick={() => navigate("/profile")} className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full shadow-sm" style={{ backgroundColor: userProfile?.avatar_id ? getInitialsColor(userProfile?.preferred_name || userProfile?.full_name, userProfile?.avatar_id) : "#9ca3af" }}>
            {imageToShow ? <img src={imageToShow} alt="avatar" className="w-full h-full object-cover rounded-full" /> : <span className="font-bold text-white text-sm">?</span>}
          </button>
        </div>
      </motion.div>

      <RAYMAExpiryBanner user={userProfile} />

      {monthlyIncome > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl border px-4 py-3 mb-4 flex items-center justify-between ${cashLeft >= 0 ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/20"}`}>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{T("cashLeft", "Cash Left This Month")}</p>
            <p className={`text-xl font-bold font-heading ${cashLeft >= 0 ? "text-primary" : "text-destructive"}`}>{formatCurrency(Math.abs(cashLeft))}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>{formatCurrency(monthlyIncome)} {T("income", "income")}</p>
            <p>− {formatCurrency(monthlyTotal)} {T("obligations", "obligations")}</p>
          </div>
        </motion.div>
      )}

      <div className="mb-5" id="monthly-bills-section">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold font-heading text-foreground">{T("monthlyBills", "Monthly Bills")}</h2>
          <button onClick={() => navigate("/bills")} className="text-xs text-primary font-semibold flex items-center">{T("viewAll", "View All")} <ChevronRight className="w-3 h-3 ml-0.5" /></button>
        </div>
        <div className="flex overflow-x-auto gap-3 pb-2 snap-x hide-scrollbar">
          {bills.length > 0 ? bills.map(bill => (
            <div key={bill.id} onClick={() => navigate("/bills")} className="min-w-[130px] w-[130px] bg-card border border-border rounded-2xl p-3 snap-start shrink-0 shadow-sm cursor-pointer active:scale-95 transition-transform">
               <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-base mb-2">{iconMap[bill.category] || "📋"}</div>
               <p className="text-xs font-semibold text-foreground truncate">{bill.name}</p>
               <p className="text-base font-bold font-heading">{formatCurrency(bill.amount)}</p>
               <p className="text-[9px] text-muted-foreground uppercase mt-1">{bill.due_day ? T("dueOnDay", "Due {n}th").replace("{n}", bill.due_day) : T("monthlyLabel", "Monthly")}</p>
            </div>
          )) : (
            <div className="w-full bg-card border border-dashed rounded-2xl p-4 text-center cursor-pointer" onClick={() => navigate("/bills")}>
              <p className="text-xs text-muted-foreground">{T("noBillsLogged", "No bills logged yet.")}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mb-5" id="active-loans-section">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold font-heading text-foreground">{T("activeLoans", "Active Loans")}</h2>
          <button onClick={() => navigate("/loans")} className="text-xs text-primary font-semibold flex items-center">{T("viewAll", "View All")} <ChevronRight className="w-3 h-3 ml-0.5" /></button>
        </div>
        <div className="flex overflow-x-auto gap-3 pb-2 snap-x hide-scrollbar">
          {activeLoans.length > 0 ? activeLoans.map(loan => (
            <div key={loan.id} onClick={() => navigate(`/loan/${loan.id}`)} className="min-w-[145px] w-[145px] bg-card border border-border rounded-2xl p-3 snap-start shrink-0 shadow-sm cursor-pointer active:scale-95 transition-transform">
               <div className="flex justify-between items-start mb-2">
                 <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-base">{iconMap[loan.category] || "💳"}</div>
                 <span className="text-[10px] font-bold text-primary">{Math.min(((loan.original_amount - loan.current_balance) / loan.original_amount) * 100, 100).toFixed(0)}%</span>
               </div>
               <p className="text-xs font-semibold text-foreground truncate">{loan.name}</p>
               <p className="text-base font-bold font-heading">{formatCurrency(loan.current_balance)}</p>
               <p className="text-[9px] text-muted-foreground uppercase mt-1">{T("remaining", "Remaining")}</p>
            </div>
          )) : (
            <div className="w-full bg-card border border-dashed rounded-2xl p-4 text-center cursor-pointer" onClick={() => navigate("/loans")}>
              <p className="text-xs text-muted-foreground">{T("noActiveLoans", "No active loans.")}</p>
            </div>
          )}
        </div>
      </div>

      <DueThisWeek loans={activeLoans} bills={bills} />
      <MiniCalendar bills={bills} loans={activeLoans} userProfile={userProfile} />
      <RAYMAInsights loans={activeLoans} bills={bills} incomes={incomes} userProfile={userProfile} />
      
      <div id="financial-health-score">
        <FinancialHealthScore />
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
    </div>
  );
}