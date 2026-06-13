import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient"; // 🔌 THE VAULT
import { useFinancialData } from "@/lib/FinancialDataContext"; // 🧠 THE BRAIN
import { useCurrency } from "@/hooks/useCurrency";
import { motion } from "framer-motion";
import { Plus, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, BarChart, Bar,
} from "recharts";
import CashFlowForecast from "../components/CashFlowForecast";
import IncomeLogGrouped from "../components/IncomeLogGrouped";

function getWeekLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function startOfWeek(date = new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

export default function Finance() {
  const navigate = useNavigate();
  const { formatCurrency: fmt } = useCurrency();
  
  // 🧠 Pulling active loans and bills instantly from the Brain
  const { bills, loans, userProfile, reload, loading: contextLoading } = useFinancialData();
  
  const [incomes, setIncomes] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [incomeDialog, setIncomeDialog] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [incomeForm, setIncomeForm] = useState({ amount: "", week_start: startOfWeek(), note: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { 
    fetchIncomes(); 
  }, []);

  // 🔌 Fetching exclusively from your Supabase vault
  async function fetchIncomes() {
    setLocalLoading(true);
    const { data } = await supabase
      .from('incomes')
      .select('*')
      .order('week_start', { ascending: false });
      
    setIncomes(data || []);
    setLocalLoading(false);
  }

// Monthly fixed expenses
  const activeBills = useMemo(() => bills.filter(b => b.is_active !== false), [bills]);
  const activeLoans = useMemo(() => loans.filter(l => l.status !== "paid_off"), [loans]);
  
  const monthlyBills = activeBills.reduce((s, b) => s + (b.amount || 0), 0);
  const monthlyLoans = activeLoans.reduce((s, l) => s + (l.monthly_payment || 0), 0);
  const monthlyExpenses = monthlyBills + monthlyLoans;
  const weeklyExpenses = monthlyExpenses / 4.33;

  // 🚀 FIXED: Variables are defined FIRST
  const today = new Date();
  const todayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][today.getDay()];
  const todayDate = today.getDate();
  const payFreq = userProfile?.pay_frequency;
  const payDay = userProfile?.pay_day;

  // Weekly income stats
  const totalIncomeLogged = incomes.reduce((s, i) => s + (i.amount || 0), 0);
  const avgLogged = incomes.length > 0 ? totalIncomeLogged / incomes.length : 0;
  
  let monthlyIncome = avgLogged;
  if (payFreq === "weekly") monthlyIncome = avgLogged * 4.33;
  else if (payFreq === "biweekly") monthlyIncome = avgLogged * 2.16;
  else if (payFreq === "quarterly") monthlyIncome = avgLogged / 3;
  
  const monthlyCashFlow = monthlyIncome - monthlyExpenses;

  // Check if current period logged
  const thisWeek = startOfWeek();
  const loggedThisWeek = incomes.some(i => i.week_start === thisWeek);

  // 🚀 FIXED: Smart payday reminder (Now supports Quarterly!)
  const today = new Date();
  const todayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][today.getDay()];
  const todayDate = today.getDate();
  const payFreq = userProfile?.pay_frequency;
  const payDay = userProfile?.pay_day;

  const isPayday = payFreq && payDay && (
    (payFreq === "weekly" && todayName === payDay) ||
    (payFreq === "biweekly" && todayName === payDay) ||
    (payFreq === "monthly" && String(todayDate) === String(payDay)) ||
    (payFreq === "quarterly" && String(todayDate) === String(payDay) && today.getMonth() % 3 === 0)
  );

  const showIncomeReminder = !loggedThisWeek && (isPayday || !payFreq);
  const reminderMsg = isPayday
    ? `Today is your payday! Log your ${payFreq} income to keep your records accurate.`
    : `You haven't recorded income yet for this period.`;
  const reminderSetupNeeded = !payFreq;

  // Chart data
  const chartData = [...incomes]
    .sort((a, b) => a.week_start.localeCompare(b.week_start))
    .slice(-16)
    .map(i => ({
      week: getWeekLabel(i.week_start),
      income: i.amount,
      expenses: Math.round(weeklyExpenses),
      cashflow: i.amount - weeklyExpenses,
    }));

  const expenseBreakdown = [
    ...(monthlyBills > 0 ? [{ name: "Bills", amount: monthlyBills }] : []),
    ...(monthlyLoans > 0 ? [{ name: "Loan Payments", amount: monthlyLoans }] : []),
  ];

  // 🔌 Saving exactly to Supabase
  async function handleSaveIncome(e) {
    e.preventDefault();
    setSaving(true);
    
    const payload = { 
      amount: parseFloat(incomeForm.amount) || 0,
      week_start: incomeForm.week_start,
      note: incomeForm.note,
      user_id: userProfile?.id
    };

    if (editingIncome) {
      await supabase.from('incomes').update(payload).eq('id', editingIncome.id);
    } else {
      await supabase.from('incomes').insert([payload]);
    }
    
    setSaving(false);
    setIncomeDialog(false);
    fetchIncomes();
    reload(); // Tell Brain to refresh global stats
  }

 function openAdd() {
    setEditingIncome(null);
    
    // 🚀 NEW FEATURE: Find the most recent paycheck amount to auto-fill
    const lastAmount = incomes.length > 0 ? incomes[0].amount : "";
    
    setIncomeForm({ 
      amount: lastAmount, // Auto-fills the box!
      week_start: startOfWeek(), 
      note: "" 
    });
    setIncomeDialog(true);
  }

  function openEdit(inc) {
    setEditingIncome(inc);
    setIncomeForm({ amount: inc.amount, week_start: inc.week_start, note: inc.note || "" });
    setIncomeDialog(true);
  }

  async function handleDelete(id) {
    await supabase.from('incomes').delete().eq('id', id);
    fetchIncomes();
    reload();
  }

  if (contextLoading || localLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        
        {/* 🚀 FIXED: Top Header with Permanent Action Button */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground mb-1">Finance</h1>
            <p className="text-sm text-muted-foreground">Income, expenses & cash flow</p>
          </div>
          <Button size="sm" className="rounded-xl" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" /> Log
          </Button>
        </div>

        {/* Cash Flow Banner */}
        {showIncomeReminder && (
          <div className={`border rounded-2xl p-3 mb-4 flex items-center gap-3 ${isPayday ? "bg-primary/10 border-primary/30" : "bg-accent/10 border-accent/30"}`}>
            <span className="text-xl">{isPayday ? "🎉" : "📝"}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{isPayday ? "Payday! Log your income" : "Log this period's income"}</p>
              <p className="text-xs text-muted-foreground">{reminderMsg}</p>
            </div>
            <Button size="sm" className="rounded-xl text-xs shrink-0" onClick={openAdd}>Log</Button>
          </div>
        )}
        
        {reminderSetupNeeded && (
          <div className="bg-muted/40 border border-border rounded-2xl p-3 mb-4 flex items-center gap-3">
            <span className="text-xl">⚙️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Set up your pay schedule</p>
              <p className="text-xs text-muted-foreground">Add your payday in Profile for smarter reminders</p>
            </div>
            <Button size="sm" variant="outline" className="rounded-xl text-xs shrink-0" onClick={() => navigate("/profile")}>Set Up</Button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-card border border-border rounded-2xl p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Monthly Income</p>
            <p className="text-base font-bold font-heading text-primary">{fmt(monthlyIncome)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">avg estimate</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Monthly Expenses</p>
            <p className="text-base font-bold font-heading text-destructive">{fmt(monthlyExpenses)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">fixed bills + loans</p>
          </div>
          <div className={`rounded-2xl p-3 border ${monthlyCashFlow >= 0 ? "bg-primary/10 border-primary/20" : "bg-destructive/10 border-destructive/20"}`}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Cash Flow</p>
            <p className={`text-base font-bold font-heading ${monthlyCashFlow >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(monthlyCashFlow)}</p>
            <div className="flex items-center gap-0.5 mt-0.5">
              {monthlyCashFlow >= 0
                ? <TrendingUp className="w-3 h-3 text-primary" />
                : <TrendingDown className="w-3 h-3 text-destructive" />}
              <p className="text-[10px] text-muted-foreground">per month</p>
            </div>
          </div>
        </div>

        {/* 30-Day Cash Flow Forecast */}
        <CashFlowForecast loans={loans} bills={bills} incomes={incomes} />

        {/* Income vs Expenses Chart */}
        {chartData.length >= 2 && (
          <div className="bg-card border border-border rounded-3xl p-4 mb-5">
            <h2 className="text-sm font-semibold font-heading text-foreground mb-4">Income vs Expenses (Weekly)</h2>
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={v => `$${Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} width={44} />
                <Tooltip
                  formatter={(v, name) => [fmt(v), name === "income" ? "Income" : name === "expenses" ? "Expenses" : "Cash Flow"]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: 11 }}
                />
                <Legend formatter={v => v === "income" ? "Income" : v === "expenses" ? "Expenses" : "Cash Flow"} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="income" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="4 3" dot={false} />
                <Line type="monotone" dataKey="cashflow" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Expense Breakdown Bar */}
        {expenseBreakdown.length > 0 && (
          <div className="bg-card border border-border rounded-3xl p-4 mb-5">
            <h2 className="text-sm font-semibold font-heading text-foreground mb-4">Monthly Expense Breakdown</h2>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={expenseBreakdown} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={40} />
                <Tooltip formatter={v => [fmt(v), "Amount"]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                <Bar dataKey="amount" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 🚀 FIXED: Clean Income Log without the redundant button */}
        <div>
          <h2 className="text-sm font-semibold font-heading text-foreground mb-3">Income Log</h2>
          {incomes.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No income logged yet. Start tracking your weekly income.</p>
            </div>
          ) : (
            <IncomeLogGrouped incomes={incomes} weeklyExpenses={weeklyExpenses} onEdit={openEdit} onDelete={handleDelete} fmt={fmt} getWeekLabel={getWeekLabel} />
          )}
        </div>
      </motion.div>

      {/* Popups */}
      <Dialog open={incomeDialog} onOpenChange={setIncomeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingIncome ? "Edit Income" : "Log Weekly Income"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveIncome} className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Amount *</Label>
              <Input type="number" step="0.01" placeholder="$0" value={incomeForm.amount}
                onChange={e => setIncomeForm(f => ({ ...f, amount: e.target.value }))} required className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Week Starting</Label>
              <Input type="date" value={incomeForm.week_start}
                onChange={e => setIncomeForm(f => ({ ...f, week_start: e.target.value }))} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Note</Label>
              <Input placeholder="Optional" value={incomeForm.note}
                onChange={e => setIncomeForm(f => ({ ...f, note: e.target.value }))} className="mt-1 rounded-xl" />
            </div>
            <Button type="submit" disabled={saving} className="w-full rounded-xl">
              {saving ? "Saving..." : editingIncome ? "Save Changes" : "Log Income"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
