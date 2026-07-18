import { useT } from "@/lib/LanguageContext";
import { getMonthName } from "@/utils/formatLocalized";

const categoryIcons = {
  utilities: "⚡", subscriptions: "📱", insurance: "🛡️",
  rent: "🏠", food: "🍔", transport: "🚗", health: "🏥", other: "📋",
  mortgage: "🏠", auto: "🚗", student: "🎓", personal: "👤", credit_card: "💳", medical: "🏥",
};

export default function CalendarWeekView({ current, getEventsForDate, getPaydayForDate, today, locale, onItemClick, fmt }) {
  const T = useT();

  const weekStart = new Date(current);
  weekStart.setDate(current.getDate() - current.getDay());

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  return (
    <div className="space-y-2 mb-6">
      {days.map((date, i) => {
        const events = getEventsForDate(date);
        const isPayday = getPaydayForDate(date);
        const isToday = date.toDateString() === today.toDateString();
        const dayName = date.toLocaleDateString(locale, { weekday: "short" });
        const monthName = getMonthName(date.getMonth(), locale, "short");
        const totalOut = events.filter(e => e._type !== "income").reduce((s, e) => s + (e._amount || 0), 0);
        const totalIn = events.filter(e => e._type === "income").reduce((s, e) => s + (e._amount || 0), 0);

        return (
          <div key={i} className={`bg-card border rounded-2xl p-3 shadow-sm transition-all ${isToday ? "border-primary/40 ring-1 ring-primary/20" : "border-border"}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center ${isToday ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  <span className="text-[8px] font-bold uppercase leading-none">{dayName}</span>
                  <span className="text-base font-bold leading-tight">{date.getDate()}</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground capitalize">{monthName} {date.getDate()}</p>
                  {isPayday && <p className="text-[10px] font-bold text-emerald-500">💰 {T("paydayLegend", "Payday")}</p>}
                  {events.length === 0 && !isPayday && <p className="text-[10px] text-muted-foreground">{T("noEventsDay", "No events")}</p>}
                  {events.length > 0 && <p className="text-[10px] text-muted-foreground">{events.length} {T("eventsCount", "events")}</p>}
                </div>
              </div>
              <div className="text-right">
                {totalOut > 0 && <p className="text-xs font-bold text-destructive">-{fmt(totalOut)}</p>}
                {totalIn > 0 && <p className="text-xs font-bold text-primary">+{fmt(totalIn)}</p>}
              </div>
            </div>

            {events.length > 0 && (
              <div className="space-y-1.5">
                {events.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => onItemClick(item)}
                    className="flex items-center justify-between bg-muted/20 hover:bg-muted/40 border border-border rounded-xl px-3 py-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                        item._type === "income" ? "bg-primary/10" : item._type === "loan" ? "bg-orange-500/10" : "bg-destructive/10"
                      }`}>
                        {item._type === "loan" ? "🏦" : item._type === "income" ? "💵" : (categoryIcons[item.category] || "📋")}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">{item.name}</p>
                        <p className="text-[10px] font-medium text-muted-foreground capitalize">
                          {item._type === "loan" ? T("loanPayment", "Loan payment") : item._type === "income" ? T("income", "Income") : item.category}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${item._type === "income" ? "text-primary" : "text-destructive"}`}>
                      {item._type === "income" ? "+" : "-"}{fmt(item._amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}