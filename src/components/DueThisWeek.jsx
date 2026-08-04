import { useMemo } from "react";
import { CalendarCheck, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

const DOW_ORDER = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export default function DueThisWeek({ loans, bills }) {
  const { payBill, payLoan, reload } = useFinancialData();
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

    loans.forEach(loan => {
      if (!loan.due_day || loan.payment_frequency === "weekly" || loan.payment_frequency === "biweekly") return;
      const dueDate = new Date(today.getFullYear(), today.getMonth(), loan.due_day);
      if (dueDate >= weekStart && dueDate <= weekEnd) {
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        result.push({ id: loan.id, name: loan.name, amount: loan.monthly_payment, type: "loan", daysUntil: diffDays, dueDate });
      }
    });

    loans.forEach(loan => {
      if ((loan.payment_frequency === "weekly" || loan.payment_frequency === "biweekly") && loan.due_day_of_week) {
        const dueDayIdx = DOW_ORDER.indexOf(loan.due_day_of_week);
        if (dueDayIdx === -1) return;
        const diffDays = (dueDayIdx - dayOfWeek + 7) % 7;
        if (diffDays <= 6) {
          result.push({ id: loan.id, name: loan.name, amount: loan.monthly_payment, type: "loan", daysUntil: diffDays });
        }
      }
    });

        bills.forEach(bill => {
      if (!bill.is_active) return;
      
      const isPaidMonthly = bill.last_paid_date && new Date(bill.last_paid_date).getMonth() === today.getMonth() && new Date(bill.last_paid_date).getFullYear() === today.getFullYear();
      const isPaidWeekly = bill.last_paid_date && (today.getTime() - new Date(bill.last_paid_date).getTime() < 7 * 24 * 60 * 60 * 1000);

      if (bill.payment_frequency === "weekly" || bill.payment_frequency === "biweekly") {
        if (isPaidWeekly) return;
        if (bill.due_day_of_week) {
          const dueDayIdx = DOW_ORDER.indexOf(bill.due_day_of_week);
          if (dueDayIdx === -1) return;
          const diffDays = (dueDayIdx - dayOfWeek + 7) % 7;
          if (diffDays <= 6) {
            result.push({ id: bill.id, name: bill.name, amount: bill.amount, type: "bill", daysUntil: diffDays });
          }
        }
      } else if (bill.due_day) {
        if (isPaidMonthly) return;
        const dueDate = new Date(today.getFullYear(), today.getMonth(), bill.due_day);
        if (dueDate >= weekStart && dueDate <= weekEnd) {
          const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
          result.push({ id: bill.id, name: bill.name, amount: bill.amount, type: "bill", daysUntil: diffDays });
        }
      }
    });

    return result.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [loans, bills]);

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
                <p className="text-[10px] text-muted-foreground">
                  {item.daysUntil === 0 ? T("today", "Today") : item.daysUntil === 1 ? T("tomorrow", "Tomorrow") : T("inDays", "In {n} days").replace("{n}", item.daysUntil)}
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