import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, CreditCard, Receipt } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n || 0);

export default function DueSoonAlert({ loans, bills, payments = [] }) {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();
  const today = new Date().getDate();
  const now = new Date();

  const urgentLoans = loans
    .filter((l) => l.due_day && l.status !== "paid_off")
    .map((l) => {
      const diff = l.due_day >= today ? l.due_day - today : l.due_day + 31 - today;
      return { ...l, daysLeft: diff, type: "loan" };
    })
    .filter((l) => l.daysLeft <= 3);

  const urgentBills = bills
    .filter((b) => b.due_day && b.is_active !== false)
    .map((b) => {
      const diff = b.due_day >= today ? b.due_day - today : b.due_day + 31 - today;
      return { ...b, daysLeft: diff, type: "bill" };
    })
    .filter((b) => b.daysLeft <= 3);

  // Flag active loans with no payment in the last 60 days
  const overdueLoans = loans
    .filter((l) => l.status !== "paid_off")
    .filter((l) => {
      const loanPayments = payments.filter(p => p.loan_id === l.id);
      if (loanPayments.length === 0) return true;
      const lastPayment = loanPayments.reduce((latest, p) =>
        new Date(p.payment_date) > new Date(latest.payment_date) ? p : latest
      );
      const daysSince = (now - new Date(lastPayment.payment_date)) / (1000 * 60 * 60 * 24);
      return daysSince > 60;
    })
    .map(l => ({ ...l, type: "loan_overdue" }));

  const all = [...urgentLoans, ...urgentBills].sort((a, b) => a.daysLeft - b.daysLeft);

  if ((all.length === 0 && overdueLoans.length === 0) || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="mb-4 bg-destructive/5 border border-destructive/25 rounded-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm font-bold text-destructive">
              {all.length} payment{all.length > 1 ? "s" : ""} due soon!
            </span>
          </div>
          <button onClick={() => setDismissed(true)} className="p-1 text-destructive/60 hover:text-destructive">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-3 pb-3 space-y-1.5">
          {all.map((item) => {
            const amount = item.type === "loan" ? item.monthly_payment : item.amount;
            const Icon = item.type === "loan" ? CreditCard : Receipt;
            const isToday = item.daysLeft === 0;
            return (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => item.type === "loan" ? navigate(`/loan/${item.id}`) : navigate("/bills")}
                className="w-full flex items-center justify-between bg-white/70 dark:bg-card/70 rounded-xl px-3 py-2 text-left hover:bg-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-destructive/70" />
                  <span className="text-sm font-medium text-foreground">{item.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    isToday ? "bg-destructive text-white" : "bg-destructive/10 text-destructive"
                  }`}>
                    {isToday ? "Today!" : `${item.daysLeft}d`}
                  </span>
                </div>
                <span className="text-sm font-bold text-foreground">{fmt(amount)}</span>
              </button>
            );
          })}
          {overdueLoans.map((item) => (
            <button
              key={`overdue-${item.id}`}
              onClick={() => navigate(`/loan/${item.id}`)}
              className="w-full flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 rounded-xl px-3 py-2 text-left hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-sm font-medium text-foreground">{item.name}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-amber-200 text-amber-800">
                  No payment in 60d
                </span>
              </div>
              <span className="text-sm font-bold text-foreground">{fmt(item.monthly_payment)}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}