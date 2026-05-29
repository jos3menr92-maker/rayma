import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { ArrowLeft, Edit3, Trash2, Plus, DollarSign, Calendar, Percent, Building } from "lucide-react";
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

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(amount || 0);
}

export default function LoanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", payment_date: new Date().toISOString().split("T")[0], note: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    const [loanData, paymentData] = await Promise.all([
      base44.entities.Loan.filter({ id }),
      base44.entities.Payment.filter({ loan_id: id }, "-payment_date", 100),
    ]);
    setLoan(loanData[0]);
    setPayments(paymentData);
    setLoading(false);
  }

  async function handleAddPayment(e) {
    e.preventDefault();
    setSaving(true);
    const amount = parseFloat(payForm.amount);

    await base44.entities.Payment.create({
      loan_id: id,
      payment_type: "loan",
      amount,
      payment_date: payForm.payment_date,
      note: payForm.note,
    });

    const newBalance = Math.max((loan.current_balance || 0) - amount, 0);
    await base44.entities.Loan.update(id, {
      current_balance: newBalance,
      status: newBalance <= 0 ? "paid_off" : "active",
    });

    setPayForm({ amount: "", payment_date: new Date().toISOString().split("T")[0], note: "" });
    setPaymentOpen(false);
    setSaving(false);
    loadData();
  }

  async function handleDeletePayment(paymentId) {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return;

    await base44.entities.Payment.delete(paymentId);
    const newBalance = (loan.current_balance || 0) + (payment.amount || 0);
    await base44.entities.Loan.update(id, {
      current_balance: newBalance,
      status: newBalance > 0 ? "active" : "paid_off",
    });
    loadData();
  }

  async function handleDeleteLoan() {
    for (const p of payments) {
      await base44.entities.Payment.delete(p.id);
    }
    await base44.entities.Loan.delete(id);
    navigate("/");
  }

  async function handleSaveEdit(updatedData) {
    await base44.entities.Loan.update(id, updatedData);
    setEditOpen(false);
    loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 text-center">
        <p className="text-muted-foreground">Loan not found</p>
        <Button variant="ghost" onClick={() => navigate("/")} className="mt-4">
          Go back
        </Button>
      </div>
    );
  }

  const paid = (loan.original_amount || 0) - (loan.current_balance || 0);
  const progress = loan.original_amount > 0 ? (paid / loan.original_amount) * 100 : 0;
  const totalPayments = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex gap-2">
            <button onClick={() => setEditOpen(true)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Edit3 className="w-4 h-4" />
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this loan?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the loan and all payment records.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteLoan} className="bg-destructive text-destructive-foreground">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Loan Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">
            {categoryIcons[loan.category] || "📋"}
          </div>
          <div>
            <h1 className="text-xl font-bold font-heading text-foreground">{loan.name}</h1>
            {loan.lender && <p className="text-sm text-muted-foreground">{loan.lender}</p>}
          </div>
          {loan.status === "paid_off" && (
            <span className="ml-auto px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              Paid Off ✓
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="flex flex-col items-center bg-card rounded-3xl p-6 border border-border shadow-sm mb-6">
          <ProgressRing percentage={progress} size={130} strokeWidth={11} />
          <div className="mt-4 text-center">
            <p className="text-2xl font-bold font-heading text-foreground">
              {formatCurrency(loan.current_balance)}
            </p>
            <p className="text-sm text-muted-foreground">remaining balance</p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card rounded-xl p-3 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Original</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(loan.original_amount)}</p>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Percent className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Interest</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{loan.interest_rate || 0}%</p>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Due</span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {loan.payment_frequency === "weekly" || loan.payment_frequency === "biweekly"
                ? (loan.due_day_of_week || "—")
                : (loan.due_day ? `${loan.due_day}th` : "—")}
            </p>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Building className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {loan.payment_frequency === "weekly" ? "Weekly" : loan.payment_frequency === "biweekly" ? "Bi-weekly" : "Monthly"}
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(loan.monthly_payment)}</p>
          </div>
        </div>

        {/* Add Payment Button */}
        <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
          <DialogTrigger asChild>
            <Button className="w-full rounded-xl h-11 text-sm font-semibold mb-6">
              <Plus className="w-4 h-4 mr-2" /> Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddPayment} className="space-y-4 mt-2">
              <div>
                <Label className="text-xs text-muted-foreground">Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="$0.00"
                  value={payForm.amount}
                  onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
                  required
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Date *</Label>
                <Input
                  type="date"
                  value={payForm.payment_date}
                  onChange={(e) => setPayForm((p) => ({ ...p, payment_date: e.target.value }))}
                  required
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Note</Label>
                <Input
                  placeholder="Optional note"
                  value={payForm.note}
                  onChange={(e) => setPayForm((p) => ({ ...p, note: e.target.value }))}
                  className="mt-1 rounded-xl"
                />
              </div>
              <Button type="submit" disabled={saving || !payForm.amount} className="w-full rounded-xl">
                {saving ? "Saving..." : "Save Payment"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Loan</DialogTitle>
            </DialogHeader>
            <EditLoanForm loan={loan} onSave={handleSaveEdit} />
          </DialogContent>
        </Dialog>

        {/* Late Payment Log */}
        <LatePaymentLog loan={loan} onLoanUpdated={loadData} />

        {/* Payment History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold font-heading text-foreground">
              Payment History
            </h2>
            <span className="text-xs text-muted-foreground">
              {payments.length} payment{payments.length !== 1 ? "s" : ""} · {formatCurrency(totalPayments)}
            </span>
          </div>
          {payments.length > 0 ? (
            <div className="bg-card rounded-2xl border border-border px-3">
              {payments.map((p, i) => (
                <PaymentItem key={p.id} payment={p} index={i} onDelete={handleDeletePayment} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No payments recorded yet</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}