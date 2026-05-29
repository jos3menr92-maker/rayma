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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link
        to={`/loan/${loan.id}`}
        className={`block bg-card rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] overflow-hidden ${
          loan.status === "paid_off"
            ? "border-primary/40"
            : "border-border hover:border-primary/30"
        }`}
      >
        <div className="p-3">
          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-base">
                {icon}
              </div>
              <div>
                <h3 className="font-semibold font-heading text-foreground text-sm leading-tight">
                  {loan.name}
                </h3>
                {loan.lender && (
                  <p className="text-[10px] text-muted-foreground">{loan.lender}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {loan.status === "paid_off" && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                  ✓ Paid
                </span>
              )}
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>

          {/* Balance + progress */}
          <div className="flex items-end justify-between mb-1.5">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium">Remaining</p>
              <p className="text-lg font-bold font-heading text-foreground leading-tight">
                {formatCurrency(loan.current_balance)}
              </p>
            </div>
            <span className="text-xs font-semibold text-primary mb-0.5">
              {progress.toFixed(0)}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Due date footer */}
        {dueDay && (
          <div className={`border-t border-border px-3 py-1.5 flex items-center gap-1.5 ${
            isOverdue || isDueSoon ? "bg-destructive/5" : "bg-muted/30"
          }`}>
            {(isOverdue || isDueSoon)
              ? <AlertCircle className="w-3 h-3 text-destructive" />
              : <Calendar className="w-3 h-3 text-muted-foreground" />
            }
            <span className={`text-[10px] font-medium ${isOverdue || isDueSoon ? "text-destructive" : "text-muted-foreground"}`}>
              Due {dueDay}th · {formatCurrency(loan.monthly_payment)}/mo
            </span>
          </div>
        )}
      </Link>
    </motion.div>
  );
}