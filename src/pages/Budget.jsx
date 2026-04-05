import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit3, TrendingUp, PiggyBank, Bell, CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n || 0);

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().split("T")[0];
}

function weeksUntil(targetDate) {
  const now = new Date();
  const target = new Date(targetDate);
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24 * 7));
  return Math.max(diff, 1);
}

export default function Budget() {
  const [incomes, setIncomes] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  // Income dialog
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [incomeForm, setIncomeForm] = useState({ amount: "", week_start: getWeekStart(), note: "" });
  const [savingIncome, setSavingIncome] = useState(false);

  // Savings goal dialog
  const [goalOpen, setGoalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [goalForm, setGoalForm] = useState({ name: "", target_amount: "", current_saved: "", weekly_contribution: "", target_date: "", notes: "" });
  const [savingGoal, setSavingGoal] = useState(false);

  // Reminder
  const [reminding, setReminding] = useState(false);
  const [reminded, setReminded] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [incomeData, goalsData, me] = await Promise.all([
      base44.entities.WeeklyIncome.list("-week_start", 12),
      base44.entities.SavingsGoal.list("-created_date", 50),
      base44.auth.me(),
    ]);
    setIncomes(incomeData);
    setGoals(goalsData);
    setUserEmail(me?.email || "");
    setLoading(false);
  }

  // Income
  async function handleSaveIncome(e) {
    e.preventDefault();
    setSavingIncome(true);
    await base44.entities.WeeklyIncome.create({
      amount: parseFloat(incomeForm.amount),
      week_start: incomeForm.week_start,
      note: incomeForm.note,
    });
    setIncomeForm({ amount: "", week_start: getWeekStart(), note: "" });
    setIncomeOpen(false);
    setSavingIncome(false);
    loadData();
  }

  async function handleDeleteIncome(id) {
    await base44.entities.WeeklyIncome.delete(id);
    loadData();
  }

  // Reminder email
  async function sendWeeklyReminder() {
    setReminding(true);
    await base44.integrations.Core.SendEmail({
      to: userEmail,
      subject: "💸 Weekly Income Reminder",
      body: `Hi!\n\nThis is your weekly reminder to log your income in Debt Tracker.\n\nStay consistent — tracking your income helps you stay on top of your finances!\n\n— Debt Tracker`,
    });
    setReminding(false);
    setReminded(true);
    setTimeout(() => setReminded(false), 3000);
  }

  // Savings goals
  function openAddGoal() {
    setEditingGoal(null);
    setGoalForm({ name: "", target_amount: "", current_saved: "", weekly_contribution: "", target_date: "", notes: "" });
    setGoalOpen(true);
  }

  function openEditGoal(goal) {
    setEditingGoal(goal);
    setGoalForm({
      name: goal.name,
      target_amount: goal.target_amount,
      current_saved: goal.current_saved || 0,
      weekly_contribution: goal.weekly_contribution || "",
      target_date: goal.target_date || "",
      notes: goal.notes || "",
    });
    setGoalOpen(true);
  }

  async function handleSaveGoal(e) {
    e.preventDefault();
    setSavingGoal(true);
    const data = {
      name: goalForm.name,
      target_amount: parseFloat(goalForm.target_amount) || 0,
      current_saved: parseFloat(goalForm.current_saved) || 0,
      weekly_contribution: parseFloat(goalForm.weekly_contribution) || 0,
      target_date: goalForm.target_date || null,
      notes: goalForm.notes,
    };
    if (editingGoal) {
      await base44.entities.SavingsGoal.update(editingGoal.id, data);
    } else {
      await base44.entities.SavingsGoal.create(data);
    }
    setSavingGoal(false);
    setGoalOpen(false);
    loadData();
  }

  async function handleDeleteGoal(id) {
    await base44.entities.SavingsGoal.delete(id);
    loadData();
  }

  async function markGoalComplete(goal) {
    await base44.entities.SavingsGoal.update(goal.id, { status: "completed" });
    loadData();
  }

  const thisWeek = getWeekStart();
  const hasThisWeekIncome = incomes.some((i) => i.week_start === thisWeek);
  const avgWeeklyIncome = incomes.length > 0
    ? incomes.reduce((s, i) => s + (i.amount || 0), 0) / incomes.length
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold font-heading text-foreground mb-1">Budget & Savings</h1>
        <p className="text-sm text-muted-foreground mb-6">Track your income and plan your savings</p>

        {/* ── WEEKLY INCOME ── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold font-heading text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Weekly Income
            </h2>
            <Button size="sm" className="rounded-xl" onClick={() => setIncomeOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Log
            </Button>
          </div>

          {/* This week banner */}
          {!hasThisWeekIncome && (
            <div className="bg-accent/10 border border-accent/30 rounded-2xl p-3 flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-accent" />
                <p className="text-sm text-foreground font-medium">Haven't logged income this week</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl text-xs"
                onClick={sendWeeklyReminder}
                disabled={reminding || !userEmail}
              >
                {reminding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                  reminded ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1 text-primary" />Sent!</> :
                  <><Send className="w-3.5 h-3.5 mr-1" />Remind me</>}
              </Button>
            </div>
          )}

          {/* Summary */}
          {incomes.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-card border border-border rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">This Week</p>
                <p className="text-lg font-bold font-heading text-foreground">
                  {fmt(incomes.find(i => i.week_start === thisWeek)?.amount || 0)}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Avg / Week</p>
                <p className="text-lg font-bold font-heading text-foreground">{fmt(avgWeeklyIncome)}</p>
              </div>
            </div>
          )}

          {/* Income list */}
          <div className="space-y-2">
            <AnimatePresence>
              {incomes.slice(0, 8).map((income, i) => (
                <motion.div
                  key={income.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-card border border-border rounded-xl p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{fmt(income.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      Week of {new Date(income.week_start + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {income.note ? ` · ${income.note}` : ""}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteIncome(income.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {incomes.length === 0 && (
            <div className="text-center py-8">
              <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No income logged yet</p>
            </div>
          )}
        </div>

        {/* ── SAVINGS GOALS ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold font-heading text-foreground flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-primary" /> Savings Goals
            </h2>
            <Button size="sm" className="rounded-xl" onClick={openAddGoal}>
              <Plus className="w-4 h-4 mr-1" /> Add Goal
            </Button>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {goals.map((goal, i) => {
                const progress = goal.target_amount > 0
                  ? Math.min((goal.current_saved || 0) / goal.target_amount * 100, 100)
                  : 0;
                const remaining = Math.max((goal.target_amount || 0) - (goal.current_saved || 0), 0);
                const weeksNeeded = goal.weekly_contribution > 0
                  ? Math.ceil(remaining / goal.weekly_contribution)
                  : null;

                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`bg-card border border-border rounded-2xl p-4 ${goal.status === "completed" ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{goal.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmt(goal.current_saved || 0)} of {fmt(goal.target_amount)}
                          {goal.weekly_contribution ? ` · ${fmt(goal.weekly_contribution)}/wk` : ""}
                        </p>
                      </div>
                      <div className="flex gap-1 items-center">
                        {goal.status !== "completed" && (
                          <button onClick={() => markGoalComplete(goal)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors" title="Mark complete">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => openEditGoal(goal)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteGoal(goal.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-primary">{progress.toFixed(0)}% saved</span>
                      {goal.status === "completed" ? (
                        <span className="text-primary font-semibold">✓ Completed</span>
                      ) : weeksNeeded ? (
                        <span className="text-muted-foreground">~{weeksNeeded} weeks to go</span>
                      ) : goal.target_date ? (
                        <span className="text-muted-foreground">
                          {weeksUntil(goal.target_date)} weeks left
                        </span>
                      ) : null}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {goals.length === 0 && (
            <div className="text-center py-8">
              <PiggyBank className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No savings goals yet. Create one to get started!</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Income Dialog */}
      <Dialog open={incomeOpen} onOpenChange={setIncomeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Log Weekly Income</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveIncome} className="space-y-3 mt-2">
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
              <Label className="text-xs text-muted-foreground">Note</Label>
              <Input placeholder="Optional" value={incomeForm.note}
                onChange={e => setIncomeForm(f => ({ ...f, note: e.target.value }))} className="mt-1 rounded-xl" />
            </div>
            <Button type="submit" disabled={savingIncome || !incomeForm.amount} className="w-full rounded-xl">
              {savingIncome ? "Saving..." : "Save"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Savings Goal Dialog */}
      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingGoal ? "Edit Goal" : "New Savings Goal"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveGoal} className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Goal Name *</Label>
              <Input placeholder="e.g. Emergency Fund" value={goalForm.name}
                onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))} required className="mt-1 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Target Amount *</Label>
                <Input type="number" step="0.01" placeholder="$0" value={goalForm.target_amount}
                  onChange={e => setGoalForm(f => ({ ...f, target_amount: e.target.value }))} required className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Saved So Far</Label>
                <Input type="number" step="0.01" placeholder="$0" value={goalForm.current_saved}
                  onChange={e => setGoalForm(f => ({ ...f, current_saved: e.target.value }))} className="mt-1 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Weekly Contribution</Label>
                <Input type="number" step="0.01" placeholder="$0/wk" value={goalForm.weekly_contribution}
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
            <Button type="submit" disabled={savingGoal || !goalForm.name || !goalForm.target_amount} className="w-full rounded-xl">
              {savingGoal ? "Saving..." : editingGoal ? "Save Changes" : "Create Goal"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}