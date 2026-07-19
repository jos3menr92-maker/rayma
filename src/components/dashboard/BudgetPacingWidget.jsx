import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { motion } from "framer-motion";
import { PieChart as PieChartIcon, ChevronRight } from "lucide-react";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, format } from "date-fns";

// 🕐 Same pacing logic as BudgetDashboard.jsx
function getPacingStatus(spent, limit, dayOfMonth, daysInMonth) {
  if (limit <= 0) return { color: "bg-slate-400", label: "No Limit" };
  const spendRatio = spent / limit;
  const timeRatio = daysInMonth > 0 ? dayOfMonth / daysInMonth : 1;
  if (spendRatio > 1) return { color: "bg-destructive", label: "over" };
  const pacing = timeRatio > 0 ? spendRatio / timeRatio : spendRatio;
  if (pacing <= 1.0) return { color: "bg-primary", label: "onTrack" };
  if (pacing <= 1.25) return { color: "bg-amber-500", label: "watchOut" };
  return { color: "bg-destructive", label: "overPace" };
}

export default function BudgetPacingWidget() {
  const T = useT();
  const { formatCurrency: fmt } = useCurrency();
  const navigate = useNavigate();
  const { supaUser } = useFinancialData();
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supaUser?.id) { setLoading(false); return; }
    const now = new Date();
    const ms = startOfMonth(now);
    const me = endOfMonth(now);
    Promise.all([
      supabase.from("budget_categories").select("*").eq("user_id", supaUser.id),
      supabase.from("transactions").select("*").eq("user_id", supaUser.id).gte("date", format(ms, "yyyy-MM-dd")).lte("date", format(me, "yyyy-MM-dd")),
    ]).then(([catRes, txRes]) => {
      if (catRes.data) setBudgets(catRes.data);
      if (txRes.data) setTransactions(txRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [supaUser?.id]);

  const { onTrack, watchOut, overPace, totalBudgeted, totalSpent, worstColor } = useMemo(() => {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const ms = startOfMonth(now);
    const me = endOfMonth(now);

    let onTrack = 0, watchOut = 0, overPace = 0;
    let totalBudgeted = 0, totalSpent = 0;
    let worst = "bg-primary";

    budgets.forEach(b => {
      const spent = transactions
        .filter(tx => {
          if (tx.category !== b.category_key) return false;
          try { return isWithinInterval(parseISO(tx.date), { start: ms, end: me }); } catch { return false; }
        })
        .reduce((s, tx) => s + Math.abs(tx.amount || 0), 0);
      totalBudgeted += b.monthly_limit || 0;
      totalSpent += spent;
      const p = getPacingStatus(spent, b.monthly_limit || 0, dayOfMonth, daysInMonth);
      if (p.label === "onTrack") { onTrack++; if (worst !== "bg-amber-500" && worst !== "bg-destructive") worst = p.color; }
      else if (p.label === "watchOut") { watchOut++; if (worst !== "bg-destructive") worst = p.color; }
      else if (p.label === "over" || p.label === "overPace") { overPace++; worst = p.color; }
    });

    return { onTrack, watchOut, overPace, totalBudgeted, totalSpent, worstColor: worst };
  }, [budgets, transactions]);

  if (loading || budgets.length === 0) return null;

  const overallPct = totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0;
  const summaryParts = [];
  if (onTrack > 0) summaryParts.push(`${onTrack} ${T("onTrack", "On Track")}`);
  if (watchOut > 0) summaryParts.push(`${watchOut} ${T("watchOut", "Watch Out")}`);
  if (overPace > 0) summaryParts.push(`${overPace} ${T("overPace", "Over Pace")}`);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate("/budget-dashboard")}
      className="cursor-pointer bg-card/80 backdrop-blur border border-border rounded-2xl px-4 py-3 mb-4 flex items-center justify-between hover:border-primary/30 transition-colors active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <PieChartIcon className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{T("budgetPacing", "Budget Pacing")}</p>
          <p className="text-sm font-bold font-heading text-foreground truncate">
            {summaryParts.length > 0 ? summaryParts.join(" · ") : T("allOnTrack", "All categories on track")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
          <div className={`h-full ${worstColor} transition-all duration-500`} style={{ width: `${overallPct}%` }} />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{fmt(totalSpent)}</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </motion.div>
  );
}