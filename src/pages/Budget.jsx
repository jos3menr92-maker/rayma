import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { t } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Plus, Trash2, Edit3, PiggyBank, ShieldAlert, Loader2, Trophy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFinancialData } from "@/lib/FinancialDataContext";

const MILESTONES = [25, 50, 75, 100];

export default function Budget() {
  const { lang } = useLanguage();
  const { formatCurrency: fmt } = useCurrency();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [goalOpen, setGoalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [goalForm, setGoalForm] = useState({ name: "", target_amount: "", current_saved: "", notes: "" });
  const [savingGoal, setSavingGoal] = useState(false);
  const { supaUser, reload } = useFinancialData();

  // 🔐 Security Vault State
  const [showPasswordLock, setShowPasswordLock] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState(null);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

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

  // 🛡️ FAIL-SAFE: Ensure spinner stops if user session isn't found
  useEffect(() => {
    if (supaUser?.id) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [supaUser?.id]);

  // 🛡️ FAIL-SAFE: Wrapped in try/catch/finally to guarantee UI unlocks
  async function loadData() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('savings_goals').select('*').eq('user_id', supaUser.id).order('created_at', { ascending: false });
      if (error) throw error;
      setGoals(data || []);
    } catch (err) {
      console.error("Failed to load goals:", err.message);
    } finally {
      setLoading(false);
    }
  }

  function openAddGoal() {
    setEditingGoal(null);
    setGoalForm({ name: "", target_amount: "", current_saved: "", notes: "" });
    setGoalOpen(true);
  }

  function openEditGoal(goal) {
    setEditingGoal(goal);
    setGoalForm({ name: goal.name, target_amount: goal.target_amount, current_saved: goal.current_saved || 0, notes: goal.notes || "" });
    setGoalOpen(true);
  }

  async function handleSaveGoal(e) {
    e.preventDefault();
    
    if (!supaUser?.id) return; // 🛡️ FAIL-SAFE: Prevent null ID crash
    
    setSavingGoal(true);

    const data = {
      user_id: supaUser.id, 
      name: goalForm.name,
      target_amount: parseFloat(goalForm.target_amount) || 0,
      current_saved: parseFloat(goalForm.current_saved) || 0,
      notes: goalForm.notes,
    };

    try {
      if (editingGoal) {
        const { error } = await supabase.from('savings_goals').update(data).eq('id', editingGoal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('savings_goals').insert([data]);
        if (error) throw error;
      }
      
      await reload(); 
      setGoalOpen(false); 
      await loadData();
    } catch (err) {
      console.error("Failed to save savings goal:", err.message);
    } finally {
      setSavingGoal(false); 
    }
  }

  const handleDeleteGoal = (id) => {
    setGoalToDelete(id);
    setPassword("");
    setAuthError("");
    setShowPasswordLock(true);
  };

  const verifyAndExecute = async () => {
    setAuthError("");
    setIsVerifying(true);
    try {
      await executeDeleteGoal(password, goalToDelete);
      setShowPasswordLock(false);
    } catch (err) {
      setAuthError(T("invalidPassword", "Invalid password. Please try again."));
    } finally {
      setIsVerifying(false);
    }
  };

  async function executeDeleteGoal(password, id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) throw new Error("Could not verify user identity.");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password });
    if (signInError) throw signInError;

    const { error } = await supabase.from('savings_goals').delete().eq('id', id);
    if (error) throw error;
    setGoalToDelete(null);
    loadData();
  }

  const getProgressColor = (p) => {
    if (p >= 100) return "bg-amber-500";
    if (p >= 75) return "bg-green-500";
    if (p >= 25) return "bg-primary";
    return "bg-slate-400";
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
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="fixed left-1/2 top-1/2 w-[92%] max-w-sm -translate-x-1/2 -translate-y-1/2 z-[1001]"
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
            <Button type="submit" disabled={savingGoal} className="w-full rounded-xl">{savingGoal ? T("saving", "Saving...") : T("saveGoal", "Save Goal")}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* 🔐 SECURITY MODAL (The Vault) */}
      {showPasswordLock && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-background border rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-500">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-bold text-lg text-foreground">{T("verifyPassword", "Verify Password")}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{T("deleteGoalConfirm", "Enter your password to permanently delete this goal.")}</p>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={T("enterPassword", "Enter password...")} />
            {authError && <p className="text-xs text-destructive">{authError}</p>}
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setShowPasswordLock(false)}>{T("cancel", "Cancel")}</Button>
              <Button className="flex-1" onClick={verifyAndExecute} disabled={isVerifying || !password}>
                {isVerifying ? <Loader2 className="animate-spin" /> : T("confirm", "Confirm")}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
