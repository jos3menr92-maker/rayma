import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { ChevronRight, AlertCircle, Calendar, DollarSign } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import PaymentButton from "./PaymentButton";

const categoryIcons = {
  mortgage: "🏠",
  auto: "🚗",
  student: "🎓",
  personal: "💰",
  credit_card: "💳",
  medical: "🏥",
  other: "📋",
};

export default function LoanCard({ loan, index = 0 }) {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const paid = (loan.original_amount || 0) - (loan.current_balance || 0);
  const progress = loan.original_amount > 0 ? (paid / loan.original_amount) * 100 : 0;
  const icon = categoryIcons[loan.category] || "📋";

  const today = new Date().getDate();
  const dueDay = loan.due_day;
  const daysUntil = dueDay ? (dueDay >= today ? dueDay - today : dueDay + 31 - today) : null;
  const isDueSoon = daysUntil !== null && daysUntil <= 3;
  const isOverdue = daysUntil !== null && daysUntil > 28; // wrapped around

  const x = useMotionValue(0);
  const revealOpacity = useTransform(x, [-80, -40], [1, 0]);
  const [swiped, setSwiped] = useState(false);

  const handleDragEnd = (_, info) => {
    if (info.offset.x < -50) {
      setSwiped(true);
      animate(x, -72, { type: "spring", stiffness: 300, damping: 30 });
    } else {
      setSwiped(false);
      animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
    }
  };

  const handleQuickPay = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/loan/${loan.id}?quickpay=1`);
    animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
    setSwiped(false);
  };

  // Color coding for due dates
  const dueDateColor = daysUntil === null ? "muted" :
    daysUntil <= 3 ? "destructive" :
    daysUntil <= 7 ? "amber" : "muted";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="relative"
    >
      {/* Swipe reveal action */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-end rounded-xl overflow-hidden">
        <motion.div
          style={{ opacity: revealOpacity }}
          className="h-full"
          onClick={() => {
            // Reset swipe visually when clicked
            animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
            setSwiped(false);
          }}
        >
          <PaymentButton planId={loan.id} amount={loan.monthly_payment}>
            <div className="w-18 h-full bg-primary flex flex-col items-center justify-center gap-0.5 px-4 rounded-xl cursor-pointer hover:bg-primary/90 transition-colors">
              <DollarSign className="w-4 h-4 text-primary-foreground" />
              <span className="text-[9px] font-bold text-primary-foreground uppercase tracking-wide">Pay</span>
            </div>
          </PaymentButton>
        </motion.div>
      </div>

      <motion.div style={{ x }} drag="x" dragConstraints={{ left: -72, right: 0 }} dragElastic={0.1} onDragEnd={handleDragEnd}>
        <Link
          to={`/loan/${loan.id}`}
          className={`block bg-card rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] overflow-hidden ${
            loan.status === "paid_off"
              ? "border-primary/40"
              : "border-border hover:border-primary/30"
          }`}
          onClick={(e) => { if (swiped) { e.preventDefault(); animate(x, 0, { type: "spring", stiffness: 300, damping: 30 }); setSwiped(false); } }}
        >
          <div className="p-3">
            {/* Header row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-base">
                  {icon}
                </div>
                <div>
                  <h3 className="font-semibold font-heading text-foreground text-sm leading-tight truncate max-w-[80px]">
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

          {/* Due date footer — color coded */}
          {dueDay && (
            <div className={`border-t border-border px-3 py-1.5 flex items-center gap-1.5 ${
              dueDateColor === "destructive" ? "bg-destructive/5" :
              dueDateColor === "amber" ? "bg-amber-500/5" : "bg-muted/30"
            }`}>
              {dueDateColor === "destructive"
                ? <AlertCircle className="w-3 h-3 text-destructive" />
                : dueDateColor === "amber"
                  ? <AlertCircle className="w-3 h-3 text-amber-500" />
                  : <Calendar className="w-3 h-3 text-muted-foreground" />
              }
              <span className={`text-[10px] font-medium ${
                dueDateColor === "destructive" ? "text-destructive" :
                dueDateColor === "amber" ? "text-amber-500" : "text-muted-foreground"
              }`}>
                {daysUntil !== null ? `Due in ${daysUntil}d` : `Due ${dueDay}th`} · {formatCurrency(loan.monthly_payment)}/mo
              </span>
            </div>
          )}
        </Link>
      </motion.div>
    </motion.div>
  );
}
