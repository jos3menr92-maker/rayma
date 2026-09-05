import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "@/hooks/useCurrency";
import { useFinancialData } from "@/lib/FinancialDataContext"; 
import RAYMAExpiryBanner from "../components/RAYMAExpiryBanner";
import RAYMAInsights from "../components/RAYMAInsights";
import MiniCalendar from "../components/calendar/MiniCalendar";
import { CalendarDays, BarChart2, ChevronRight, Store, Calculator } from "lucide-react";
import { getInitialsColor } from "@/components/AvatarPicker";
import FinancialHealthScore from "../components/FinancialHealthScore";
import DueThisWeek from "../components/DueThisWeek";
import { motion } from "framer-motion";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";

import { useT } from "@/lib/LanguageContext";
import { monthlyObligation } from "@/utils/loanEngine";
import BudgetPacingWidget from "../components/dashboard/BudgetPacingWidget";
import ExpenseBreakdownCard from "../components/dashboard/ExpenseBreakdownCard";

const HUMAN_AVATARS = [
  { id: "face1", url: "https://i.pravatar.cc/150?img=11" },
  { id: "face2", url: "https://i.pravatar.cc/150?img=12" },
  { id: "face3", url: "https://i.pravatar.cc/150?img=14" },
  { id: "face4", url: "https://i.pravatar.cc/150?img=32" },
  { id: "face5", url: "https://i.pravatar.cc/150?img=33" },
  { id: "face6", url: "https://i.pravatar.cc/150?img=37" },
  { id: "face7", url: "https://i.pravatar.cc/150?img=38" },
  { id: "face8", url: "https://i.pravatar.cc/150?img=47" },
  { id: "face9", url: "https://i.pravatar.cc/150?img=49" },
  { id: "face10", url: "https://i.pravatar.cc/150?img=50" },
  { id: "face11", url: "https://i.pravatar.cc/150?img=51" },
  { id: "face12", url: "https://i.pravatar.cc/150?img=52" },
  { id: "face13", url: "https://i.pravatar.cc/150?img=56" },
  { id: "face14", url: "https://i.pravatar.cc/150?img=59" },
  { id: "face15", url: "https://i.pravatar.cc/150?img=60" },
];

const iconMap = {
  utilities: "⚡", subscriptions: "📱", insurance: "🛡️", rent: "🏠", food: "🍔", transport: "🚗", 
  health: "🏥", mortgage: "🏠", auto: "🚗", student: "🎓", personal: "💰", credit_card: "💳", medical: "🏥", other: "📋"
};

export default function Dashboard() {
  const navigate = useNavigate();
  const T = useT();
  const { formatCurrency } = useCurrency();
  
  const { loans, bills, incomes, userProfile, loading, reload } = useFinancialData();
  const { pullDistance, refreshing, handlers: pullHandlers } = usePullToRefresh(reload);

  useEffect(() => {
    // Don't redirect to /auth here — ProtectedLayout already guards auth.
    // userProfile can briefly be null while the Supabase session syncs;
    // the loading spinner below handles that instead of bouncing to /auth.
    // Treat undefined (legacy users / field not yet persisted) the same as
    // explicit false — both should go through onboarding before the dashboard.
    if (userProfile && !userProfile.onboarding_complete) {
      navigate("/onboarding");
    }
  }, [userProfile, loading, navigate]);

  // Pull-to-refresh is provided by the usePullToRefresh hook (see pullHandlers).

  const { activeLoans, totalDebt, totalRemaining, totalPaid, monthlyLoans, monthlyBills, monthlyTotal } = useMemo(() => {
    const activeLoans = loans.filter((l) => l.status !== "paid_off");
    const totalDebt = activeLoans.reduce((s, l) => s + (l.original_amount || 0), 0);
    const totalRemaining = activeLoans.reduce((s, l) => s + (l.current_balance || l.remaining_balance || 0), 0);
    const totalPaid = totalDebt - totalRemaining;
    const monthlyLoans = activeLoans.reduce((s, l) => s + monthlyObligation(l), 0);
    const monthlyBills = bills.filter((b) => b.is_active !== false).reduce((s, b) => s + (b.amount || 0), 0);
    const monthlyTotal = monthlyLoans + monthlyBills;
    
    return { activeLoans, totalDebt, totalRemaining, totalPaid, monthlyLoans, monthlyBills, monthlyTotal };
  }, [loans, bills]);

  const monthlyIncome = useMemo(() => {
    if (incomes.length === 0) return 0;
    const now = new Date();
    const thisMonthIncomes = incomes.filter((i) => {
      if (!i.week_start) return false;
      const d = new Date(i.week_start + "T00:00:00");
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return thisMonthIncomes.reduce((s, i) => s + (i.amount || 0), 0);
  }, [incomes]);
  const cashLeft = monthlyIncome - (monthlyTotal || 0);

const presetAvatar = HUMAN_AVATARS.find(a => a.id === userProfile?.avatar_id);
const imageToShow = 
  userProfile?.avatar_url || 
  userProfile?.avatar_photo_url || 
  presetAvatar?.url || 
  (userProfile?.avatar_id?.startsWith('http') ? userProfile.avatar_id : null);

// Get user initials (e.g. "O" for Ori) instead of "?"
const userDisplayName = userProfile?.preferred_name || userProfile?.full_name || "";
const initial = userDisplayName ? userDisplayName.trim()[0].toUpperCase() : "U";

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
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24" {...pullHandlers}>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground mb-0.5">
            {T("hello", "Hi")}, {userProfile?.preferred_name || userProfile?.full_name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-sm text-muted-foreground">{userProfile?.dashboard_greeting || T("stayOnTop", "Stay on top of your finances")}</p>
        </div>
        
        <div className="flex items-center gap-3">
         <button 
          onClick={() => navigate("/profile")} 
          className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full shadow-sm overflow-hidden" 
          style={{ backgroundColor: userProfile?.avatar_id ? getInitialsColor(userProfile?.preferred_name || userProfile?.full_name, userProfile?.avatar_id) : "#10b981" }}
        >
          {imageToShow ? (
            <img src={imageToShow} alt="avatar" className="w-full h-full object-cover rounded-full" />
          ) : (
            <span className="font-bold text-white text-base">{initial}</span>
          )}
       </button>
        </div>
      </motion.div>

      <RAYMAExpiryBanner user={userProfile} />

      <div className="mb-5" id="monthly-bills-section">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold font-heading text-foreground">{T("monthlyBills", "Monthly Bills")}</h2>
          <button onClick={() => navigate("/bills")} className="text-xs text-primary font-semibold flex items-center">{T("viewAll", "View All")} <ChevronRight className="w-3 h-3 ml-0.5" /></button>
        </div>
        <div className="flex overflow-x-auto gap-3 pb-2 snap-x hide-scrollbar">
          {bills.filter((b) => b.is_active !== false).length > 0 ? bills.filter((b) => b.is_active !== false).map(bill => (
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
            <div key={loan.id} onClick={() => navigate("/loans")} className="min-w-[145px] w-[145px] bg-card border border-border rounded-2xl p-3 snap-start shrink-0 shadow-sm cursor-pointer active:scale-95 transition-transform">
               <div className="flex justify-between items-start mb-2">
                 <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-base">{iconMap[loan.category] || "💳"}</div>
                 <span className="text-[10px] font-bold text-primary">{loan.original_amount > 0 ? Math.min(Math.max(((loan.original_amount - loan.current_balance) / loan.original_amount) * 100, 0), 100).toFixed(0) : 0}%</span>
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
      <RAYMAInsights loans={activeLoans} bills={bills} incomes={incomes} userProfile={userProfile} />

      <BudgetPacingWidget />

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

      <ExpenseBreakdownCard loans={activeLoans} bills={bills} />
      
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
        <button onClick={() => navigate("/merchants")} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 hover:border-primary/30 transition-colors text-left">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Store className="w-4 h-4 text-primary" /></div>
          <div><p className="text-xs font-semibold text-foreground">{T("merchantInsights", "Merchant Insights")}</p><p className="text-[10px] text-muted-foreground">{T("spendingByMerchant", "Spending by merchant")}</p></div>
        </button>
        <button onClick={() => navigate("/debt-simulator")} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 hover:border-primary/30 transition-colors text-left">
          <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0"><Calculator className="w-4 h-4 text-destructive" /></div>
          <div><p className="text-xs font-semibold text-foreground">{T("debtSimulator", "Debt Simulator")}</p><p className="text-[10px] text-muted-foreground">{T("payoffStrategies", "Compare payoff strategies")}</p></div>
        </button>
      </div>

      <MiniCalendar bills={bills} loans={activeLoans} userProfile={userProfile} />

    </div>
  );
}