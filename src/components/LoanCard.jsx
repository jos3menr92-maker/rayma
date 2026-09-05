import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Calendar, DollarSign, Trash2 } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { monthlyObligation, paymentPerPeriod } from "@/utils/loanEngine";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

const categoryIcons = {
  mortgage: "🏠", auto: "🚗", student: "🎓", personal: "💰",
  credit_card: "💳", medical: "🏥", other: "📋",
};

export default function LoanCard({ loan, index = 0, onEdit, onDelete }) {
  const { payLoan, reload } = useFinancialData();
  const [paying, setPaying] = useState(false);

  const handlePay = async () => {
    setPaying(true);
    try {
      await payLoan(loan.id, paymentPerPeriod(loan));
      reload();
    } catch (err) {
      console.error(err);
    }
    setPaying(false);
  };

  const { lang } = useLanguage();
  const T = (key, fallback) => t(lang, key) !== key ? t(lang, key) : fallback;
  const { formatCurrency } = useCurrency();

  const paid = (loan.original_amount || 0) - (loan.current_balance || 0);
  const progress = loan.original_amount > 0 ? (paid / loan.original_amount) * 100 : 0;
  const icon = categoryIcons[loan.category] || "📋";

  const today = new Date().getDate();
  const dueDay = loan.due_day;
  const daysUntil = dueDay ? (dueDay >= today ? dueDay - today : dueDay + 31 - today) : null;
  const dueDateColor = daysUntil === null ? "muted" : daysUntil <= 3 ? "destructive" : daysUntil <= 7 ? "amber" : "muted";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="relative">
      <div onClick={() => onEdit?.(loan)} className={`block bg-card rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] overflow-hidden cursor-pointer ${loan.status === "paid_off" ? "border-primary/40" : "border-border hover:border-primary/30"}`}>
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-base">{icon}</div>
              <div>
                <h3 className="font-semibold font-heading text-foreground text-sm leading-tight truncate max-w-[80px]">{loan.name}</h3>
                {loan.lender && <p className="text-[10px] text-muted-foreground">{loan.lender}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {loan.status === "paid_off" && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                  {T("paidCheck", "✓ Paid")}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-end justify-between mb-1.5">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium">{T("remaining", "Remaining")}</p>
              <p className="text-lg font-bold font-heading text-foreground leading-tight">{formatCurrency(loan.current_balance)}</p>
            </div>
            <span className="text-xs font-semibold text-primary mb-0.5">{progress.toFixed(0)}%</span>
          </div>

          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min(progress, 100)}%` }} transition={{ duration: 0.7, ease: "easeOut" }} />
          </div>
        </div>

        {dueDay && (
          <div className={`border-t border-border px-3 py-1.5 flex items-center gap-1.5 ${dueDateColor === "destructive" ? "bg-destructive/5" : dueDateColor === "amber" ? "bg-amber-500/5" : "bg-muted/30"}`}>
            {dueDateColor === "destructive" ? <AlertCircle className="w-3 h-3 text-destructive" /> : dueDateColor === "amber" ? <AlertCircle className="w-3 h-3 text-amber-500" /> : <Calendar className="w-3 h-3 text-muted-foreground" />}
            <span className={`text-[10px] font-medium ${dueDateColor === "destructive" ? "text-destructive" : dueDateColor === "amber" ? "text-amber-500" : "text-muted-foreground"}`}>
              {daysUntil !== null ? `${T("dueIn", "Due in")} ${daysUntil}${T("daysShort", "d")}` : `${T("due", "Due")} ${dueDay}${T("th", "th")}`} · {formatCurrency(monthlyObligation(loan))}/mo
            </span>
          </div>
        )}

        {/* Visible action row — Pay / Edit / Delete on the card front */}
        <div className="border-t border-border flex items-stretch">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (!paying) handlePay(); }}
            disabled={paying || loan.status === "paid_off"}
            className="flex-1 h-10 flex items-center justify-center gap-1.5 text-primary font-semibold text-xs hover:bg-primary/10 active:bg-primary/20 transition-colors disabled:opacity-50"
          >
            <DollarSign className={`w-4 h-4 ${paying ? "animate-pulse" : ""}`} />
            {paying ? T("paying", "Paying") : T("pay", "Pay")}
          </button>
          {onDelete && (
            <>
              <div className="w-px bg-border" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(loan); }}
                aria-label={T("delete", "Delete")}
                className="w-12 h-10 flex items-center justify-center text-destructive hover:bg-destructive/10 active:bg-destructive/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}