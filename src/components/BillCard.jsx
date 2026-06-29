import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import { Trash2, CheckCircle2 } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

const categoryEmojis = {
  utilities: "⚡", subscriptions: "📱", insurance: "🛡️", rent: "🏠",
  phone: "📞", internet: "🌐", food: "🍽️", other: "📋",
};

const today = new Date().getDate();

export default function BillCard({ bill, index = 0, onRefresh }) {
  const [confirm, setConfirm] = useState(false);
  const { formatCurrency: fmt } = useCurrency();
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);

  const daysUntil = bill.due_day >= today ? bill.due_day - today : bill.due_day + 31 - today;
  const isDueSoon = daysUntil <= 3;
  const isToday = daysUntil === 0;

  async function handleDelete() {
    await supabase.from('bills').delete().eq('id', bill.id);
    if (onRefresh) onRefresh();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-card border border-border rounded-2xl p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
            isToday ? "bg-destructive/10" : isDueSoon ? "bg-amber-50" : "bg-primary/10"
          }`}>
            {categoryEmojis[bill.category] || "📋"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm font-heading text-foreground">{bill.name}</h3>
              {bill.autopay && (
                <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" /> {T("autoPay", "AUTO")}
                </span>
              )}
            </div>
            <p className={`text-[11px] font-medium ${isToday ? "text-destructive" : isDueSoon ? "text-amber-600" : "text-muted-foreground"}`}>
              {isToday ? T("dueToday", "Due today!") : daysUntil === 1 ? T("dueTomorrow", "Due tomorrow") : T("dueInDays", "Due in {n} days · {day}th").replace("{n}", daysUntil).replace("{day}", bill.due_day)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-base font-bold font-heading text-foreground">
            {fmt(bill.amount)}
          </p>
          {!confirm ? (
            <button onClick={() => setConfirm(true)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button onClick={handleDelete} className="text-[11px] px-2 py-1 bg-destructive text-destructive-foreground rounded-lg font-medium">{T("yesLabel", "Yes")}</button>
              <button onClick={() => setConfirm(false)} className="text-[11px] px-2 py-1 bg-muted text-muted-foreground rounded-lg">{T("noLabel", "No")}</button>
            </div>
          )}
        </div>
      </div>
      {bill.notes && (
        <p className="text-[11px] text-muted-foreground mt-2 ml-[52px]">{bill.notes}</p>
      )}
    </motion.div>
  );
}