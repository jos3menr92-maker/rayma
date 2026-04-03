import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

const categoryIcons = {
  utilities: "⚡", subscriptions: "📱", insurance: "🛡️",
  rent: "🏠", food: "🍔", transport: "🚗", health: "🏥", other: "📋",
};

const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n || 0);

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function BillCalendar() {
  const [bills, setBills] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Bill.list("-created_date", 100),
      base44.entities.Loan.list("-created_date", 100),
    ]).then(([b, l]) => {
      setBills(b.filter(x => x.is_active !== false));
      setLoans(l.filter(x => x.status !== "paid_off" && x.due_day && x.monthly_payment));
      setLoading(false);
    });
  }, []);

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  // Build a map: day → items due
  const dayMap = {};
  bills.forEach(b => {
    if (b.due_day) {
      const d = b.due_day;
      if (!dayMap[d]) dayMap[d] = [];
      dayMap[d].push({ ...b, _type: "bill" });
    }
  });
  loans.forEach(l => {
    if (l.due_day) {
      const d = l.due_day;
      if (!dayMap[d]) dayMap[d] = [];
      dayMap[d].push({ ...l, _type: "loan" });
    }
  });

  const selectedItems = selectedDay ? (dayMap[selectedDay] || []) : [];
  const totalDue = selectedItems.reduce((s, x) => s + (x._type === "bill" ? x.amount : x.monthly_payment) || 0, 0);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold font-heading text-foreground mb-5">Payment Calendar</h1>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrent(new Date(year, month - 1, 1))} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h2 className="text-base font-semibold font-heading text-foreground">{MONTHS[month]} {year}</h2>
          <button onClick={() => setCurrent(new Date(year, month + 1, 1))} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 mb-5">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            const hasItems = !!dayMap[day];
            const isSelected = selectedDay === day;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all
                  ${isSelected ? "bg-primary text-primary-foreground" : isToday ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"}
                `}
              >
                {day}
                {hasItems && (
                  <div className={`absolute bottom-1 flex gap-0.5`}>
                    {(dayMap[day] || []).slice(0, 3).map((_, idx) => (
                      <div key={idx} className={`w-1 h-1 rounded-full ${isSelected ? "bg-primary-foreground/70" : "bg-primary"}`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day details */}
        {selectedDay && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold font-heading text-foreground">
                {MONTHS[month]} {selectedDay} — Due
              </h3>
              {selectedItems.length > 0 && (
                <span className="text-sm font-bold text-primary">{fmt(totalDue)}</span>
              )}
            </div>
            {selectedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nothing due on this day</p>
            ) : (
              <div className="space-y-2">
                {selectedItems.map(item => (
                  <div key={item.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{categoryIcons[item.category] || "📋"}</span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{item._type === "loan" ? "Loan payment" : item.category}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-foreground">
                      {fmt(item._type === "bill" ? item.amount : item.monthly_payment)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {!selectedDay && (
          <div className="text-center py-6">
            <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Tap a day to see what's due</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}