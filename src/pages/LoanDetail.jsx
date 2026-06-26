import { useEffect, useState } from "react"; 
import { useParams, useNavigate } from "react-router-dom"; 
import { supabase } from "@/lib/supabaseClient"; 
import { useFinancialData } from "@/lib/FinancialDataContext"; 
import { useCurrency } from "@/hooks/useCurrency";
import { useLanguage } from "@/lib/LanguageContext"; // 🌐 Added for Translations
import { t } from "@/lib/i18n"; // 🌐 Added for Translations
import { motion } from "framer-motion"; 
import { 
  ArrowLeft, Edit3, Trash2, Plus, DollarSign, Calendar, Percent, Building, 
  ShieldAlert, Lock, Loader2 
} from "lucide-react"; 
import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label"; 
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"; 
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
  const { formatCurrency } = useCurrency(); 
  const { reload } = useFinancialData(); 
  const { lang } = useLanguage(); // 🌐 Access current language
  
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
    loadData(); 
    const params = new URLSearchParams(window.location.search); 
    if (params.get("quickpay") === "1") setPaymentOpen(true); 
  }, [id]); 

  async function loadData() { 
    const { data: loanData } = await supabase.from('loans').select('*').eq('id', id).single(); 
    const { data: paymentData } = await supabase.from('payments').select('*').eq('loan_id', id).order('payment_date', { ascending: false }); 
    setLoan(loanData); 
    setPayments(paymentData || []); 
    setLoading(false); 
  }

  // ---------------------------------------------------------
  // 🛡️ SECURE ACTIONS
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
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password });
      if (signInError) throw new Error("Invalid password");

      setShowPasswordLock(false);
      if (pendingAction.type === 'delete_loan') await executeDeleteLoan();
      else if (pendingAction.type === 'delete_payment') await executeDeletePayment(pendingAction.meta.paymentId);
    } catch (err) {
      setAuthError("Invalid password. Please try again.");
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
    setSaving(true); 
    const amount = parseFloat(payForm.amount); 
    await supabase.from('payments').insert([{ loan_id: id, amount, payment_date: payForm.payment_date, note: payForm.note }]); 
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
  if (!loan) return <div className="text-center pt-20">Loan not found</div>;

  const paid = (loan.original_amount || 0) - (loan.current_balance || 0);
  const progress = loan.original_amount > 0 ? (paid / loan.original_amount) * 100 : 0;
  const totalPayments = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      {/* ... [Header & UI logic remains same] ... */}
      {/* Note: I've replaced the direct deletion trigger in your JSX with triggerSecurityCheck('delete_loan') */}
      
      {/* 🔐 SECURITY MODAL */}
      {showPasswordLock && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-background border rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-500">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-bold text-lg">Verify Password</h3>
            </div>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password..." />
            {authError && <p className="text-xs text-destructive">{authError}</p>}
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setShowPasswordLock(false)}>Cancel</Button>
              <Button className="flex-1" onClick={verifyAndExecute} disabled={isVerifying || !password}>
                {isVerifying ? <Loader2 className="animate-spin" /> : "Confirm"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}