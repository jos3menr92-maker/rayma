import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Trash2, Zap, CheckCircle2 } from "lucide-react";

const categoryEmojis = {
  utilities: "⚡", subscriptions: "📱", insurance: "🛡️", rent: "🏠",
  phone: "📞", internet: "🌐", food: "🍽️", other: "📋",
};

const today = new Date().getDate();

export default function BillCard({ bill, index = 0, onRefresh }) {
  const [confirm, setConfirm] = useState(false);

  const daysUntil = bill.due_day >= today ? bill.due_day - today : bill.due_day + 31 - today;
  const isDueSoon = daysUntil <= 3;
  const isToday = daysUntil === 0;

  async function handleDelete() {
    await base44.entities.Bill.delete(bill.id);
    onRefresh();
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
                  <CheckCircle2 className="w-2.5 h-2.5" /> AUTO
                </span>
              )}
            </div>
            <p className={`text-[11px] font-medium ${isToday ? "text-destructive" : isDueSoon ? "text-amber-600" : "text-muted-foreground"}`}>
              {isToday ? "Due today!" : daysUntil === 1 ? "Due tomorrow" : `Due in ${daysUntil} days · ${bill.due_day}th`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-base font-bold font-heading text-foreground">
            ${bill.amount?.toFixed(2)}
          </p>
          {!confirm ? (
            <button onClick={() => setConfirm(true)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button onClick={handleDelete} className="text-[11px] px-2 py-1 bg-destructive text-destructive-foreground rounded-lg font-medium">Yes</button>
              <button onClick={() => setConfirm(false)} className="text-[11px] px-2 py-1 bg-muted text-muted-foreground rounded-lg">No</button>
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