import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, CalendarDays, TrendingUp, Wallet, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useLanguage, useT } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { getMonthName, getWeekdayNames } from "@/utils/formatLocalized";

const categoryIcons = {
  utilities: "⚡", subscriptions: "📱", insurance: "🛡️",
  rent: "🏠", food: "🍔", transport: "🚗", health: "🏥", other: "📋",
  mortgage: "🏠", auto: "🚗", student: "🎓", personal: "👤", credit_card: "💳", medical: "🏥",
};

const categoryColors = {
  bill: "bg-destructive",
  loan: "bg-orange-500",
  income: "bg-primary",
  payday: "bg-emerald-500",
};

export default function Calendar() {
  const navigate = useNavigate();
  const { loans, bills, incomes, userProfile, loading } = useFinancialData();
  const { lang, locale } = useLanguage();
  const T = useT();
  const { formatCurrency: fmt } = useCurrency();

  const [current, setCurrent] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const year = current.getFullYear();
  const month = current.getMonth();
  const today = new Date();

  const monthName = useMemo(() => getMonthName(month, locale, "long"), [year, month, locale]);
  const dayHeaders = useMemo(() => getWeekdayNames(locale, "short"), [locale]);
  const dayHeadersNarrow = useMemo(() => getWeekdayNames(locale, "narrow"), [locale]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build day map: bills, loans, incomes, paydays
  const { dayMap, payDays } = useMemo(() => {
    const map = {};
    const pays = [];

    // Helper: find all days in month matching a weekday name
    const findDaysForWeekday = (weekdayName) => {
      if (!weekdayName) return [];
      const dayNames = getWeekdayNames(locale, "long");
      // Map locale weekday names to JS getDay() index (0=Sunday)
      const jsDayMap = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
      const targetDow = jsDayMap[weekdayName];
      if (targetDow === undefined) return [];
      const matches = [];
      for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(year, month, d).getDay() === targetDow) matches.push(d);
      }
      return matches;
    };

    // Bills: monthly uses due_day (number), weekly/biweekly uses due_day_of_week
    bills.filter(b => b.is_active !== false).forEach(b => {
      let days = [];
      if (b.payment_frequency === "weekly" || b.payment_frequency === "biweekly") {
        days = findDaysForWeekday(b.due_day_of_week);
        if (b.payment_frequency === "biweekly") days = days.length > 0 ? [days[0]] : [];
      } else {
        const d = extractDay(b.due_date) || b.due_day;
        if (d) days = [d];
      }
      days.forEach(day => {
        if (day >= 1 && day <= daysInMonth) {
          if (!map[day]) map[day] = [];
          map[day].push({ ...b, _type: "bill", _amount: b.amount || 0 });
        }
      });
    });

    // Loans: use due_date (ISO string) or due_day, or due_day_of_week for recurring
    loans.filter(l => l.status !== "paid_off").forEach(l => {
      let days = [];
      if (l.payment_frequency === "weekly" || l.payment_frequency === "biweekly") {
        days = findDaysForWeekday(l.due_day_of_week);
        if (l.payment_frequency === "biweekly") days = days.length > 0 ? [days[0]] : [];
      } else {
        const d = extractDay(l.due_date) || l.due_day;
        if (d) days = [d];
      }
      days.forEach(day => {
        if (day >= 1 && day <= daysInMonth) {
          if (!map[day]) map[day] = [];
          map[day].push({ ...l, _type: "loan", _amount: l.monthly_payment || 0 });
        }
      });
    });

    // Incomes: use week_start date or date field
    incomes.forEach(inc => {
      const day = extractDay(inc.week_start) || extractDay(inc.date) || extractDay(inc.created_at);
      if (day && day >= 1 && day <= daysInMonth) {
        if (!map[day]) map[day] = [];
        map[day].push({ ...inc, _type: "income", _amount: inc.amount || 0 });
      }
    });

    if (userProfile?.pay_frequency === "monthly" && userProfile?.pay_day) {
      const d = parseInt(userProfile.pay_day);
      if (d >= 1 && d <= daysInMonth) pays.push(d);
    } else if ((userProfile?.pay_frequency === "weekly" || userProfile?.pay_frequency === "biweekly") && userProfile?.pay_day) {
      const dayNames = getWeekdayNames(locale, "long");
      const targetDow = dayNames.indexOf(userProfile.pay_day);
      if (targetDow !== -1) {
        const step = userProfile.pay_frequency === "weekly" ? 7 : 14;
        let firstOccurrence = -1;
        for (let d = 1; d <= daysInMonth; d++) {
          const dow = new Date(year, month, d).getDay();
          if (dow === targetDow) { firstOccurrence = d; break; }
        }
        if (firstOccurrence > 0) {
          for (let d = firstOccurrence; d <= daysInMonth; d += step) {
            pays.push(d);
          }
        }
      }
    }

    return { dayMap: map, payDays: pays };
  }, [bills, loans, incomes, userProfile, year, month, daysInMonth, locale]);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedItems = selectedDay ? (dayMap[selectedDay] || []) : [];
  const isPayday = selectedDay && payDays.includes(selectedDay);

  // Month totals
  const monthBills = Object.values(dayMap).flat().filter(x => x._type === "bill").reduce((s, x) => s + (x._amount || 0), 0);
  const monthLoans = Object.values(dayMap).flat().filter(x => x._type === "loan").reduce((s, x) => s + (x._amount || 0), 0);
  const monthIncome = Object.values(dayMap).flat().filter(x => x._type === "income").reduce((s, x) => s + (x._amount || 0), 0);
  const totalDue = monthBills + monthLoans;
  const selectedTotal = selectedItems.reduce((s, x) => s + (x._type === "income" ? -(x._amount || 0) : (x._amount || 0)), 0);

  function extractDay(dateStr) {
    if (!dateStr) return null;
    return parseInt(dateStr.split('T')[0].split('-')[2], 10);
  }

  const handleItemClick = (item) => {
    if (item._type === "loan") navigate(`/loan/${item.id}`);
    else if (item._type === "bill") navigate("/bills");
    else if (item._type === "income") navigate("/bank-accounts");
  };

  const goToday = () => {
    setCurrent(new Date());
    setSelectedDay(today.getDate());
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            {T("fullCalendar", "Full Calendar")}
          </h1>
          <button
            onClick={goToday}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            {T("today", "Today")}
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-6">{T("calendarSubtitle", "See all your financial events")}</p>

        {/* Month Summary Cards */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <Wallet className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">{T("income", "Income")}</p>
            <p className="text-xs font-bold text-primary">{fmt(monthIncome)}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <AlertCircle className="w-4 h-4 text-destructive mx-auto mb-1" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">{T("bills", "Bills")}</p>
            <p className="text-xs font-bold text-destructive">{fmt(monthBills)}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <TrendingUp className="w-4 h-4 text-orange-500 mx-auto mb-1" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">{T("loans", "Loans")}</p>
            <p className="text-xs font-bold text-orange-500">{fmt(monthLoans)}</p>
          </div>
        </div>

        {/* Calendar Card */}
        <div className="bg-card border border-border rounded-3xl p-4 mb-6 shadow-sm">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrent(new Date(year, month - 1, 1))} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <span className="text-sm font-bold text-foreground capitalize">{monthName} {year}</span>
            <button onClick={() => setCurrent(new Date(year, month + 1, 1))} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Day headers - responsive */}
          <div className="grid grid-cols-7 mb-2">
            {dayHeaders.map((d, i) => (
              <div key={i} className="text-center text-[11px] font-bold text-muted-foreground py-1 hidden sm:block">{d}</div>
            ))}
            {dayHeadersNarrow.map((d, i) => (
              <div key={`n-${i}`} className="text-center text-[11px] font-bold text-muted-foreground py-1 sm:hidden block">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} className="aspect-square" />;
              const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
              const isSelected = selectedDay === day;
              const items = dayMap[day] || [];
              const isPay = payDays.includes(day);
              const hasItems = items.length > 0;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-bold transition-all
                    ${isSelected ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105 z-10"
                      : isToday ? "bg-primary/10 text-primary border border-primary/30"
                      : "bg-muted/30 hover:bg-muted text-foreground"}
                  `}
                >
                  {day}
                  {/* Dots */}
                  <div className="absolute bottom-1 flex gap-0.5 justify-center flex-wrap max-w-[80%]">
                    {items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : categoryColors[item._type] || "bg-muted-foreground"}`} />
                    ))}
                    {isPay && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-emerald-500"}`} />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-3 mt-4 pt-4 border-t border-border text-[10px] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive" /> {T("bills", "Bills")}</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" /> {T("loans", "Loans")}</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> {T("income", "Income")}</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> {T("paydayLegend", "Payday")}</span>
          </div>
        </div>

        {/* Selected Day Detail */}
        <AnimatePresence mode="wait">
          {selectedDay && (
            <motion.div
              key={selectedDay}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-card border border-border rounded-3xl p-5 mb-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-lg font-bold text-foreground">
                  {monthName} {selectedDay}, {year}
                </p>
                {selectedTotal > 0 && (
                  <span className="text-xs font-bold px-2.5 py-1 bg-destructive/10 text-destructive rounded-lg">
                    {fmt(selectedTotal)} {T("dueAmount", "due")}
                  </span>
                )}
                {selectedTotal < 0 && (
                  <span className="text-xs font-bold px-2.5 py-1 bg-primary/10 text-primary rounded-lg">
                    +{fmt(Math.abs(selectedTotal))}
                  </span>
                )}
              </div>

              {/* Payday indicator */}
              {isPayday && (
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3 mb-3">
                  <span className="text-xl">💰</span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{T("paydayLabel", "Payday!")}</p>
                    <p className="text-[11px] font-medium text-muted-foreground capitalize">
                      {userProfile?.pay_frequency} {T("payLabel", "pay")}
                    </p>
                  </div>
                </div>
              )}

              {selectedItems.length === 0 && !isPayday && (
                <div className="text-center py-6 bg-muted/30 rounded-2xl border border-dashed border-border">
                  <p className="text-xs font-medium text-muted-foreground">{T("nothingDue", "Nothing due on this day")}</p>
                </div>
              )}

              {/* Items */}
              <div className="space-y-2">
                {selectedItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="w-full flex items-center justify-between bg-muted/20 hover:bg-muted/40 border border-border rounded-2xl px-4 py-3 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base ${
                        item._type === "income" ? "bg-primary/10" : item._type === "loan" ? "bg-orange-500/10" : "bg-destructive/10"
                      }`}>
                        {item._type === "loan" ? "🏦" : item._type === "income" ? "💵" : (categoryIcons[item.category] || "📋")}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{item.name}</p>
                        <p className="text-[11px] font-medium text-muted-foreground capitalize">
                          {item._type === "loan" ? T("loanPayment", "Loan payment")
                            : item._type === "income" ? T("income", "Income")
                            : item.category}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${item._type === "income" ? "text-primary" : "text-destructive"}`}>
                      {item._type === "income" ? "+" : "-"}{fmt(item._amount)}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}