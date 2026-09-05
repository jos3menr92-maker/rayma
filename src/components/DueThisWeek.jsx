import { useMemo } from "react";
import { CalendarCheck, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { paymentPerPeriod } from "@/utils/loanEngine";
import { toast } from "@/components/ui/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

const DOW_ORDER = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export default function DueThisWeek({ loans, bills }) {
  const { payBill, payLoan, reload, payments } = useFinancialData();
  const [payingId, setPayingId] = useState(null);

  const handlePay = async (item) => {
    setPayingId(item.id);
    try {
      if (item.type === "bill") {
        const bill = bills.find(b => b.id === item.id);
        if (bill) await payBill(bill, item.amount);
      } else if (item.type === "loan") {
        await payLoan(item.id, item.amount);
      }
      reload();
    } catch(err) {
      console.error(err);
      toast({ title: T("toastPaymentFailed", "Payment failed"), variant: "destructive" });
    }
    setPayingId(null);
  };
  const { formatCurrency: fmt } = useCurrency();
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);

  const items = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const dayOfMonth = today.getDate();

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const result = [];

    // Loans have no last_paid_date — use the payments history instead.
    const loanPaidThisMonth = (loanId) => (payments || []).some(p => {
      if (p.payment_type !== "loan" || p.loan_id !== loanId || !p.payment_date) return false;
      const d = new Date(p.payment_date + "T00:00:00");
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    });
    const loanPaidRecently = (loanId, days) => (payments || []).some(p => {
      if (p.payment_type !== "loan" || p.loan_id !== loanId || !p.payment_date) return false;
      return (today.getTime() - new Date(p.payment_date + "T00:00:00").getTime()) <= days * 24 * 60 * 60 * 1000;
    });

    // Shared anchoring helpers — same cycle rules as projectCashFlow in financeMath:
    // an obligation's true cycle = most recent payment > loan start date > last_paid_date.
    const MS = 24 * 60 * 60 * 1000;
    const toLocal = (s) => {
      if (!s) return null;
      const d = new Date(s.length === 10 ? s + "T00:00:00" : s);
      return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };
    const latestPayment = (type, id, key) => {
      let latest = null;
      (payments || []).forEach(p => {
        if (p.payment_type !== type || p[key] !== id || !p.payment_date) return;
        const d = toLocal(p.payment_date);
        if (d && (!latest || d > latest)) latest = d;
      });
      return latest;
    };
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    // Roll a real every-N-days cycle forward until the next occurrence is upcoming.
    const nextAnchored = (anchor, stepDays) => {
      if (!anchor) return null;
      let guard = 0;
      const d = new Date(anchor);
      while (d < startOfToday && guard++ < 200) d.setDate(d.getDate() + stepDays);
      return d >= startOfToday && d <= weekEnd ? d : null;
    };
    // Roll a monthly cycle forward (day-of-month clamped, like financeMath).
    const nextMonthly = (anchor) => {
      if (!anchor) return null;
      let guard = 0;
      const d = new Date(anchor);
      while (d < startOfToday && guard++ < 24) {
        const day = d.getDate();
        const nm = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        d.setDate(Math.min(day, new Date(nm.getFullYear(), nm.getMonth() + 1, 0).getDate()));
      }
      return d >= startOfToday && d <= weekEnd ? d : null;
    };

    loans.forEach(loan => {
      if (loan.payment_frequency === "weekly" || loan.payment_frequency === "biweekly") return;
      if (loan.due_day) {
        if (loanPaidThisMonth(loan.id)) return;
        const dueDate = new Date(today.getFullYear(), today.getMonth(), loan.due_day);
        if (dueDate >= weekStart && dueDate <= weekEnd) {
          const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
          result.push({ id: loan.id, name: loan.name, amount: paymentPerPeriod(loan), type: "loan", daysUntil: diffDays, dueDate });
        }
      } else {
        // No due day — anchor to the real cycle (last payment > start date).
        const next = nextMonthly(latestPayment("loan", loan.id, "loan_id") || toLocal(loan.start_date));
        if (next) {
          result.push({ id: loan.id, name: loan.name, amount: paymentPerPeriod(loan), type: "loan", daysUntil: Math.round((next - startOfToday) / MS) });
        }
      }
    });

    loans.forEach(loan => {
      if (loan.payment_frequency !== "weekly" && loan.payment_frequency !== "biweekly") return;
      if (loan.due_day_of_week) {
        const dueDayIdx = DOW_ORDER.indexOf(loan.due_day_of_week);
        if (dueDayIdx === -1) return;
        if (loanPaidRecently(loan.id, loan.payment_frequency === "weekly" ? 6 : 13)) return;
        const diffDays = (dueDayIdx - dayOfWeek + 7) % 7;
        if (diffDays <= 6) {
          result.push({ id: loan.id, name: loan.name, amount: paymentPerPeriod(loan), type: "loan", daysUntil: diffDays });
        }
      } else {
        // No weekday set — anchor to the real cycle (last payment > start date),
        // so weekly/biweekly loans no longer silently vanish from this card.
        const next = nextAnchored(latestPayment("loan", loan.id, "loan_id") || toLocal(loan.start_date), loan.payment_frequency === "biweekly" ? 14 : 7);
        if (next) {
          result.push({ id: loan.id, name: loan.name, amount: paymentPerPeriod(loan), type: "loan", daysUntil: Math.round((next - startOfToday) / MS) });
        }
      }
    });

    bills.forEach(bill => {
      if (bill.is_active === false) return;

      const isPaidMonthly = bill.last_paid_date && new Date(bill.last_paid_date).getMonth() === today.getMonth() && new Date(bill.last_paid_date).getFullYear() === today.getFullYear();
      // Paid window matches the loan logic: a biweekly bill paid up to 13 days
      // ago is still covered (it used to reappear after just 7 days).
      const isPaidThisCycle = bill.last_paid_date && (today.getTime() - new Date(bill.last_paid_date).getTime()) <= (bill.payment_frequency === "biweekly" ? 13 : 6) * 24 * 60 * 60 * 1000;

      const lastAnchor = () => {
        const fromPayments = latestPayment("bill", bill.id, "bill_id");
        const fromField = toLocal(bill.last_paid_date);
        if (fromPayments && fromField) return fromPayments > fromField ? fromPayments : fromField;
        return fromPayments || fromField;
      };

      if (bill.payment_frequency === "weekly" || bill.payment_frequency === "biweekly") {
        if (isPaidThisCycle) return;
        if (bill.due_day_of_week) {
          const dueDayIdx = DOW_ORDER.indexOf(bill.due_day_of_week);
          if (dueDayIdx === -1) return;
          const diffDays = (dueDayIdx - dayOfWeek + 7) % 7;
          if (diffDays <= 6) {
            result.push({ id: bill.id, name: bill.name, amount: bill.amount, type: "bill", daysUntil: diffDays });
          }
        } else {
          const next = nextAnchored(lastAnchor(), bill.payment_frequency === "biweekly" ? 14 : 7);
          if (next) {
            result.push({ id: bill.id, name: bill.name, amount: bill.amount, type: "bill", daysUntil: Math.round((next - startOfToday) / MS) });
          }
        }
      } else if (bill.due_day) {
        if (isPaidMonthly) return;
        const dueDate = new Date(today.getFullYear(), today.getMonth(), bill.due_day);
        if (dueDate >= weekStart && dueDate <= weekEnd) {
          const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
          result.push({ id: bill.id, name: bill.name, amount: bill.amount, type: "bill", daysUntil: diffDays });
        }
      } else {
        const next = nextMonthly(lastAnchor());
        if (next) {
          result.push({ id: bill.id, name: bill.name, amount: bill.amount, type: "bill", daysUntil: Math.round((next - startOfToday) / MS) });
        }
      }
    });

    return result.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [loans, bills, payments]);

  if (items.length === 0) return null;

  const totalDue = items.reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <div className="mb-5 bg-card border border-primary/20 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold font-heading text-foreground">{T("dueThisWeek", "Due This Week")}</h2>
        </div>
        <span className="text-xs font-bold text-primary">{fmt(totalDue)}</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">{item.type === "loan" ? "🏦" : "📄"}</span>
              <div>
                <p className="text-xs font-medium text-foreground">{item.name}</p>
                <p className={`text-[10px] ${item.daysUntil < 0 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                  {item.daysUntil < 0 ? T("overdue", "Overdue") : item.daysUntil === 0 ? T("today", "Today") : item.daysUntil === 1 ? T("tomorrow", "Tomorrow") : T("inDays", "In {n} days").replace("{n}", item.daysUntil)}
                </p>
              </div>
            </div>
            {/* Wrap the amount in a flex container with the pay button */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                item.daysUntil <= 1
                  ? "bg-destructive/10 text-destructive"
                  : item.daysUntil <= 3
                  ? "bg-amber-500/10 text-amber-500"
                  : "bg-primary/10 text-primary"
              }`}>
                {fmt(item.amount)}
              </span>
              <button 
                onClick={() => handlePay(item)} 
                disabled={payingId === item.id} 
                className="p-1.5 text-muted-foreground hover:text-primary transition-colors" 
                title={T("markPaid", "Mark as Paid")}
              >
                <CheckCircle2 className={`w-4 h-4 ${payingId === item.id ? "text-primary animate-pulse" : ""}`} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}