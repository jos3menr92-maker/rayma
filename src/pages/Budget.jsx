import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { createRecord, updateRecord, deleteRecord } from "@/utils/financialRecord";
import { useLanguage } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { t } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Plus, Trash2, Edit3, PiggyBank, Trophy, Sparkles, Calendar, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFinancialData } from "@/lib/FinancialDataContext";
import ConfirmDialog from "@/components/ConfirmDialog";

const MILESTONES = [25, 50, 75, 100];

export default function Budget() {
  const { lang } = useLanguage();
  const { formatCurrency: fmt } = useCurrency();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const [goalOpen, setGoalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [goalForm, setGoalForm] = useState({ name: "", target_amount: "", current_saved: "", notes: "", target_date: "", weekly_contribution: "" });
  const [savingGoal, setSavingGoal] = useState(false);
  const { supaUser, savingsGoals: goals, loading, reload } = useFinancialData();

  const [showConfirm, setShowConfirm] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState(null);

  // 🎉 Goal Milestone Celebration State
  const [winOverlay, setWinOverlay] = useState(null);
  const [shownMilestones, setShownMilestones] = useState({});
  const milestoneMemoryRef = useRef({});

  const triggerRaymaConfetti = useCallback((milestone) => {
    const coinPalette = ["#F59E0B", "#FBBF24", "#FCD34D", "#EAB308", "#22C55E", "#14B8A6"];

    const pulse = (angle, originX) => confetti({
      particleCount: milestone >= 100 ? 90 : 55,
      spread: milestone >= 100 ? 85 : 65,
      startVelocity: milestone >= 100 ? 55 : 40,
      angle,
      origin: { x: originX, y: 0.72 },
      colors: coinPalette,
      ticks: milestone >= 100 ? 250 : 180,
      scalar: milestone >= 100 ? 1.1 : 0.95,
      gravity: 0.95,
      shapes: ["square", "circle"],
      zIndex: 1000,
    });

    pulse(60, 0);
    pulse(120, 1);

    setTimeout(() => {
      confetti({
        particleCount: milestone >= 100 ? 120 : 70,
        spread: milestone >= 100 ? 120 : 90,
        startVelocity: milestone >= 100 ? 50 : 35,
        origin: { x: 0.5, y: 0.6 },
        colors: coinPalette,
        scalar: milestone >= 100 ? 1.2 : 1,
        ticks: milestone >= 100 ? 280 : 190,
        gravity: 0.9,
        shapes: ["circle"],
        zIndex: 1000,
      });
    }, 220);
  }, []);

  const showMilestoneWinner = useCallback((goal, milestone) => {
    triggerRaymaConfetti(milestone);

    setWinOverlay({
      goalName: goal.name,
      milestone,
      title: milestone === 100
        ? T("goalCompleteTitle", "Rayma Win! Goal Complete 🎉")
        : T("goalMilestoneTitle", `Rayma Win! ${milestone}% Milestone`),
      subtitle: milestone === 100
        ? T("goalCompleteMessage", "You did it. Every step counted, and you showed up for yourself. We’re proud of you.")
        : T("goalMilestoneMessage", "Beautiful progress. Keep going—your future self will thank you for this consistency."),
    });
  }, [T, triggerRaymaConfetti]);

  function openAddGoal() {
    setEditingGoal(null);
    setGoalForm({ name: "", target_amount: "", current_saved: "", notes: "", target_date: "", weekly_contribution: "" });
    setGoalOpen(true);
  }

  function openEditGoal(goal) {
    setEditingGoal(goal);
    setGoalForm({ name: goal.name, target_amount: goal.target_amount, current_saved: goal.current_saved || 0, notes: goal.notes || "", target_date: goal.target_date || "", weekly_contribution: goal.weekly_contribution || "" });
    setGoalOpen(true);
  }

  async function handleSaveGoal(e) {
    e.preventDefault();
    
    setSavingGoal(true);

    const data = {
      name: goalForm.name,
      target_amount: parseFloat(goalForm.target_amount) || 0,
      current_saved: parseFloat(goalForm.current_saved) || 0,
      notes: goalForm.notes,
      target_date: goalForm.target_date || null,
      weekly_contribution: parseFloat(goalForm.weekly_contribution) || null,
    };

    try {
      if (editingGoal) {
        await updateRecord('savings_goals', editingGoal.id, data);
      } else {
        await createRecord('savings_goals', data);
      }
      
      await reload(); 
      setGoalOpen(false); 
    } catch (err) {
      console.error("Failed to save savings goal:", err.message);
    } finally {
      setSavingGoal(false); 
    }
  }

  const handleDeleteGoal = (id) => {
    setGoalToDelete(id);
    setShowConfirm(true);
  };

  const confirmDeleteGoal = async () => {
    if (!goalToDelete) return;
    try {
      await deleteRecord('savings_goals', goalToDelete);
    } catch (err) {
      console.error("Failed to delete goal:", err.message);
    }
    setGoalToDelete(null);
    setShowConfirm(false);
    reload();
  };

  const getProgressColor = (p) => {
    if (p >= 100) return "bg-amber-500";
    if (p >= 75) return "bg-green-500";
    if (p >= 25) return "bg-primary";
    return "bg-slate-400";
  };

  const getGoalTimeline = (goal) => {
    const info = { dateLabel: null, timeLabel: null, isOverdue: false, contribution: null, purpose: null };

    if (goal.notes) info.purpose = goal.notes;
    if (goal.weekly_contribution) info.contribution = fmt(goal.weekly_contribution);

    if (goal.target_date) {
      const target = new Date(goal.target_date);
      const now = new Date();
      const daysLeft = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
      info.dateLabel = T("targetDate", "Target Date");
      const dateStr = target.toLocaleDateString(lang === 'es' ? 'es' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      if (daysLeft < 0) { info.isOverdue = true; info.timeLabel = `${dateStr} · ${T("overdue", "Overdue")}`; }
      else if (daysLeft === 0) { info.timeLabel = `${dateStr} · ${T("dueToday", "Due today")}`; }
      else if (daysLeft <= 30) { info.timeLabel = `${dateStr} · ${T("daysLeft", "{n} days left").replace("{n}", daysLeft)}`; }
      else { info.timeLabel = `${dateStr} · ${T("monthsLeft", "{n} months left").replace("{n}", Math.ceil(daysLeft / 30))}`; }
    } else if (goal.weekly_contribution && Number(goal.target_amount) > Number(goal.current_saved)) {
      const weeksLeft = Math.ceil((Number(goal.target_amount) - Number(goal.current_saved)) / Number(goal.weekly_contribution));
      const estDate = new Date();
      estDate.setDate(estDate.getDate() + weeksLeft * 7);
      info.dateLabel = T("estimatedCompletion", "Est. Completion");
      info.timeLabel = estDate.toLocaleDateString(lang === 'es' ? 'es' : 'en-US', { month: 'short', year: 'numeric' });
    }

    return info;
  };

  useEffect(() => {
    const nextShown = {};

    goals.forEach((goal) => {
      const target = Number(goal.target_amount) || 0;
      const current = Number(goal.current_saved) || 0;
      if (target <= 0) return;

      const progress = Math.min((current / target) * 100, 100);
      const reached = MILESTONES.filter((m) => progress >= m);
      nextShown[goal.id] = reached;

      const alreadySeen = milestoneMemoryRef.current[goal.id] || [];
      const newlyReached = reached.find((m) => !alreadySeen.includes(m));

      if (newlyReached) {
        showMilestoneWinner(goal, newlyReached);
        milestoneMemoryRef.current[goal.id] = [...alreadySeen, newlyReached];
      } else {
        milestoneMemoryRef.current[goal.id] = reached;
      }
    });

    setShownMilestones(nextShown);
  }, [goals, showMilestoneWinner]);

  useEffect(() => {
    if (!winOverlay) return;
    const timeout = setTimeout(() => setWinOverlay(null), 5200);
    return () => clearTimeout(timeout);
  }, [winOverlay]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold font-heading text-foreground mb-1">{T("savingsVault", "Savings Vault")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{T("trackGoalsSubtitle", "Track your goals and level up your net worth")}</p>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-primary" /> {T("activeGoals", "Active Goals")}
          </h2>
          <Button size="sm" className="rounded-xl" onClick={openAddGoal}><Plus className="w-4 h-4 mr-1" /> {T("addGoal", "Add Goal")}</Button>
        </div>

        <div className="space-y-4">
          <AnimatePresence>
            {goals.map((goal) => {
              const target = Number(goal.target_amount) || 0;
              const current = Number(goal.current_saved) || 0;
              const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
              const reachedBadges = shownMilestones[goal.id] || [];
              const timeline = getGoalTimeline(goal);

              return (
                <motion.div key={goal.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-3xl p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-foreground">{goal.name}</p>
                      <p className="text-xs text-muted-foreground">{fmt(goal.current_saved)} / {fmt(goal.target_amount)}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditGoal(goal)} className="p-2 text-muted-foreground hover:text-foreground"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteGoal(goal.id)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden mb-2">
                    <motion.div className={`h-full ${getProgressColor(progress)}`} initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs font-bold text-primary">{progress.toFixed(0)}% {T("reached", "reached")}</p>

                  {(timeline.dateLabel || timeline.contribution || timeline.purpose) && (
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
                      {timeline.dateLabel && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> {timeline.dateLabel}</span>
                          <span className={`font-semibold text-right ${timeline.isOverdue ? "text-destructive" : "text-foreground"}`}>{timeline.timeLabel}</span>
                        </div>
                      )}
                      {timeline.contribution && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {T("weekly", "Weekly")}</span>
                          <span className="font-semibold text-foreground">{timeline.contribution}</span>
                        </div>
                      )}
                      {timeline.purpose && (
                        <p className="text-xs text-muted-foreground italic flex items-start gap-1 pt-0.5"><Target className="w-3 h-3 mt-0.5 shrink-0" /> {timeline.purpose}</p>
                      )}
                    </div>
                  )}

                  {reachedBadges.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {reachedBadges.map((m) => (
                        <span
                          key={`${goal.id}-${m}`}
                          className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700"
                        >
                          <Trophy className="w-3.5 h-3.5" />
                          {m}% {T("milestone", "Milestone")}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence>
        {winOverlay && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/45 backdrop-blur-[1px] z-[999]"
              onClick={() => setWinOverlay(null)}
            />
            <motion.div
              initial={{ opacity: 0, x: "-50%", y: "-40%", scale: 0.96 }}
              animate={{ opacity: 1, x: "-50%", y: "-50%", scale: 1 }}
              exit={{ opacity: 0, x: "-50%", y: "-50%", scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="fixed left-1/2 top-1/2 w-[92%] max-w-sm z-[1001]"
            >
              <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-white p-5 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-bold text-amber-700">
                    <Sparkles className="w-4 h-4" />
                    RAYMA WIN
                  </div>
                  <button
                    onClick={() => setWinOverlay(null)}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    {T("close", "Close")}
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-foreground leading-tight">{winOverlay.title}</h3>
                    <p className="text-xs text-muted-foreground">{winOverlay.goalName} • {winOverlay.milestone}%</p>
                  </div>
                </div>

                <p className="text-sm text-foreground/90 leading-relaxed">{winOverlay.subtitle}</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader><DialogTitle>{editingGoal ? T("editGoal", "Edit Goal") : T("newSavingsGoal", "New Savings Goal")}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveGoal} className="space-y-4 mt-2">
            <div><Label>{T("goalName", "Goal Name")}</Label><Input value={goalForm.name} onChange={e => setGoalForm(f => ({...f, name: e.target.value}))} required className="rounded-xl" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{T("targetAmount", "Target Amount")}</Label><Input type="number" value={goalForm.target_amount} onChange={e => setGoalForm(f => ({...f, target_amount: e.target.value}))} required className="rounded-xl" /></div>
              <div><Label>{T("savedSoFar", "Saved So Far")}</Label><Input type="number" value={goalForm.current_saved} onChange={e => setGoalForm(f => ({...f, current_saved: e.target.value}))} className="rounded-xl" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{T("targetDate", "Target Date")}</Label><Input type="date" value={goalForm.target_date} onChange={e => setGoalForm(f => ({...f, target_date: e.target.value}))} className="rounded-xl" /></div>
              <div><Label>{T("weeklyContribution", "Weekly Contribution")}</Label><Input type="number" value={goalForm.weekly_contribution} onChange={e => setGoalForm(f => ({...f, weekly_contribution: e.target.value}))} className="rounded-xl" /></div>
            </div>
            <div><Label>{T("goalPurpose", "What's it for?")}</Label><Input value={goalForm.notes} onChange={e => setGoalForm(f => ({...f, notes: e.target.value}))} placeholder={T("goalPurposePlaceholder", "e.g. Emergency fund, Vacation...")} className="rounded-xl" /></div>
            <Button type="submit" disabled={savingGoal} className="w-full rounded-xl">{savingGoal ? T("saving", "Saving...") : T("saveGoal", "Save Goal")}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title={T("deleteGoal", "Delete Goal")}
        description={T("deleteGoalConfirmSimple", "Are you sure you want to delete this savings goal? This cannot be undone.")}
        confirmLabel={T("delete", "Delete")}
        cancelLabel={T("cancel", "Cancel")}
        destructive
        onConfirm={confirmDeleteGoal}
      />
    </div>
  );
}