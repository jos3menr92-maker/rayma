import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage, useT } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { getMonthName, getWeekdayNames } from "@/utils/formatLocalized";

export default function MiniCalendar({ bills, loans, userProfile }) {
  const { lang, locale } = useLanguage();
  const T = useT();
  const { formatCurrency: fmt } = useCurrency();
  const [current, setCurrent] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const monthName = useMemo(() => getMonthName(month, locale, "long"), [year, month, locale]);
  const dayHeaders = useMemo(() => getWeekdayNames(locale, "narrow"), [locale]);

  // 🧠 RAYMA HELPER: Safely extracts the day number from "YYYY-MM-DD" without timezone bugs
  const extractDay = (dateStr) => {
    if (!dateStr) return null;
    return parseInt(dateStr.split('T')[0].split('-')[2], 10);
  };

  // Build day map: bills, loans, paydays
  const dayMap = {};
  
  bills.forEach(b => {
    const day = extractDay(b.due_date) || b.due_day;
    if (day) {
      if (!dayMap[day]) dayMap[day] = [];
      dayMap[day].push({ ...b, _type: "bill" });
    }
  });

  loans.forEach(l => {
    const day = extractDay(l.due_date) || l.due_day;
    if (day) {
      if (!dayMap[day]) dayMap[day] = [];
      dayMap[day].push({ ...l, _type: "loan" });
    }
  });

  // Payday markers
  const payDays = [];
  if (userProfile?.pay_frequency === "monthly" && userProfile?.pay_day) {
    const d = parseInt(userProfile.pay_day);
    if (d >= 1 && d <= daysInMonth) payDays.push(d);
  } else if ((userProfile?.pay_frequency === "weekly" || userProfile?.pay_frequency === "biweekly") && userProfile?.pay_day) {
    const dayNames = getWeekdayNames(locale, "long");
    const targetDow = dayNames.indexOf(userProfile.pay_day);
    if (targetDow !== -1) {
      const step = userProfile.pay_frequency === "weekly" ? 7 : 14;
      for (let d = 1; d <= daysInMonth; d++) {
        const dow = new Date(year, month, d).getDay();
        if (dow === targetDow) {
          payDays.push(d);
          if (userProfile.pay_frequency === "biweekly") break; // only first occurrence for simplicity
        }
      }
    }
  }

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedItems = selectedDay ? (dayMap[selectedDay] || []) : [];
  const isPayday = selectedDay && payDays.includes(selectedDay);
  const totalDue = selectedItems.reduce((s, x) => s + (x._type === "bill" ? (x.amount || 0) : (x.monthly_payment || 0)), 0);

  const categoryIcons = {
    utilities: "⚡", subscriptions: "📱", insurance: "🛡️",
    rent: "🏠", food: "🍔", transport: "🚗", health: "🏥", other: "📋",
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-4 mb-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold font-heading text-foreground flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          {T("calendarTitle", "Calendar")}
        </h2>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setCurrent(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">{monthName} {year}</span>
        <button onClick={() => setCurrent(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayHeaders.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-muted-foreground py-0.5">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
          const isSelected = selectedDay === day;
          const hasBills = !!(dayMap[day]);
          const isPay = payDays.includes(day);

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-[12px] font-bold transition-all
                ${isSelected ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105 z-10" : isToday ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted/30 hover:bg-muted text-foreground"}
              `}
            >
              {day}
              {/* Dots */}
              <div className="absolute bottom-1 flex gap-1 justify-center">
                {hasBills && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-destructive"}`} />}
                {isPay && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-primary"}`} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mb-4 text-[10px] font-semibold text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive" /> {T("dueLabel", "Due")}</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> {T("paydayLegend", "Payday")}</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-transparent border border-primary" /> {T("todayLegend", "Today")}</span>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="border-t border-border pt-4 mb-4 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-foreground">{monthName} {selectedDay}</p>
            {totalDue > 0 && <span className="text-xs font-bold px-2 py-1 bg-destructive/10 text-destructive rounded-lg">{fmt(totalDue)} {T("dueAmount", "due")}</span>}
          </div>

          {isPayday && (
            <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl">💰</span>
                <div>
                  <p className="text-sm font-bold text-foreground">{T("paydayLabel", "Payday!")}</p>
                  <p className="text-[11px] font-medium text-muted-foreground capitalize">{userProfile?.pay_frequency} {T("payLabel", "pay")}</p>
                </div>
              </div>
            </div>
          )}

          {selectedItems.length === 0 && !isPayday && (
            <div className="text-center py-4 bg-muted/30 rounded-2xl border border-dashed border-border">
              <p className="text-xs font-medium text-muted-foreground">{T("nothingDue", "Nothing due on this day")}</p>
            </div>
          )}

          {selectedItems.map(item => (
            <div key={item.id} className="flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">
                  {item._type === "loan" ? "🏦" : (categoryIcons[item.category] || "📋")}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{item.name}</p>
                  <p className="text-[11px] font-medium text-muted-foreground capitalize">{item._type === "loan" ? T("loanPayment", "Loan payment") : item.category}</p>
                </div>
              </div>
              <span className="text-sm font-bold text-destructive">{fmt(item._type === "bill" ? item.amount : item.monthly_payment)}</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* 🚀 THE NEW MASSIVE "OPEN FULL CALENDAR" BUTTON */}
      <Link 
        to="/calendar" 
        className="mt-2 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary/10 text-primary font-bold hover:bg-primary/20 active:scale-[0.98] transition-all"
      >
        {T("openFullCalendar", "Open Full Calendar")} <ChevronRight className="w-5 h-5" />
      </Link>
    </div>
  );
}