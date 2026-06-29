import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useLanguage, useT } from "@/lib/LanguageContext";
import { motion } from "framer-motion";
import { Plus, TrendingUp, TrendingDown, DollarSign, MessageSquare, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CashFlowForecast from "../components/CashFlowForecast";
import { getWeekdayNames } from "@/utils/formatLocalized";

function getWeekLabel(dateStr, lang = "en") {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(lang, { month: "short", day: "numeric" });
}

function startOfWeek(date = new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

export default function Finance() {
  const { formatCurrency: fmt } = useCurrency();
  const { lang, locale } = useLanguage();
  const T = useT();
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

  const today = new Date();
  const dayNames = useMemo(() => getWeekdayNames(locale, "long"), [locale]);
  const todayName = dayNames[today.getDay()];
  const isPayday = payFreq && userProfile?.pay_day && todayName === userProfile.pay_day;

  async function handleSaveIncome(e) {
    e.preventDefault();
    setSaving(true);
    
    // 🔒 SECURE PAYLOAD
const payload = { 
      amount: parseFloat(incomeForm.amount) || 0, 
      week_start: incomeForm.week_start, 
      note: incomeForm.note, 
      source: incomeForm.note || "Manual Log", // 🚀 THIS FIXES THE CRASH!
      user_id: userProfile?.id,
      is_active: true
    };
    
    try {
      if (editingIncome) {
        await supabase.from('incomes').update(payload).eq('id', editingIncome.id);
      } else {
        await supabase.from('incomes').insert([payload]);
      }
      await reload(); // 🔄 Instantly pull the new data to the screen
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
        
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground mb-1">{T("incomeAndCashFlow", "Income & Cash Flow")}</h1>
            <p className="text-sm text-muted-foreground">{T("financePageDesc", "Track your incoming money & forecasts")}</p>
          </div>
          <Button size="sm" className="rounded-xl shadow-sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" /> {T("logButton", "Log")}
          </Button>
        </div>

        {isPayday && (
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-3 mb-5 flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{T("paydayLabel", "Payday!")}</p>
              <p className="text-xs text-muted-foreground">{T("paydayDesc", "Log your income to keep your records accurate.")}</p>
            </div>
          </div>
        )}

        {/* 🚀 RESTORED: The Top Metric Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card border border-border rounded-2xl p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1 text-green-500">
              <TrendingUp className="w-3.5 h-3.5" />
              <p className="text-[9px] uppercase tracking-wider font-bold">{T("income", "Income")}</p>
            </div>
            <p className="text-sm font-bold text-foreground">{fmt(monthlyIncome)}</p>
          </div>
          
          <div className="bg-card border border-border rounded-2xl p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1 text-orange-500">
              <TrendingDown className="w-3.5 h-3.5" />
              <p className="text-[9px] uppercase tracking-wider font-bold">{T("expenses", "Expenses")}</p>
            </div>
            <p className="text-sm font-bold text-foreground">{fmt(monthlyExpenses)}</p>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1 text-primary">
              <DollarSign className="w-3.5 h-3.5" />
              <p className="text-[9px] uppercase tracking-wider font-bold">{T("cashFlow", "Cash Flow")}</p>
            </div>
            <p className="text-sm font-bold text-foreground">{fmt(monthlyCashFlow)}</p>
          </div>
        </div>
        
        {/* Forecast Component */}
        <div className="mb-8">
          <CashFlowForecast loans={loans} bills={bills} incomes={incomes} />
        </div>

        {/* 🚀 RESTORED: Recent Income Logs UI */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">{T("recentLogs", "Recent Logs")}</h2>
          <div className="space-y-3">
            {incomes.length === 0 ? (
              <div className="text-center py-10 bg-card border border-border rounded-2xl shadow-sm">
                <Receipt className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{T("noIncomeYet", "No income logged yet.")}</p>
                <button onClick={openAdd} className="text-xs text-primary font-semibold mt-1">{T("tapToLogFirstPaycheck", "Tap to log your first paycheck")}</button>
              </div>
            ) : (
              incomes.map((inc) => (
                <div key={inc.id} className="flex justify-between items-center p-4 bg-card border border-border rounded-2xl shadow-sm hover:border-primary/30 transition-colors cursor-pointer" onClick={() => { setEditingIncome(inc); setIncomeForm({ amount: inc.amount, week_start: inc.week_start || startOfWeek(), note: inc.note || "" }); setIncomeDialog(true); }}>
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                      <DollarSign className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{inc.note || T("incomeLogged", "Income Logged")}</p>
                      <p className="text-xs text-muted-foreground">{T("weekOf", "Week of")} {getWeekLabel(inc.week_start, locale)}</p>
                    </div>
                  </div>
                  <p className="font-bold text-foreground text-sm">{fmt(inc.amount)}</p>
                </div>
              ))
            )}
          </div>
        </div>
        
      </motion.div>

      {/* Log Income Modal */}
      <Dialog open={incomeDialog} onOpenChange={setIncomeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingIncome ? T("editIncome", "Edit Income") : T("logIncome", "Log Income")}</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-4">
            
            <div className="bg-accent/10 p-3 rounded-2xl border border-accent/20 flex gap-3">
              <MessageSquare className="w-5 h-5 text-accent shrink-0 mt-1" />
              <div className="text-xs">
                <p className="font-semibold text-foreground">{T("askRayma", "Ask Rayma AI")}</p>
                <p className="text-muted-foreground">{T("askRaymaExample", '"I just got paid $1200 today."')}</p>
              </div>
            </div>
            
            <form onSubmit={handleSaveIncome} className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground ml-1">{T("amountLabel", "Amount")}</Label>
                <Input type="number" step="0.01" value={incomeForm.amount} onChange={e => setIncomeForm(f => ({...f, amount: e.target.value}))} required className="rounded-xl" placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground ml-1">{T("noteSourceLabel", "Note / Source")}</Label>
                <Input type="text" value={incomeForm.note} onChange={e => setIncomeForm(f => ({...f, note: e.target.value}))} className="rounded-xl" placeholder={T("weeklyPaycheckPlaceholder", "e.g. Weekly Paycheck")} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground ml-1">{T("dateLabel", "Date")}</Label>
                <Input type="date" value={incomeForm.week_start} onChange={e => setIncomeForm(f => ({...f, week_start: e.target.value}))} required className="rounded-xl" />
              </div>
              <Button type="submit" disabled={saving} className="w-full rounded-xl shadow-lg mt-2">
                {saving ? T("saving", "Saving...") : T("saveIncome", "Save Income")}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}