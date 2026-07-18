import { useT } from "@/lib/LanguageContext";

const categoryIcons = {
  utilities: "⚡", subscriptions: "📱", insurance: "🛡️",
  rent: "🏠", food: "🍔", transport: "🚗", health: "🏥", other: "📋",
  mortgage: "🏠", auto: "🚗", student: "🎓", personal: "👤", credit_card: "💳", medical: "🏥",
};

export default function CalendarMonthView({ cells, dayMap, payDays, selectedDay, onSelectDay, today, year, month, dayHeaders, dayHeadersNarrow, onItemClick, fmt }) {
  const T = useT();

  return (
    <div className="bg-card border border-border rounded-3xl p-3 mb-6 shadow-sm">
      <div className="grid grid-cols-7 mb-2">
        {dayHeaders.map((d, i) => (
          <div key={i} className="text-center text-[11px] font-bold text-muted-foreground py-1 hidden sm:block">{d}</div>
        ))}
        {dayHeadersNarrow.map((d, i) => (
          <div key={`n-${i}`} className="text-center text-[11px] font-bold text-muted-foreground py-1 sm:hidden block">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="min-h-[60px] sm:min-h-[76px]" />;
          const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
          const isSelected = selectedDay === day;
          const items = dayMap[day] || [];
          const isPay = payDays.includes(day);

          return (
            <div
              key={day}
              onClick={() => onSelectDay(isSelected ? null : day)}
              className={`relative min-h-[60px] sm:min-h-[76px] flex flex-col items-start p-1 rounded-xl text-xs font-bold cursor-pointer transition-all
                ${isSelected ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02] z-10"
                  : isToday ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-muted/30 hover:bg-muted text-foreground"}
              `}
            >
              <span className={`self-end text-[11px] leading-none mb-0.5 ${isSelected ? "text-primary-foreground" : isToday ? "text-primary" : "text-muted-foreground"}`}>{day}</span>
              <div className="flex flex-col gap-0.5 w-full overflow-hidden">
                {items.slice(0, 3).map((item, idx) => (
                  <div
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); onItemClick(item); }}
                    className={`text-[8px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer ${
                      isSelected ? "bg-white/20 text-primary-foreground"
                      : item._type === "income" ? "bg-primary/15 text-primary"
                      : item._type === "loan" ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                      : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {item._type === "loan" ? "🏦" : item._type === "income" ? "💵" : (categoryIcons[item.category] || "📋")} {item.name}
                  </div>
                ))}
                {items.length > 3 && (
                  <span className={`text-[8px] font-semibold px-1 ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>+{items.length - 3} {T("moreLabel", "more")}</span>
                )}
                {isPay && (
                  <div className={`text-[8px] leading-tight px-1 py-0.5 rounded ${isSelected ? "bg-white/20 text-primary-foreground" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"}`}>💰 {T("paydayLegend", "Payday")}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-3 mt-4 pt-3 border-t border-border text-[10px] font-semibold text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive" /> {T("bills", "Bills")}</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" /> {T("loans", "Loans")}</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> {T("income", "Income")}</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> {T("paydayLegend", "Payday")}</span>
      </div>
    </div>
  );
}