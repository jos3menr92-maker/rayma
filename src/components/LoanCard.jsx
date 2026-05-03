import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, AlertCircle, Calendar } from "lucide-react";

const categoryIcons = {
  mortgage: "🏠",
  auto: "🚗",
  student: "🎓",
  personal: "💰",
  credit_card: "💳",
  medical: "🏥",
  other: "📋",
};

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export default function LoanCard({ loan, index = 0 }) {
  const paid = (loan.original_amount || 0) - (loan.current_balance || 0);
  const progress = loan.original_amount > 0 ? (paid / loan.original_amount) * 100 : 0;
  const icon = categoryIcons[loan.category] || "📋";

  const today = new Date().getDate();
  const dueDay = loan.due_day;
  const isDueSoon = dueDay && Math.abs(dueDay - today) <= 3;
  const isOverdue = dueDay && today > dueDay;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        to={`/loan/${loan.id}`}
        className={`block bg-card rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-200 active:scale-[0.98] overflow-hidden ${
          loan.status === "paid_off"
            ? "border-primary/40 hover:border-primary/60"
            : "border-border hover:border-primary/40"
        }`}
      >
        {/* Card Body */}
        <div className="p-4">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-xl">
                {icon}
              </div>
              <div>
                <h3 className="font-bold font-heading text-primary text-base leading-tight">
                  {loan.name}
                </h3>
                {loan.lender && (
                  <p className="text-xs text-muted-foreground mt-0.5">{loan.lender}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {loan.status === "paid_off" && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                  ✓ Paid Off
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-primary" />
            </div>
          </div>

          {/* Remaining balance */}
          <p className="text-[10px] uppercase tracking-widest text-primary font-semibold mb-1">
            Remaining
          </p>
          <p className="text-2xl font-bold font-heading text-foreground mb-3">
            {formatCurrency(loan.current_balance)}
          </p>

          {/* Progress bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>

          {/* Progress text */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary">
              {progress.toFixed(1)}% paid
            </span>
            <span className="text-xs text-muted-foreground">
              of {formatCurrency(loan.original_amount)}
            </span>
          </div>
        </div>

        {/* Due date footer */}
        {dueDay && (
          <div className="border-t border-border bg-muted/40 px-4 py-2.5 flex items-center justify-center">
            <div className={`flex items-center gap-1.5 text-xs font-medium ${
              isOverdue ? "text-destructive" : isDueSoon ? "text-destructive" : "text-muted-foreground"
            }`}>
              {(isOverdue || isDueSoon) 
                ? <AlertCircle className="w-3.5 h-3.5" />
                : <Calendar className="w-3.5 h-3.5" />
              }
              <span>Due {dueDay}th</span>
            </div>
          </div>
        )}
      </Link>
    </motion.div>
  );
}