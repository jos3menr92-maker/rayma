import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit3, TrendingUp, Target, Send, Loader2, CheckCircle2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n || 0);

function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

const emptyIncome = { amount: "", week_start: getMonday(), source: "", notes: "" };
const emptyGoal = { name: "", target_amount: "", current_amount: "", weekly_contribution: "", target_date: "", emoji: "🎯", notes: "" };

const GOAL_EMOJIS = ["🎯", "🏠", "🚗", "✈️", "📱", "💍", "🎓", "🏖️", "💼", "🛡️"];

export default function Finance() {
  const [income, setIncome] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [incomeDialog, setIncomeDialog] = useState(false);
  const [goalDialog, setGoalDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [incomeForm, setIncomeForm] = useState(emptyIncome);
  const [goalForm, setGoalForm] = useState(emptyGoal);
  const [saving, setSaving] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [incomeData, goalsData, me] = await Promise.all([
      base44.entities.Income.list("-week_start", 52),
      base44.entities.SavingsGoal.list("-created_date", 50),
      base44.auth.me(),
    ]);
    setIncome(incomeData);
    setGoals(goalsData);
    setUserEmail(me?.email || "");
    setLoading(false);
  }

  // Check if income logged this week
  const thisWeek = getMonday();
  const loggedThisWeek = income.some(i => i.week_start === thisWeek);

  async function handleAddIncome(e) {
    e.preventDefault();
    setSaving(true);
    await base44.entities.Income.create({ ...incomeForm, amount: parseFloat(incomeForm.amount) || 0 });
    setSaving(false);
    setIncomeDialog(false);
    setIncomeForm(emptyIncome);
    loadData();
  }

  async function handleDeleteIncome(id) {
    await base44.entities.Income.delete(id);
    loadData();
  }

  async function handleSaveGoal(e) {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...goalForm,
      target_amount: parseFloat(goalForm.target_amount) || 0,
      current_amount: parseFloat(goalForm.current_amount) || 0,
      weekly_contribution: parseFloat(goalForm.weekly_contribution) || 0,
    };
    if (editingGoal) {
      await base44.entities.SavingsGoal.update(editingGoal.id, data);
    } else {
      await base44.entities.SavingsGoal.create(data);
    }
    setSaving(false);
    setGoalDialog(false);
    setEditingGoal(null);
    setGoalForm(emptyGoal);
    loadData();
  }

  async function handleDeleteGoal(id) {
    await base44.entities.SavingsGoal.delete(id);
    loadData();
  }

  function openEditGoal(goal) {
    setEditingGoal(goal);
    setGoalForm({
      name: goal.name, target_amount: goal.target_amount, current_amount: goal.current_amount || 0,
      weekly_contribution: goal.weekly_contribution || "", target_date: goal.target_date || "",
      emoji: goal.emoji || "🎯", notes: goal.notes || "",
    });
    setGoalDialog(true);
  }

  async function sendWeeklyReminder() {
    setSendingReminder(true);
    await base44.integrations.Core.SendEmail({
      to: userEmail,
      subject: "💰 Weekly Income Reminder",
      body: `Hi!\n\nThis is your weekly reminder to log your income in Debt Tracker.\n\nStaying consistent with income tracking helps you make better financial decisions and measure progress toward your savings goals.\n\nOpen the app and log this week's income now!\n\n— Debt Tracker`,
    });
    setSendingReminder(false);
    setReminderSent(true);
    setTimeout(() => setReminderSent(false), 3000);
  }

  const totalWeeklyIncome = income.slice(0, 4).reduce((s, i) => s + (i.amount || 0), 0) / Math.min(income.slice(0, 4).length, 4) || 0;
  const recentIncome = income.slice(0, 8);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold font-heading text-foreground mb-1">Finance</h1>
        <p className="text-sm text-muted-foreground mb-5">Track income & savings goals</p>

        {/* Weekly reminder banner */}
        {!loggedThisWeek && income.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-accent/10 border border-accent/30 rounded-2xl p-3 mb-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-accent" />
              <p className="text-sm font-medium text-foreground">Haven't logged income this week</p>
            </div>
            <Button size="sm" variant="outline" className="rounded-xl text-xs border-accent/40 text-accent"
              onClick={() => { setIncomeForm({ ...emptyIncome, week_start: thisWeek }); setIncomeDialog(true); }}>
              Log Now
            </Button>
          </motion.div>
        )}

        <Tabs defaultValue="income">
          <TabsList className="w-full mb-5 rounded-xl">
            <TabsTrigger value="income" className="flex-1 rounded-xl">
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Income
            </TabsTrigger>
            <TabsTrigger value="savings" className="flex-1 rounded-xl">
              <Target className="w-3.5 h-3.5 mr-1.5" /> Savings Goals
            </TabsTrigger>
          </TabsList>

          {/* INCOME TAB */}
          <TabsContent value="income">
            {/* Summary card */}
            <div className="bg-card border border-border rounded-2xl p-4 mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Weekly Income</p>
                <p className="text-xl font-bold font-heading text-foreground">{fmt(totalWeeklyIncome)}</p>
                <p className="text-xs text-muted-foreground">based on last {Math.min(income.slice(0,4).length, 4)} entries</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button size="sm" className="rounded-xl" onClick={() => { setIncomeForm(emptyIncome); setIncomeDialog(true); }}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Log Income
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={sendWeeklyReminder} disabled={sendingReminder || !userEmail}>
                  {sendingReminder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                    reminderSent ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1 text-primary" />Sent!</> :
                    <><Send className="w-3.5 h-3.5 mr-1" />Email Reminder</>}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {recentIncome.map((entry, i) => (
                  <motion.div key={entry.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{entry.source || "Income"}</p>
                      <p className="text-xs text-muted-foreground">Week of {entry.week_start}</p>
                      {entry.notes && <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-bold text-primary">{fmt(entry.amount)}</p>
                      <button onClick={() => handleDeleteIncome(entry.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {income.length === 0 && (
              <div className="text-center py-12">
                <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No income logged yet. Start by logging this week's income.</p>
              </div>
            )}
          </TabsContent>

          {/* SAVINGS GOALS TAB */}
          <TabsContent value="savings">
            <div className="flex justify-end mb-4">
              <Button size="sm" className="rounded-xl" onClick={() => { setEditingGoal(null); setGoalForm(emptyGoal); setGoalDialog(true); }}>
                <Plus className="w-3.5 h-3.5 mr-1" /> New Goal
              </Button>
            </div>

            <div className="space-y-4">
              <AnimatePresence>
                {goals.map((goal, i) => {
                  const progress = goal.target_amount > 0 ? Math.min((goal.current_amount || 0) / goal.target_amount * 100, 100) : 0;
                  const remaining = Math.max((goal.target_amount || 0) - (goal.current_amount || 0), 0);
                  const weeksLeft = goal.weekly_contribution > 0 ? Math.ceil(remaining / goal.weekly_contribution) : null;
                  return (
                    <motion.div key={goal.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-card border border-border rounded-2xl p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                            {goal.emoji || "🎯"}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{goal.name}</p>
                            <p className="text-xs text-muted-foreground">{fmt(goal.current_amount || 0)} of {fmt(goal.target_amount)}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEditGoal(goal)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteGoal(goal.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
                        <motion.div className="h-full bg-primary rounded-full"
                          initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }} />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-primary">{progress.toFixed(1)}% saved</span>
                        <div className="flex gap-3 text-[11px] text-muted-foreground">
                          {goal.weekly_contribution > 0 && <span>{fmt(goal.weekly_contribution)}/wk</span>}
                          {weeksLeft !== null && <span>~{weeksLeft} weeks left</span>}
                          {goal.target_date && <span>by {goal.target_date}</span>}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {goals.length === 0 && (
              <div className="text-center py-12">
                <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No savings goals yet. Create your first goal!</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Log Income Dialog */}
      <Dialog open={incomeDialog} onOpenChange={setIncomeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Log Weekly Income</DialogTitle></DialogHeader>
          <form onSubmit={handleAddIncome} className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Amount *</Label>
              <Input type="number" step="0.01" placeholder="$0.00" value={incomeForm.amount}
                onChange={e => setIncomeForm(f => ({ ...f, amount: e.target.value }))} required className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Week Starting *</Label>
              <Input type="date" value={incomeForm.week_start}
                onChange={e => setIncomeForm(f => ({ ...f, week_start: e.target.value }))} required className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Source</Label>
              <Input placeholder="e.g. Salary, Freelance" value={incomeForm.source}
                onChange={e => setIncomeForm(f => ({ ...f, source: e.target.value }))} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Input placeholder="Optional" value={incomeForm.notes}
                onChange={e => setIncomeForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 rounded-xl" />
            </div>
            <Button type="submit" disabled={saving || !incomeForm.amount} className="w-full rounded-xl">
              {saving ? "Saving..." : "Log Income"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Savings Goal Dialog */}
      <Dialog open={goalDialog} onOpenChange={setGoalDialog}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingGoal ? "Edit Goal" : "New Savings Goal"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveGoal} className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Goal Name *</Label>
              <Input placeholder="e.g. Emergency Fund" value={goalForm.name}
                onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))} required className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Emoji Icon</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {GOAL_EMOJIS.map(emoji => (
                  <button key={emoji} type="button"
                    onClick={() => setGoalForm(f => ({ ...f, emoji }))}
                    className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${goalForm.emoji === emoji ? "bg-primary/20 ring-2 ring-primary" : "bg-muted hover:bg-muted/80"}`}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Target Amount *</Label>
                <Input type="number" step="0.01" placeholder="$0.00" value={goalForm.target_amount}
                  onChange={e => setGoalForm(f => ({ ...f, target_amount: e.target.value }))} required className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Amount Saved</Label>
                <Input type="number" step="0.01" placeholder="$0.00" value={goalForm.current_amount}
                  onChange={e => setGoalForm(f => ({ ...f, current_amount: e.target.value }))} className="mt-1 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Weekly Contribution</Label>
                <Input type="number" step="0.01" placeholder="$0.00" value={goalForm.weekly_contribution}
                  onChange={e => setGoalForm(f => ({ ...f, weekly_contribution: e.target.value }))} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Target Date</Label>
                <Input type="date" value={goalForm.target_date}
                  onChange={e => setGoalForm(f => ({ ...f, target_date: e.target.value }))} className="mt-1 rounded-xl" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Input placeholder="Optional" value={goalForm.notes}
                onChange={e => setGoalForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 rounded-xl" />
            </div>
            <Button type="submit" disabled={saving} className="w-full rounded-xl">
              {saving ? "Saving..." : editingGoal ? "Save Changes" : "Create Goal"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}