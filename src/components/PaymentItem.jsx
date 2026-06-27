import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";

export default function PaymentItem({ payment, index = 0, onDelete }) {
  const { formatCurrency } = useCurrency();
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center justify-between py-3 px-1 border-b border-border last:border-0"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <span className="text-primary text-xs font-bold">$</span>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {formatCurrency(payment.amount)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {payment.payment_date ? format(new Date(payment.payment_date), "MMM d, yyyy") : "No date"}
          </p>
          {payment.note && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{payment.note}</p>
          )}
        </div>
      </div>
      {onDelete && (
        <button
          onClick={() => onDelete(payment.id)}
          className="p-2 text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}