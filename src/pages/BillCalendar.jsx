import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays, DollarSign, Receipt, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const categoryIcons = {
  utilities: "⚡", subscriptions: "📱", insurance: "🛡️",
  rent: "🏠", food: "🍔", transport: "🚗", health: "🏥", other: "📋",
};

const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n || 0);

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 2) % 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().split("T")[0];
}

export default function BillCalendar() {
  const [bills, setBills] = useState([]);
  const [loans, setLoans] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [incomeDialog, setIncomeDialog] = useState(false);
  const [incomeForm, setIncomeForm] = useState({ amount: "", week_start: startOfWeek(), note: "" });
  const [saving, setSaving] = useState(false);
  
useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [b, l, me] = await Promise.all([
          base44.entities.Bill.list("-created_date", 100),
          base44.entities.Loan.list("-created_date", 100),
          base44.auth.me(),
        ]);
        setBills(b.filter((x) => x.is_active !== false));
        setLoans(l.filter((x) => x.status !== "paid_off" && x.monthly_payment));
        setUserProfile(me);
      } catch (error) {
        console.error("Failed to load calendar data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  // Build day map
  const dayMap = {};
  bills.forEach(b => {
    if (b.due_day) {
      if (!dayMap[b.due_day]) dayMap[b.due_day] = [];
      dayMap[b.due_day].push({ ...b, _type: "bill" });
    }
  });
  loans.forEach(l => {
    if (l.due_day) {
      if (!dayMap[l.due_day]) dayMap[l.due_day] = [];
      dayMap[l.due_day].push({ ...l, _type: "loan" });
    }
  });

  // Payday markers
  const payDays = [];
  if (userProfile?.pay_frequency === "monthly" && userProfile?.pay_day) {
    const d = parseInt(userProfile.pay_day);
    if (d >= 1 && d <= daysInMonth) payDays.push(d);
  } else if ((userProfile?.pay_frequency === "weekly" || userProfile?.pay_frequency === "biweekly") && userProfile?.pay_day) {
    const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const targetDow = dayNames.indexOf(userProfile.pay_day);
    if (targetDow !== -1) {
      const step = userProfile.pay_frequency === "weekly" ? 7 : 14;
      for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(year, month, d).getDay() === targetDow) {
          payDays.push(d);
          if (userProfile.pay_frequency === "biweekly") break;
        }
      }
    }
  }

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedItems = selectedDay ? (dayMap[selectedDay] || []) : [];
  const isPayday = selectedDay && payDays.includes(selectedDay);
  const totalDue = selectedItems.reduce((s, x) => s + (x._type === "bill" ? (x.amount || 0) : (x.monthly_payment || 0)), 0);

  async function handleLogIncome(e) {
    e.preventDefault();
    setSaving(true);
    await base44.entities.WeeklyIncome.create({
      ...incomeForm,
      amount: parseFloat(incomeForm.amount) || 0,
    });
    setSaving(false);
    setIncomeDialog(false);
  }

  // Monthly summary
  const monthlyBills = bills.reduce((s, b) => s + (b.amount || 0), 0);
  const monthlyLoans = loans.reduce((s, l) => s + (l.monthly_payment || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Financial Calendar</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-5 ml-12">Bills, loan payments & paydays at a glance</p>

        {/* Summary strip */}
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

        {/* Calendar card */}
        <div className="bg-card border border-border rounded-3xl p-4 mb-5">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrent(new Date(year, month - 1, 1))} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <h2 className="text-base font-semibold font-heading text-foreground">{MONTHS[month]} {year}</h2>
            <button onClick={() => setCurrent(new Date(year, month + 1, 1))} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
              const hasBills = !!dayMap[day];
              const isPay = payDays.includes(day);
              const isSelected = selectedDay === day;
              const billCount = dayMap[day]?.length || 0;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all
                    ${isSelected ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : isToday ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                      : "hover:bg-muted text-foreground"}
                  `}
                >
                  {day}
                  <div className="absolute bottom-1 flex gap-0.5 justify-center">
                    {hasBills && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary-foreground/70" : "bg-destructive"}`} />}
                    {isPay && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary-foreground/70" : "bg-primary"}`} />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 pt-3 border-t border-border text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive" /> Bills & Loans</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Payday</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary/20 ring-1 ring-primary" /> Today</span>
          </div>
        </div>

        {/* Selected day panel */}
        <AnimatePresence>
          {selectedDay && (
            <motion.div
              key={selectedDay}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold font-heading text-foreground">
                  {MONTHS[month]} {selectedDay}
                </h3>
                {totalDue > 0 && (
                  <span className="text-sm font-bold text-destructive">{fmt(totalDue)} total due</span>
                )}
              </div>

              {/* Payday card */}
              {isPayday && (
                <div className="bg-primary/10 border border-primary/25 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💰</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Payday!</p>
                      <p className="text-xs text-muted-foreground capitalize">{userProfile?.pay_frequency} income — remember to log it</p>
                    </div>
                  </div>
                  <Button size="sm" className="rounded-xl text-xs" onClick={() => setIncomeDialog(true)}>
                    Log Income
                  </Button>
                </div>
              )}

              {/* Bills & Loans */}
              {selectedItems.length === 0 && !isPayday && (
                <div className="text-center py-6 text-sm text-muted-foreground">Nothing due on this day</div>
              )}

              {selectedItems.map(item => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${item._type === "loan" ? "bg-chart-2/10" : "bg-destructive/10"}`}>
                      {item._type === "loan" ? "🏦" : (categoryIcons[item.category] || "📋")}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {item._type === "loan" ? `Loan payment · ${item.lender || ""}` : item.category}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-destructive">
                      {fmt(item._type === "bill" ? item.amount : item.monthly_payment)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">/month</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {!selectedDay && (
          <div className="text-center py-6">
            <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Tap any day to see bills, loans, and paydays</p>
          </div>
        )}
      </motion.div>

      {/* Income log dialog */}
      <Dialog open={incomeDialog} onOpenChange={setIncomeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Log Income</DialogTitle></DialogHeader>
          <form onSubmit={handleLogIncome} className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Amount *</Label>
              <Input type="number" step="0.01" placeholder="$0" value={incomeForm.amount}
                onChange={e => setIncomeForm(f => ({ ...f, amount: e.target.value }))} required className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Week Starting</Label>
              <Input type="date" value={incomeForm.week_start}
                onChange={e => setIncomeForm(f => ({ ...f, week_start: e.target.value }))} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Note</Label>
              <Input placeholder="Optional" value={incomeForm.note}
                onChange={e => setIncomeForm(f => ({ ...f, note: e.target.value }))} className="mt-1 rounded-xl" />
            </div>
            <Button type="submit" disabled={saving} className="w-full rounded-xl">
              {saving ? "Saving..." : "Log Income"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}