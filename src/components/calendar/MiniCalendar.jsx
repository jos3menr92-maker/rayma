import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n || 0);

export default function MiniCalendar({ bills, loans, userProfile }) {
  const [current, setCurrent] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

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
    const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
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
    <div className="bg-card border border-border rounded-3xl p-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold font-heading text-foreground">Financial Calendar</h2>
        <Link to="/calendar" className="text-xs text-primary hover:underline font-medium">Full view →</Link>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setCurrent(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <span className="text-xs font-semibold text-foreground">{MONTHS[month]} {year}</span>
        <button onClick={() => setCurrent(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d, i) => (
          <div key={i} className="text-center text-[9px] font-medium text-muted-foreground py-0.5">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-0.5 mb-3">
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
              className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-[11px] font-medium transition-all
                ${isSelected ? "bg-primary text-primary-foreground" : isToday ? "bg-primary/15 text-primary" : "hover:bg-muted text-foreground"}
              `}
            >
              {day}
              {/* Dots */}
              <div className="absolute bottom-0.5 flex gap-0.5 justify-center">
                {hasBills && <div className={`w-1 h-1 rounded-full ${isSelected ? "bg-primary-foreground/70" : "bg-destructive"}`} />}
                {isPay && <div className={`w-1 h-1 rounded-full ${isSelected ? "bg-primary-foreground/70" : "bg-primary"}`} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 mb-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive inline-block" /> Bills/Loans</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> Payday</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/15 border border-primary inline-block" /> Today</span>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="border-t border-border pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">{MONTHS[month]} {selectedDay}</p>
            {totalDue > 0 && <span className="text-xs font-bold text-destructive">{fmt(totalDue)} due</span>}
          </div>

          {isPayday && (
            <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-base">💰</span>
                <div>
                  <p className="text-xs font-semibold text-foreground">Payday!</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{userProfile?.pay_frequency} pay</p>
                </div>
              </div>
              <Link to="/finance" className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded-lg font-semibold">Log Income</Link>
            </div>
          )}

          {selectedItems.length === 0 && !isPayday && (
            <p className="text-xs text-muted-foreground text-center py-2">Nothing due on this day</p>
          )}

          {selectedItems.map(item => (
            <div key={item.id} className="flex items-center justify-between bg-muted/40 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">{item._type === "loan" ? "🏦" : (categoryIcons[item.category] || "📋")}</span>
                <div>
                  <p className="text-xs font-semibold text-foreground">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">{item._type === "loan" ? "Loan payment" : item.category}</p>
                </div>
              </div>
              <span className="text-xs font-bold text-destructive">{fmt(item._type === "bill" ? item.amount : item.monthly_payment)}</span>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
