import { useMemo } from "react";
import { CalendarCheck } from "lucide-react";

const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n || 0);

const DOW_ORDER = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export default function DueThisWeek({ loans, bills }) {
  const items = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    const dayOfMonth = today.getDate();

    // Get start/end of current week (Sun–Sat)
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const result = [];

    // Monthly loans due this week
    loans.forEach(loan => {
      if (!loan.due_day || loan.payment_frequency === "weekly" || loan.payment_frequency === "biweekly") return;
      const dueDate = new Date(today.getFullYear(), today.getMonth(), loan.due_day);
      if (dueDate >= weekStart && dueDate <= weekEnd) {
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        result.push({ id: loan.id, name: loan.name, amount: loan.monthly_payment, type: "loan", daysUntil: diffDays, dueDate });
      }
    });

    // Weekly/biweekly loans
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

    // Monthly bills due this week
    bills.forEach(bill => {
      if (!bill.is_active) return;
      if (bill.payment_frequency === "weekly" || bill.payment_frequency === "biweekly") {
        if (bill.due_day_of_week) {
          const dueDayIdx = DOW_ORDER.indexOf(bill.due_day_of_week);
          if (dueDayIdx === -1) return;
          const diffDays = (dueDayIdx - dayOfWeek + 7) % 7;
          if (diffDays <= 6) {
            result.push({ id: bill.id, name: bill.name, amount: bill.amount, type: "bill", daysUntil: diffDays });
          }
        }
      } else if (bill.due_day) {
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
          <h2 className="text-sm font-semibold font-heading text-foreground">Due This Week</h2>
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
                  {item.daysUntil === 0 ? "Today" : item.daysUntil === 1 ? "Tomorrow" : `In ${item.daysUntil} days`}
                </p>
              </div>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
              item.daysUntil <= 1
                ? "bg-destructive/10 text-destructive"
                : item.daysUntil <= 3
                ? "bg-amber-500/10 text-amber-500"
                : "bg-primary/10 text-primary"
            }`}>
              {fmt(item.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}