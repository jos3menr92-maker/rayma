import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, ArrowUpRight, ArrowDownLeft, Trash2, Pencil } from "lucide-react";

function groupByMonth(incomes) {
  const groups = {};
  [...incomes].sort((a, b) => b.week_start.localeCompare(a.week_start)).forEach(inc => {
    const d = new Date(inc.week_start + "T00:00:00");
    const key = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(inc);
  });
  return Object.entries(groups);
}

export default function IncomeLogGrouped({ incomes, weeklyExpenses, onEdit, onDelete, fmt, getWeekLabel }) {
  const groups = groupByMonth(incomes);
  const [collapsed, setCollapsed] = useState(() => {
    // Collapse all except the first (most recent) group
    const set = new Set();
    groups.slice(1).forEach(([key]) => set.add(key));
    return set;
  });

  const toggle = (key) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {groups.map(([month, items]) => {
        const isCollapsed = collapsed.has(month);
        const monthTotal = items.reduce((s, i) => s + (i.amount || 0), 0);
        const monthNet = monthTotal - weeklyExpenses * items.length;

        return (
          <div key={month} className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => toggle(month)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                <span className="text-sm font-semibold text-foreground">{month}</span>
                <span className="text-xs text-muted-foreground">({items.length} week{items.length !== 1 ? "s" : ""})</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{fmt(monthTotal)}</p>
                <p className={`text-[10px] font-medium ${monthNet >= 0 ? "text-primary" : "text-destructive"}`}>
                  {monthNet >= 0 ? "+" : ""}{fmt(monthNet)} net
                </p>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="divide-y divide-border border-t border-border">
                    {items.map(inc => {
                      const weeklyNet = inc.amount - weeklyExpenses;
                      return (
                        <div key={inc.id} className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{fmt(inc.amount)}</p>
                            <p className="text-xs text-muted-foreground">
                              Week of {getWeekLabel(inc.week_start)}{inc.note ? ` · ${inc.note}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className={`flex items-center gap-0.5 justify-end text-xs font-medium ${weeklyNet >= 0 ? "text-primary" : "text-destructive"}`}>
                                {weeklyNet >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                                {fmt(Math.abs(weeklyNet))}
                              </div>
                              <p className="text-[10px] text-muted-foreground">after expenses</p>
                            </div>
                            <button onClick={() => onEdit(inc)} className="p-1 text-muted-foreground hover:text-foreground">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => onDelete(inc.id)} className="p-1 text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}