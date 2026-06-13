import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useFinancialData } from "@/lib/FinancialDataContext"; // 🧠 SECURE BRAIN
import { useCurrency } from "@/hooks/useCurrency";
import { motion } from "framer-motion";
import { Plus, TrendingUp, TrendingDown, DollarSign, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CashFlowForecast from "../components/CashFlowForecast";

function getWeekLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function startOfWeek(date = new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

export default function Finance() {
  const { formatCurrency: fmt } = useCurrency();
  
  // 🧠 Upgraded: Pulling incomes safely from the Brain instead of leaking data!
  const { bills, loans, incomes, userProfile, reload, loading } = useFinancialData();
  
  const [incomeDialog, setIncomeDialog] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [incomeForm, setIncomeForm] = useState({ amount: "", week_start: startOfWeek(), note: "" });
  const [saving, setSaving] = useState(false);

  // --- Financial Calculations ---
  const activeBills = useMemo(() => bills.filter(b => b.is_active !== false), [bills]);
  const activeLoans = useMemo(() => loans.filter(l => l.status !== "paid_off"), [loans]);
  const monthlyBills = activeBills.reduce((s, b) => s + (b.amount || 0), 0);
  const monthlyLoans = activeLoans.reduce((s, l) => s + (l.monthly_payment || 0), 0);
  const monthlyExpenses = monthlyBills + monthlyLoans;
  
  const payFreq = userProfile?.pay_frequency || "weekly"; 
  const totalIncomeLogged = incomes.reduce((s, i) => s + (i.amount || 0), 0);
  const avgIncome = incomes.length > 0 ? totalIncomeLogged / incomes.length : 0;
  
  let monthlyIncome = avgIncome;
  if (payFreq === "weekly") monthlyIncome = avgIncome * 4.33;
  else if (payFreq === "biweekly") monthlyIncome = avgIncome * 2.16;
  else if (payFreq === "quarterly") monthlyIncome = avgIncome / 3;

  const monthlyCashFlow = monthlyIncome - monthlyExpenses;
  const weeklyExpenses = monthlyExpenses / 4.33;

  const today = new Date();
  const todayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][today.getDay()];
  const isPayday = payFreq && userProfile?.pay_day && todayName === userProfile.pay_day;

  async function handleSaveIncome(e) {
    e.preventDefault();
    setSaving(true);
    
    // 🔒 SECURE PAYLOAD: Locks the income strictly to this user
    const payload = { 
      amount: parseFloat(incomeForm.amount) || 0, 
      week_start: incomeForm.week_start, 
      note: incomeForm.note, 
      user_id: userProfile?.id 
    };
    
    try {
      if (editingIncome) {
        await supabase.from('incomes').update(payload).eq('id', editingIncome.id);
      } else {
        await supabase.from('incomes').insert([payload]);
      }
      await reload(); // 🔄 Tell the Brain to instantly fetch fresh data
      setIncomeDialog(false);
    } catch (error) {
      console.error("Error saving income:", error);
    } finally {
      setSaving(false);
    }
  }

  function openAdd() {
    setEditingIncome(null);
    setIncomeForm({ amount: incomes.length > 0 ? incomes[0].amount : "", week_start: startOfWeek(), note: "" });
    setIncomeDialog(true);
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-start justify-between mb-5">
          <div>
            {/* ✨ RENAMED TO MATCH YOUR NEW MENU */}
            <h1 className="text-2xl font-bold font-heading text-foreground mb-1">Income & Cash Flow</h1>
            <p className="text-sm text-muted-foreground">Track your incoming money & payday forecasts</p>
          </div>
          <Button size="sm" className="rounded-xl" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Log</Button>
        </div>

        {isPayday && (
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-3 mb-4 flex items-center gap-3">
            <span className="text-xl">🎉</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Payday!</p>
              <p className="text-xs text-muted-foreground">Log your income to keep your records accurate.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-5">
           {/* Cards for Monthly Income/Expenses/CashFlow placeholder */}
        </div>
        
        <CashFlowForecast loans={loans} bills={bills} incomes={incomes} />
        
      </motion.div>

      <Dialog open={incomeDialog} onOpenChange={setIncomeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingIncome ? "Edit Income" : "Log Income"}</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-4">
            
            <div className="bg-accent/10 p-3 rounded-2xl border border-accent/20 flex gap-3">
              <MessageSquare className="w-5 h-5 text-accent shrink-0 mt-1" />
              <div className="text-xs">
                <p className="font-semibold text-foreground">Ask RAYMA</p>
                <p className="text-muted-foreground">"I just got paid $1200 today."</p>
              </div>
            </div>
            
            <form onSubmit={handleSaveIncome} className="space-y-3">
              <div>
                <Label className="text-xs">Amount</Label>
                <Input type="number" step="0.01" value={incomeForm.amount} onChange={e => setIncomeForm(f => ({...f, amount: e.target.value}))} required className="rounded-xl" />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={incomeForm.week_start} onChange={e => setIncomeForm(f => ({...f, week_start: e.target.value}))} required className="rounded-xl" />
              </div>
              <Button type="submit" disabled={saving} className="w-full rounded-xl shadow-lg mt-2">
                {saving ? "Saving..." : "Save Income"}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
