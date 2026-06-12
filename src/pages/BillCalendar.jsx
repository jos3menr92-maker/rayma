import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays, DollarSign, Receipt, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useFinancialData } from "@/lib/FinancialDataContext";

const categoryIcons = {
  utilities: "⚡", subscriptions: "📱", insurance: "🛡️",
  rent: "🏠", food: "🍔", transport: "🚗", health: "🏥", other: "📋",
};

const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n || 0);

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function BillCalendar() {
  const { bills, loans, userProfile } = useFinancialData(); // 🚀 CONNECTED TO REAL BRAIN
  const [current, setCurrent] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  // Helper to extract day from "YYYY-MM-DD"
  const getDueDay = (dateStr) => dateStr ? parseInt(dateStr.split('-')[2], 10) : null;

  // Build day map
  const dayMap = {};
  bills.forEach(b => {
    const day = getDueDay(b.due_date);
    if (day) {
      if (!dayMap[day]) dayMap[day] = [];
      dayMap[day].push({ ...b, _type: "bill" });
    }
  });
  loans.forEach(l => {
    const day = getDueDay(l.due_date);
    if (day) {
      if (!dayMap[day]) dayMap[day] = [];
      dayMap[day].push({ ...l, _type: "loan" });
    }
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedItems = selectedDay ? (dayMap[selectedDay] || []) : [];
  const totalDue = selectedItems.reduce((s, x) => s + (x._type === "bill" ? (x.amount || 0) : (x.monthly_payment || 0)), 0);

  // Real Math
  const monthlyBills = bills.reduce((s, b) => s + (b.amount || 0), 0);
  const monthlyLoans = loans.reduce((s, l) => s + (l.monthly_payment || 0), 0);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Financial Calendar</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-5 ml-12">Your real financial schedule</p>

        {/* Real Summary Strip */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <Receipt className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Monthly Bills</p>
            <p className="text-sm font-bold text-destructive">{fmt(monthlyBills)}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <CreditCard className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Loan Payments</p>
            <p className="text-sm font-bold text-destructive">{fmt(monthlyLoans)}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <DollarSign className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Total Monthly</p>
            <p className="text-sm font-bold text-foreground">{fmt(monthlyBills + monthlyLoans)}</p>
          </div>
        </div>

        {/* Calendar grid... (Keep the grid logic exactly as it was, it looks great!) */}
        {/* ... */}
      </motion.div>
    </div>
  );
}
