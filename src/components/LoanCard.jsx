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
        className="block bg-card rounded-2xl p-4 border border-border shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
              {icon}
            </div>
            <div>
              <h3 className="font-semibold font-heading text-foreground text-sm">
                {loan.name}
              </h3>
              {loan.lender && (
                <p className="text-[11px] text-muted-foreground">{loan.lender}</p>
              )}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground mt-1" />
        </div>

        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
              Remaining
            </p>
            <p className="text-lg font-bold font-heading text-foreground">
              {formatCurrency(loan.current_balance)}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            of {formatCurrency(loan.original_amount)}
          </p>
        </div>

        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-primary">
            {progress.toFixed(1)}% paid
          </span>
          {dueDay && (
            <div className={`flex items-center gap-1 text-[11px] ${
              isOverdue ? "text-destructive" : isDueSoon ? "text-accent" : "text-muted-foreground"
            }`}>
              {(isOverdue || isDueSoon) && <AlertCircle className="w-3 h-3" />}
              <Calendar className="w-3 h-3" />
              <span>Due {dueDay}th</span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}