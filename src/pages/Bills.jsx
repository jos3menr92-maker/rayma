import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { CalendarDays, List, Plus, Zap } from "lucide-react";
import BillCalendar from "../components/BillCalendar";
import BillCard from "../components/BillCard";
import AddBillDialog from "../components/AddBillDialog";

export default function Bills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => { loadBills(); }, []);

  async function loadBills() {
    const data = await base44.entities.Bill.list("due_day", 100);
    setBills(data);
    setLoading(false);
  }

  const monthlyTotal = bills.reduce((s, b) => s + (b.amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold font-heading text-foreground">Monthly Bills</h1>
          <button
            onClick={() => setAddOpen(true)}
            className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm"
          >
            <Plus className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          {bills.length} bill{bills.length !== 1 ? "s" : ""} · $
          {monthlyTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /mo
        </p>
      </motion.div>

      {/* View toggle */}
      <div className="flex gap-1.5 bg-muted p-1 rounded-xl mb-5 w-fit">
        <button
          onClick={() => setView("list")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            view === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <List className="w-3.5 h-3.5" /> List
        </button>
        <button
          onClick={() => setView("calendar")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            view === "calendar" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" /> Calendar
        </button>
      </div>

      {view === "calendar" ? (
        <BillCalendar bills={bills} />
      ) : (
        <div className="space-y-3">
          {bills.map((bill, i) => (
            <BillCard key={bill.id} bill={bill} index={i} onRefresh={loadBills} />
          ))}
          {bills.length === 0 && (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Zap className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-semibold text-foreground text-sm mb-1">No bills yet</p>
              <p className="text-xs text-muted-foreground">Tap + to add your first monthly bill</p>
            </div>
          )}
        </div>
      )}

      <AddBillDialog open={addOpen} onClose={() => setAddOpen(false)} onSaved={loadBills} />
    </div>
  );
}