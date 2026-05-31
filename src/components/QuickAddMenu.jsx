import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, Receipt, DollarSign, PiggyBank, TrendingDown, ArrowLeftRight, ScanLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function startOfWeek() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

const BILL_CATEGORIES = [
  { value: "utilities", label: "⚡ Utilities" },
  { value: "subscriptions", label: "📱 Subscriptions" },
  { value: "insurance", label: "🛡️ Insurance" },
  { value: "rent", label: "🏠 Rent" },
  { value: "food", label: "🍔 Food" },
  { value: "transport", label: "🚗 Transport" },
  { value: "health", label: "🏥 Health" },
  { value: "other", label: "📋 Other" },
];

export default function QuickAddMenu({ open, onClose }) {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState(null); // 'loan' | 'bill' | 'income' | 'savings'
  const [saving, setSaving] = useState(false);

  // Forms
  const [billForm, setBillForm] = useState({ name: "", amount: "", due_day: "", category: "other" });
  const [incomeForm, setIncomeForm] = useState({ amount: "", week_start: startOfWeek(), note: "" });
  const [savingsForm, setSavingsForm] = useState({ name: "", target_amount: "", current_saved: "", weekly_contribution: "" });
  const [txForm, setTxForm] = useState({ description: "", amount: "", date: new Date().toISOString().split("T")[0], category: "other", type: "debit" });

  function close() { setActiveModal(null); onClose(); }
  function openModal(m) { setActiveModal(m); }

  async function saveBill(e) {
    e.preventDefault(); setSaving(true);
    await base44.entities.Bill.create({ ...billForm, amount: parseFloat(billForm.amount) || 0, due_day: parseInt(billForm.due_day) || null, is_active: true });
    setSaving(false); setBillForm({ name: "", amount: "", due_day: "", category: "other" }); close();
  }

  async function saveIncome(e) {
    e.preventDefault(); setSaving(true);
    await base44.entities.WeeklyIncome.create({ ...incomeForm, amount: parseFloat(incomeForm.amount) || 0 });
    setSaving(false); setIncomeForm({ amount: "", week_start: startOfWeek(), note: "" }); close();
  }

  async function saveSavings(e) {
    e.preventDefault(); setSaving(true);
    await base44.entities.SavingsGoal.create({
      name: savingsForm.name,
      target_amount: parseFloat(savingsForm.target_amount) || 0,
      current_saved: parseFloat(savingsForm.current_saved) || 0,
      weekly_contribution: parseFloat(savingsForm.weekly_contribution) || 0,
      status: "active",
    });
    setSaving(false); setSavingsForm({ name: "", target_amount: "", current_saved: "", weekly_contribution: "" }); close();
  }

  async function saveTransaction(e) {
    e.preventDefault(); setSaving(true);
    const amount = parseFloat(txForm.amount) || 0;
    await base44.entities.Transaction.create({
      ...txForm,
      amount: txForm.type === "debit" ? -Math.abs(amount) : Math.abs(amount),
    });
    setSaving(false); setTxForm({ description: "", amount: "", date: new Date().toISOString().split("T")[0], category: "other", type: "debit" }); close();
  }

  const actions = [
    { key: "scan", icon: ScanLine, label: "Scan & Log Document", color: "bg-primary/10 text-primary border-primary/20", badge: "AI", action: () => { onClose(); navigate("/documents"); } },
    { key: "loan", icon: CreditCard, label: "Add Loan", color: "bg-blue-500/10 text-blue-600 border-blue-200", action: () => { onClose(); navigate("/add-loan"); } },
    { key: "bill", icon: Receipt, label: "Add Bill", color: "bg-orange-500/10 text-orange-600 border-orange-200", action: () => openModal("bill") },
    { key: "income", icon: DollarSign, label: "Log Income", color: "bg-green-500/10 text-green-600 border-green-200", action: () => openModal("income") },
    { key: "savings", icon: PiggyBank, label: "Add Savings Goal", color: "bg-purple-500/10 text-purple-600 border-purple-200", action: () => openModal("savings") },
    { key: "payment", icon: TrendingDown, label: "Record Payment", color: "bg-red-500/10 text-red-600 border-red-200", action: () => { onClose(); navigate("/loans"); } },
    { key: "transaction", icon: ArrowLeftRight, label: "Log Transaction", color: "bg-teal-500/10 text-teal-600 border-teal-200", action: () => openModal("transaction") },
  ];

  return (
    <>
      <AnimatePresence>
        {open && !activeModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={onClose}
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl border-t border-border shadow-2xl pb-10"
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <div>
                  <h2 className="text-base font-bold font-heading text-foreground">Quick Add</h2>
                  <p className="text-xs text-muted-foreground">What would you like to track?</p>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-4 pb-2 grid grid-cols-1 gap-2">
                {actions.map((a, i) => {
                  const Icon = a.icon;
                  return (
                    <motion.button
                      key={a.key}
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={a.action}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl border text-left transition-all active:scale-[0.98] ${a.color}`}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/60">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-sm">{a.label}</span>
                      {a.badge && (
                        <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">{a.badge}</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bill Modal */}
      <Dialog open={activeModal === "bill"} onOpenChange={v => !v && close()}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Bill</DialogTitle></DialogHeader>
          <form onSubmit={saveBill} className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Name *</Label>
              <Input placeholder="e.g. Netflix" value={billForm.name} onChange={e => setBillForm(f => ({ ...f, name: e.target.value }))} required className="mt-1 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Amount *</Label>
                <Input type="number" step="0.01" placeholder="$0" value={billForm.amount} onChange={e => setBillForm(f => ({ ...f, amount: e.target.value }))} required className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Due Day</Label>
                <Input type="number" min="1" max="31" placeholder="1–31" value={billForm.due_day} onChange={e => setBillForm(f => ({ ...f, due_day: e.target.value }))} className="mt-1 rounded-xl" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={billForm.category} onValueChange={v => setBillForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{BILL_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={saving} className="w-full rounded-xl">{saving ? "Saving..." : "Add Bill"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Income Modal */}
      <Dialog open={activeModal === "income"} onOpenChange={v => !v && close()}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Log Weekly Income</DialogTitle></DialogHeader>
          <form onSubmit={saveIncome} className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Amount *</Label>
              <Input type="number" step="0.01" placeholder="$0" value={incomeForm.amount} onChange={e => setIncomeForm(f => ({ ...f, amount: e.target.value }))} required className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Week Starting</Label>
              <Input type="date" value={incomeForm.week_start} onChange={e => setIncomeForm(f => ({ ...f, week_start: e.target.value }))} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Note</Label>
              <Input placeholder="Optional" value={incomeForm.note} onChange={e => setIncomeForm(f => ({ ...f, note: e.target.value }))} className="mt-1 rounded-xl" />
            </div>
            <Button type="submit" disabled={saving} className="w-full rounded-xl">{saving ? "Saving..." : "Log Income"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transaction Modal */}
      <Dialog open={activeModal === "transaction"} onOpenChange={v => !v && close()}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Log Transaction</DialogTitle></DialogHeader>
          <form onSubmit={saveTransaction} className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Description *</Label>
              <Input placeholder="e.g. Grocery store" value={txForm.description} onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))} required className="mt-1 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Amount *</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} required className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={txForm.type} onValueChange={v => setTxForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">💸 Expense</SelectItem>
                    <SelectItem value="credit">💰 Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input type="date" value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select value={txForm.category} onValueChange={v => setTxForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BILL_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    <SelectItem value="income">💵 Income</SelectItem>
                    <SelectItem value="entertainment">🎮 Entertainment</SelectItem>
                    <SelectItem value="shopping">🛍️ Shopping</SelectItem>
                    <SelectItem value="savings">🏦 Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={saving} className="w-full rounded-xl">{saving ? "Saving..." : "Log Transaction"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Savings Goal Modal */}
      <Dialog open={activeModal === "savings"} onOpenChange={v => !v && close()}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Savings Goal</DialogTitle></DialogHeader>
          <form onSubmit={saveSavings} className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Goal Name *</Label>
              <Input placeholder="e.g. Emergency Fund" value={savingsForm.name} onChange={e => setSavingsForm(f => ({ ...f, name: e.target.value }))} required className="mt-1 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Target Amount *</Label>
                <Input type="number" step="0.01" placeholder="$0" value={savingsForm.target_amount} onChange={e => setSavingsForm(f => ({ ...f, target_amount: e.target.value }))} required className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Saved So Far</Label>
                <Input type="number" step="0.01" placeholder="$0" value={savingsForm.current_saved} onChange={e => setSavingsForm(f => ({ ...f, current_saved: e.target.value }))} className="mt-1 rounded-xl" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Weekly Contribution</Label>
              <Input type="number" step="0.01" placeholder="$0" value={savingsForm.weekly_contribution} onChange={e => setSavingsForm(f => ({ ...f, weekly_contribution: e.target.value }))} className="mt-1 rounded-xl" />
            </div>
            <Button type="submit" disabled={saving} className="w-full rounded-xl">{saving ? "Saving..." : "Add Goal"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}