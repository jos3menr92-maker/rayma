import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useLanguage, useT } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { getMonthName, getWeekdayNames } from "@/utils/formatLocalized";
import CalendarToolbar from "@/components/calendar/CalendarToolbar";
import CalendarMonthView from "@/components/calendar/CalendarMonthView";
import CalendarWeekView from "@/components/calendar/CalendarWeekView";
import AddEventDialog from "@/components/calendar/AddEventDialog";
import AddBillDialog from "@/components/AddBillDialog";

const categoryIcons = {
  utilities: "⚡", subscriptions: "📱", insurance: "🛡️",
  rent: "🏠", food: "🍔", transport: "🚗", health: "🏥", other: "📋",
  mortgage: "🏠", auto: "🚗", student: "🎓", personal: "👤", credit_card: "💳", medical: "🏥",
};

const jsDayMap = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

function extractDay(dateStr) {
  if (!dateStr) return null;
  return parseInt(dateStr.split('T')[0].split('-')[2], 10);
}

export default function Calendar() {
  const navigate = useNavigate();
  const { loans, bills, incomes, userProfile, loading, reload } = useFinancialData();
  const { lang, locale } = useLanguage();
  const T = useT();
  const { formatCurrency: fmt } = useCurrency();

  const [view, setView] = useState("month");
  const [current, setCurrent] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [filters, setFilters] = useState({ bills: true, loans: true, income: true, payday: true });
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddBill, setShowAddBill] = useState(false);

  const year = current.getFullYear();
  const month = current.getMonth();
  const today = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const monthName = useMemo(() => getMonthName(month, locale, "long"), [year, month, locale]);
  const dayHeaders = useMemo(() => getWeekdayNames(locale, "short"), [locale]);
  const dayHeadersNarrow = useMemo(() => getWeekdayNames(locale, "narrow"), [locale]);

  // Build day map for month view
  const { dayMap, payDays } = useMemo(() => {
    const map = {};
    const pays = [];

    const findDaysForWeekday = (weekdayName) => {
      if (!weekdayName) return [];
      const targetDow = jsDayMap[weekdayName];
      if (targetDow === undefined) return [];
      const matches = [];
      for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(year, month, d).getDay() === targetDow) matches.push(d);
      }
      return matches;
    };

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
      const targetDow = jsDayMap[userProfile.pay_day];
      if (targetDow !== undefined) {
        const step = userProfile.pay_frequency === "weekly" ? 7 : 14;
        let firstOccurrence = -1;
        for (let d = 1; d <= daysInMonth; d++) {
          if (new Date(year, month, d).getDay() === targetDow) { firstOccurrence = d; break; }
        }
        if (firstOccurrence > 0) {
          for (let d = firstOccurrence; d <= daysInMonth; d += step) pays.push(d);
        }
      }
    }

    return { dayMap: map, payDays: pays };
  }, [bills, loans, incomes, userProfile, year, month, daysInMonth]);

  // Apply filters
  const filteredDayMap = useMemo(() => {
    const map = {};
    Object.entries(dayMap).forEach(([day, items]) => {
      const filtered = items.filter(item => {
        if (item._type === "bill") return filters.bills;
        if (item._type === "loan") return filters.loans;
        if (item._type === "income") return filters.income;
        return true;
      });
      if (filtered.length > 0) map[day] = filtered;
    });
    return map;
  }, [dayMap, filters]);

  const filteredPayDays = filters.payday ? payDays : [];

  // Get events for any date (week view)
  const getEventsForDate = (date) => {
    const dDay = date.getDate();
    const targetDow = date.getDay();
    const events = [];

    if (filters.bills) {
      bills.filter(b => b.is_active !== false).forEach(b => {
        let matches = false;
        if (b.payment_frequency === "weekly") matches = jsDayMap[b.due_day_of_week] === targetDow;
        else if (b.payment_frequency === "biweekly") matches = jsDayMap[b.due_day_of_week] === targetDow && dDay <= 7;
        else { const d = extractDay(b.due_date) || b.due_day; matches = d === dDay; }
        if (matches) events.push({ ...b, _type: "bill", _amount: b.amount || 0 });
      });
    }

    if (filters.loans) {
      loans.filter(l => l.status !== "paid_off").forEach(l => {
        let matches = false;
        if (l.payment_frequency === "weekly") matches = jsDayMap[l.due_day_of_week] === targetDow;
        else if (l.payment_frequency === "biweekly") matches = jsDayMap[l.due_day_of_week] === targetDow && dDay <= 7;
        else { const d = extractDay(l.due_date) || l.due_day; matches = d === dDay; }
        if (matches) events.push({ ...l, _type: "loan", _amount: l.monthly_payment || 0 });
      });
    }

    if (filters.income) {
      incomes.forEach(inc => {
        const incDay = extractDay(inc.week_start) || extractDay(inc.date) || extractDay(inc.created_at);
        if (incDay === dDay) events.push({ ...inc, _type: "income", _amount: inc.amount || 0 });
      });
    }

    return events;
  };

  const getPaydayForDate = (date) => {
    if (!filters.payday) return false;
    const dDay = date.getDate();
    const targetDow = date.getDay();

    if (userProfile?.pay_frequency === "monthly" && userProfile?.pay_day) {
      return parseInt(userProfile.pay_day) === dDay;
    }
    if ((userProfile?.pay_frequency === "weekly" || userProfile?.pay_frequency === "biweekly") && userProfile?.pay_day) {
      const targetDowFromName = jsDayMap[userProfile.pay_day];
      if (targetDowFromName === undefined) return false;
      if (userProfile.pay_frequency === "weekly") return targetDow === targetDowFromName;
      if (userProfile.pay_frequency === "biweekly") return targetDow === targetDowFromName && dDay <= 7;
    }
    return false;
  };

  // Month totals
  const allFilteredItems = Object.values(filteredDayMap).flat();
  const monthBills = allFilteredItems.filter(x => x._type === "bill").reduce((s, x) => s + (x._amount || 0), 0);
  const monthLoans = allFilteredItems.filter(x => x._type === "loan").reduce((s, x) => s + (x._amount || 0), 0);
  const monthIncome = allFilteredItems.filter(x => x._type === "income").reduce((s, x) => s + (x._amount || 0), 0);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedItems = selectedDay ? (filteredDayMap[selectedDay] || []) : [];
  const isPayday = selectedDay && filteredPayDays.includes(selectedDay);
  const selectedTotal = selectedItems.reduce((s, x) => s + (x._type === "income" ? -(x._amount || 0) : (x._amount || 0)), 0);

  const handleItemClick = (item) => {
    if (item._type === "loan") navigate(`/loan/${item.id}`);
    else if (item._type === "bill") navigate("/bills");
    else if (item._type === "income") navigate("/bank-accounts");
  };

  const toggleFilter = (key) => setFilters(f => ({ ...f, [key]: !f[key] }));

  const goPrev = () => {
    if (view === "month") setCurrent(new Date(year, month - 1, 1));
    else { const d = new Date(current); d.setDate(d.getDate() - 7); setCurrent(d); }
  };
  const goNext = () => {
    if (view === "month") setCurrent(new Date(year, month + 1, 1));
    else { const d = new Date(current); d.setDate(d.getDate() + 7); setCurrent(d); }
  };
  const goToday = () => { setCurrent(new Date()); setSelectedDay(today.getDate()); };

  const handleAddBill = () => { setShowAddEvent(false); setShowAddBill(true); };
  const handleAddLoan = () => { setShowAddEvent(false); navigate("/add-loan"); };
  const handleAddIncome = () => { setShowAddEvent(false); navigate("/finance"); };

  const periodLabel = useMemo(() => {
    if (view === "month") return `${monthName} ${year}`;
    const ws = new Date(current);
    ws.setDate(current.getDate() - current.getDay());
    const we = new Date(ws);
    we.setDate(ws.getDate() + 6);
    const sM = getMonthName(ws.getMonth(), locale, "short");
    const eM = getMonthName(we.getMonth(), locale, "short");
    return `${sM} ${ws.getDate()} - ${eM} ${we.getDate()}`;
  }, [view, current, monthName, year, locale]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <CalendarToolbar
          view={view} setView={setView}
          periodLabel={periodLabel}
          onPrev={goPrev} onNext={goNext} onToday={goToday}
          filters={filters} toggleFilter={toggleFilter}
          onAddEvent={() => setShowAddEvent(true)}
          monthIncome={monthIncome} monthBills={monthBills} monthLoans={monthLoans}
          fmt={fmt}
        />

        {view === "month" ? (
          <CalendarMonthView
            cells={cells}
            dayMap={filteredDayMap}
            payDays={filteredPayDays}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            today={today} year={year} month={month}
            dayHeaders={dayHeaders} dayHeadersNarrow={dayHeadersNarrow}
            onItemClick={handleItemClick}
            fmt={fmt}
          />
        ) : (
          <CalendarWeekView
            current={current}
            getEventsForDate={getEventsForDate}
            getPaydayForDate={getPaydayForDate}
            today={today}
            locale={locale}
            onItemClick={handleItemClick}
            fmt={fmt}
          />
        )}

        {/* Selected Day Detail (month view) */}
        <AnimatePresence mode="wait">
          {selectedDay && view === "month" && (
            <motion.div
              key={selectedDay}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-card border border-border rounded-3xl p-5 mb-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-lg font-bold text-foreground">{monthName} {selectedDay}, {year}</p>
                {selectedTotal > 0 && <span className="text-xs font-bold px-2.5 py-1 bg-destructive/10 text-destructive rounded-lg">{fmt(selectedTotal)} {T("dueAmount", "due")}</span>}
                {selectedTotal < 0 && <span className="text-xs font-bold px-2.5 py-1 bg-primary/10 text-primary rounded-lg">+{fmt(Math.abs(selectedTotal))}</span>}
              </div>

              {isPayday && (
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3 mb-3">
                  <span className="text-xl">💰</span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{T("paydayLabel", "Payday!")}</p>
                    <p className="text-[11px] font-medium text-muted-foreground capitalize">{userProfile?.pay_frequency} {T("payLabel", "pay")}</p>
                  </div>
                </div>
              )}

              {selectedItems.length === 0 && !isPayday && (
                <div className="text-center py-6 bg-muted/30 rounded-2xl border border-dashed border-border">
                  <p className="text-xs font-medium text-muted-foreground">{T("nothingDue", "Nothing due on this day")}</p>
                </div>
              )}

              <div className="space-y-2">
                {selectedItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="w-full flex items-center justify-between bg-muted/20 hover:bg-muted/40 border border-border rounded-2xl px-4 py-3 transition-colors text-left cursor-pointer"
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
                          {item._type === "loan" ? T("loanPayment", "Loan payment") : item._type === "income" ? T("income", "Income") : item.category}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${item._type === "income" ? "text-primary" : "text-destructive"}`}>
                      {item._type === "income" ? "+" : "-"}{fmt(item._amount)}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AddEventDialog
        open={showAddEvent}
        onClose={() => setShowAddEvent(false)}
        onAddBill={handleAddBill}
        onAddLoan={handleAddLoan}
        onAddIncome={handleAddIncome}
      />

      <AddBillDialog
        open={showAddBill}
        onClose={() => setShowAddBill(false)}
        onSaved={() => { setShowAddBill(false); reload(); }}
      />
    </div>
  );
}