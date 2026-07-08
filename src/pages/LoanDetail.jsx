import { useEffect, useState } from "react"; 
import { useParams, useNavigate } from "react-router-dom"; 
import { supabase } from "@/lib/supabaseClient"; 
import { useFinancialData } from "@/lib/FinancialDataContext"; 
import { useCurrency } from "@/hooks/useCurrency";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { motion } from "framer-motion"; 
import { 
  ArrowLeft, Edit3, Trash2, Plus, Calendar, Percent, Building, 
  ShieldAlert, Loader2 
} from "lucide-react"; 
import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label"; 
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"; 
import ProgressRing from "../components/ProgressRing";
import LatePaymentLog from "../components/LatePaymentLog";
import PaymentItem from "../components/PaymentItem";
import EditLoanForm from "../components/EditLoanForm";

const categoryIcons = {
  mortgage: "🏠", auto: "🚗", student: "🎓", personal: "💰",
  credit_card: "💳", medical: "🏥", other: "📋",
};

export default function LoanDetail() { 
  const { id } = useParams(); 
  const navigate = useNavigate(); 
  const { formatCurrency: fmt } = useCurrency(); 
  // 🚀 FIXED: Extracted supaUser to secure the database inserts
  const { reload, supaUser } = useFinancialData(); 
  const { lang } = useLanguage();
  const T = (key, fallback) => t(lang, key) !== key ? t(lang, key) : fallback;
  
  const [loan, setLoan] = useState(null); 
  const [payments, setPayments] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [paymentOpen, setPaymentOpen] = useState(false); 
  const [editOpen, setEditOpen] = useState(false); 
  const [payForm, setPayForm] = useState({ amount: "", payment_date: new Date().toISOString().split("T")[0], note: "" }); 
  const [saving, setSaving] = useState(false); 

  // 🔐 Security Vault State
  const [showPasswordLock, setShowPasswordLock] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => { 
    if (supaUser?.id) {
      loadData(); 
    }
    const params = new URLSearchParams(window.location.search); 
    if (params.get("quickpay") === "1") setPaymentOpen(true); 
  }, [id, supaUser?.id]); 

  async function loadData() { 
    const { data: loanData } = await supabase.from('loans').select('*').eq('id', id).single(); 
    const { data: paymentData } = await supabase.from('payments').select('*').eq('loan_id', id).eq('user_id', supaUser.id).order('payment_date', { ascending: false }); 
    setLoan(loanData); 
    setPayments(paymentData || []); 
    setLoading(false); 
  }

  // ---------------------------------------------------------
  // 🛡️ SECURE ACTIONS (The Vault)
  // ---------------------------------------------------------

  const triggerSecurityCheck = (action, meta = {}) => {
    setPendingAction({ type: action, meta });
    setPassword("");
    setAuthError("");
    setShowPasswordLock(true);
  };

  const verifyAndExecute = async () => {
    setAuthError("");
    setIsVerifying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Could not verify user identity.");
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password });
      if (signInError) throw new Error("Invalid password");

      setShowPasswordLock(false);
      if (pendingAction.type === 'delete_loan') await executeDeleteLoan();
      else if (pendingAction.type === 'delete_payment') await executeDeletePayment(pendingAction.meta.paymentId);
    } catch (err) {
      setAuthError(T("invalidPassword", "Invalid password. Please try again."));
    } finally {
      setIsVerifying(false);
    }
  };

  async function executeDeleteLoan() {
    await supabase.from('payments').delete().eq('loan_id', id);
    await supabase.from('loans').delete().eq('id', id);
    reload();
    navigate("/loans");
  }

  async function executeDeletePayment(paymentId) {
    const payment = payments.find((p) => p.id === paymentId);
    await supabase.from('payments').delete().eq('id', paymentId);
    const newBalance = (loan.current_balance || 0) + (payment.amount || 0);
    await supabase.from('loans').update({
      current_balance: newBalance,
      status: newBalance > 0 ? "active" : "paid_off",
    }).eq('id', id);
    reload();
    loadData();
  }

  // ---------------------------------------------------------
  // UI LOGIC
  // ---------------------------------------------------------

  async function handleAddPayment(e) { 
    e.preventDefault(); 
    
    // 🛡️ Safety check to prevent blank IDs
    if (!supaUser?.id) return; 

    setSaving(true); 
    const amount = parseFloat(payForm.amount); 
    
    // 🚀 FIXED: Added user_id to the Supabase insert so RLS accepts it
    await supabase.from('payments').insert([{ 
      loan_id: id, 
      user_id: supaUser.id, 
      amount, 
      payment_date: payForm.payment_date, 
      note: payForm.note,
      payment_type: 'loan' // Standardized to match your schema
    }]); 

    const newBalance = Math.max((loan.current_balance || 0) - amount, 0); 
    await supabase.from('loans').update({ current_balance: newBalance, status: newBalance <= 0 ? "paid_off" : "active" }).eq('id', id); 
    
    reload(); 
    setPayForm({ amount: "", payment_date: new Date().toISOString().split("T")[0], note: "" }); 
    setPaymentOpen(false); 
    setSaving(false); 
    loadData(); 
  }

  async function handleSaveEdit(updatedData) { 
    await supabase.from('loans').update(updatedData).eq('id', id); 
    reload(); 
    setEditOpen(false); 
    loadData(); 
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!loan) return <div className="text-center pt-20 text-muted-foreground">{T("loanNotFound", "Loan not found")}</div>;

  const paid = (loan.original_amount || 0) - (loan.current_balance || 0);
  const progress = loan.original_amount > 0 ? (paid / loan.original_amount) * 100 : 0;
  const totalPayments = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate("/loans")} className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1 mx-2 min-w-0">
          <span className="text-xl">{categoryIcons[loan.category] || "📋"}</span>
          <h1 className="text-lg font-bold font-heading text-foreground truncate">{loan.name}</h1>
        </div>
        <button onClick={() => setEditOpen(true)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
          <Edit3 className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-3xl p-6 mb-5 flex flex-col items-center">
        <ProgressRing percentage={progress} size={140} />
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{T("remaining", "Remaining")}</p>
          <p className="text-2xl font-bold font-heading text-foreground">{fmt(loan.current_balance || 0)}</p>
        </div>
        <span className={`mt-3 text-[10px] uppercase tracking-wider font-semibold px-3 py-1 rounded-full ${loan.status === "paid_off" ? "bg-primary/15 text-primary" : "bg-amber-500/15 text-amber-500"}`}>
          {loan.status === "paid_off" ? T("paidOff", "Paid Off") : T("active", "Active")}
        </span>
      </motion.div>

      {/* Loan Details */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-5 space-y-3">
        {loan.lender && (
          <div className="flex items-center gap-3">
            <Building className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">{loan.lender}</span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-foreground">
            {loan.payment_frequency === "monthly" && loan.due_day
              ? `${T("monthly", "Monthly")} · ${T("dueDay", "Due day")} ${loan.due_day}`
              : loan.due_day_of_week
              ? `${T(loan.payment_frequency, loan.payment_frequency)} · ${loan.due_day_of_week}`
              : T(loan.payment_frequency || "monthly", loan.payment_frequency || "Monthly")}
          </span>
        </div>
        {loan.interest_rate > 0 && (
          <div className="flex items-center gap-3">
            <Percent className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">{loan.interest_rate}% {T("interestRate", "Interest Rate")}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">{T("originalAmount", "Original Amount")}</p>
            <p className="text-sm font-semibold text-foreground">{fmt(loan.original_amount || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{T("monthlyPayment", "Monthly Payment")}</p>
            <p className="text-sm font-semibold text-foreground">{fmt(loan.monthly_payment || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{T("totalPaid", "Total Paid")}</p>
            <p className="text-sm font-semibold text-primary">{fmt(totalPayments)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{T("paid", "Paid")}</p>
            <p className="text-sm font-semibold text-foreground">{fmt(paid)}</p>
          </div>
        </div>
        {loan.notes && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">{T("notes", "Notes")}</p>
            <p className="text-sm text-foreground">{loan.notes}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Button onClick={() => setPaymentOpen(true)} className="rounded-xl">
          <Plus className="w-4 h-4" /> {T("addPayment", "Add Payment")}
        </Button>
        <Button variant="destructive" onClick={() => triggerSecurityCheck('delete_loan')} className="rounded-xl">
          <Trash2 className="w-4 h-4" /> {T("deleteLoan", "Delete Loan")}
        </Button>
      </div>

      {/* Payments List */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-5">
        <p className="text-sm font-semibold text-foreground mb-2">{T("paymentHistory", "Payment History")} ({payments.length})</p>
        {payments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">{T("noPayments", "No payments logged yet")}</p>
        ) : (
          payments.map((p, i) => (
            <PaymentItem key={p.id} payment={p} index={i} onDelete={(paymentId) => triggerSecurityCheck('delete_payment', { paymentId })} />
          ))
        )}
      </div>

      {/* Late Payment Log */}
      <div className="mb-5">
        <LatePaymentLog loan={loan} onLoanUpdated={loadData} />
      </div>

      {/* Add Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{T("addPayment", "Add Payment")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPayment} className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">{T("amount", "Amount")}</Label>
              <Input type="number" step="0.01" min="0" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} required className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{T("paymentDate", "Payment Date")}</Label>
              <Input type="date" value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} required className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{T("note", "Note")}</Label>
              <Input value={payForm.note} onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))} className="mt-1 rounded-xl" />
            </div>
            <Button type="submit" disabled={saving} className="w-full rounded-xl">
              {saving ? T("saving", "Saving...") : T("logPayment", "Log Payment")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{T("editLoan", "Edit Loan")}</DialogTitle>
          </DialogHeader>
          <EditLoanForm loan={loan} onSave={handleSaveEdit} />
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
            <p className="text-sm text-muted-foreground">
              {pendingAction?.type === 'delete_loan' ? T("deleteLoanConfirm", "Enter your password to permanently delete this loan and all its payments.") : T("deletePaymentConfirm", "Enter your password to delete this payment.")}
            </p>
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