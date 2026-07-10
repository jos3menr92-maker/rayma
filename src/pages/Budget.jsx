import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { t } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit3, PiggyBank, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFinancialData } from "@/lib/FinancialDataContext";

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

  useEffect(() => {
    if (supaUser?.id) {
      loadData();
    }
  }, [supaUser?.id]);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase.from('savings_goals').select('*').eq('user_id', supaUser.id).order('created_at', { ascending: false });
    setGoals(data || []);
    setLoading(false);
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
    setSavingGoal(true);

    const data = {
      user_id: supaUser?.id, 
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

    await supabase.from('savings_goals').delete().eq('id', id);
    setGoalToDelete(null);
    loadData();
  }

  const getProgressColor = (p) => {
    if (p >= 100) return "bg-amber-500";
    if (p >= 75) return "bg-green-500";
    if (p >= 25) return "bg-primary";
    return "bg-slate-400";
  };

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
              const progress = Math.min((goal.current_saved / goal.target_amount) * 100, 100);
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
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>

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