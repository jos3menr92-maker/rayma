import { CalendarDays, ChevronLeft, ChevronRight, Plus, Wallet, TrendingUp, AlertCircle } from "lucide-react";
import { useT } from "@/lib/LanguageContext";

export default function CalendarToolbar({ view, setView, periodLabel, onPrev, onNext, onToday, filters, toggleFilter, onAddEvent, monthIncome, monthBills, monthLoans, fmt }) {
  const T = useT();

  const filterChips = [
    { key: "bills", label: T("bills", "Bills"), dot: "bg-destructive", active: "bg-destructive text-destructive-foreground" },
    { key: "loans", label: T("loans", "Loans"), dot: "bg-orange-500", active: "bg-orange-500 text-white" },
    { key: "income", label: T("income", "Income"), dot: "bg-primary", active: "bg-primary text-primary-foreground" },
    { key: "payday", label: T("showPaydays", "Paydays"), dot: "bg-emerald-500", active: "bg-emerald-500 text-white" },
  ];

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-primary" />
          {T("fullCalendar", "Full Calendar")}
        </h1>
        <button onClick={onAddEvent} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all">
          <Plus className="w-4 h-4" /> {T("addEvent", "Add Event")}
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{T("addEventDesc", "See all your financial events")}</p>

      <div className="grid grid-cols-3 gap-2 mb-4">
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

      <div className="flex items-center justify-between mb-3">
        <div className="flex bg-muted rounded-xl p-1">
          <button onClick={() => setView("month")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === "month" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            {T("monthView", "Month")}
          </button>
          <button onClick={() => setView("week")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === "week" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            {T("weekView", "Week")}
          </button>
        </div>
        <button onClick={onToday} className="text-xs font-bold px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
          {T("today", "Today")}
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button onClick={onPrev} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <span className="text-sm font-bold text-foreground capitalize">{periodLabel}</span>
        <button onClick={onNext} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filterChips.map(chip => (
          <button
            key={chip.key}
            onClick={() => toggleFilter(chip.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${filters[chip.key] ? chip.active : "bg-muted text-muted-foreground"}`}
          >
            <span className={`w-2 h-2 rounded-full ${filters[chip.key] ? "bg-white/70" : chip.dot}`} />
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}