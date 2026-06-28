import { motion } from "framer-motion";
import { useMemo } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { getWeekdayNames, formatCurrencyNoDecimals } from "@/utils/formatLocalized";

const categoryColors = {
  utilities: "bg-blue-100 text-blue-700 border-blue-200",
  subscriptions: "bg-purple-100 text-purple-700 border-purple-200",
  insurance: "bg-green-100 text-green-700 border-green-200",
  rent: "bg-red-100 text-red-700 border-red-200",
  phone: "bg-cyan-100 text-cyan-700 border-cyan-200",
  internet: "bg-indigo-100 text-indigo-700 border-indigo-200",
  food: "bg-orange-100 text-orange-700 border-orange-200",
  other: "bg-muted text-muted-foreground border-border",
};

const categoryEmojis = {
  utilities: "⚡", subscriptions: "📱", insurance: "🛡️", rent: "🏠",
  phone: "📞", internet: "🌐", food: "🍽️", other: "📋",
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function BillCalendar({ bills }) {
  const { locale } = useLanguage();
  const { currency } = useCurrency();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Group bills by due_day
  const billsByDay = {};
  bills.forEach(bill => {
    const day = bill.due_day;
    if (!billsByDay[day]) billsByDay[day] = [];
    billsByDay[day].push(bill);
  });

  const monthName = useMemo(() => {
    return now.toLocaleString(locale, { month: "long", year: "numeric" });
  }, [locale]);

  const weekDays = useMemo(() => {
    return getWeekdayNames(locale, "short");
  }, [locale]);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-sm font-semibold text-foreground mb-3">{monthName}</h2>

      <div className="grid grid-cols-7 gap-px mb-1">
        {weekDays.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const dayBills = billsByDay[day] || [];
          const isToday = day === today;
          const hasOverdue = isToday && dayBills.length > 0;

          return (
            <div
              key={idx}
              className={`min-h-[52px] rounded-xl p-1 flex flex-col items-center ${
                isToday ? "bg-primary/10 ring-1 ring-primary/40" : "bg-card border border-border"
              }`}
            >
              <span className={`text-[11px] font-semibold mb-0.5 ${isToday ? "text-primary" : "text-foreground"}`}>
                {day}
              </span>
              {dayBills.slice(0, 2).map((bill, i) => (
                <div
                  key={i}
                  title={`${bill.name} – $${bill.amount}`}
                  className="w-full text-center text-[8px] leading-tight px-0.5 py-0.5 rounded font-medium truncate border"
                  style={{ fontSize: "7px" }}
                >
                  <span>{categoryEmojis[bill.category] || "📋"}</span>
                </div>
              ))}
              {dayBills.length > 2 && (
                <span className="text-[7px] text-muted-foreground">+{dayBills.length - 2}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {bills.length > 0 && (
        <div className="mt-5 space-y-2">
          <h3 className="text-xs font-semibold text-foreground">This Month</h3>
          {bills
            .slice()
            .sort((a, b) => a.due_day - b.due_day)
            .map(bill => (
              <div key={bill.id} className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs ${categoryColors[bill.category] || categoryColors.other}`}>
                <div className="flex items-center gap-2">
                  <span>{categoryEmojis[bill.category] || "📋"}</span>
                  <span className="font-medium">{bill.name}</span>
                  {bill.autopay && <span className="text-[9px] opacity-70 bg-white/50 px-1 rounded">AUTO</span>}
                </div>
                <div className="text-right">
                  <span className="font-bold">{formatCurrencyNoDecimals(bill.amount, locale, currency)}</span>
                  <span className="opacity-60 ml-1">· {bill.due_day}th</span>
                </div>
              </div>
            ))}
        </div>
      )}
    </motion.div>
  );
}