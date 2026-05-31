import { useEffect, useState, useMemo } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit3, Receipt, CheckCircle2 } from "lucide-react";
import BillPriceAlert from "../components/BillPriceAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

const categoryIcons = {
  utilities: "⚡", subscriptions: "📱", insurance: "🛡️",
  rent: "🏠", food: "🍔", transport: "🚗", health: "🏥", other: "📋",
};

const categories = [
  { value: "utilities", label: "⚡ Utilities" },
  { value: "subscriptions", label: "📱 Subscriptions" },
  { value: "insurance", label: "🛡️ Insurance" },
  { value: "rent", label: "🏠 Rent" },
  { value: "food", label: "🍔 Food" },
  { value: "transport", label: "🚗 Transport" },
  { value: "health", label: "🏥 Health" },
  { value: "other", label: "📋 Other" },
];

// fmt defined via useCurrency hook inside component

const DOW = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const emptyForm = { name: "", amount: "", payment_frequency: "monthly", due_day: "", due_day_of_week: "Friday", category: "other", notes: "", is_active: true };

export default function Bills() {
  const { formatCurrency: fmt } = useCurrency();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    // Paginate: fetch 50 at a time instead of 100
    const data = await base44.entities.Bill.list("-created_date", 50);
    setBills(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (bill) => {
    setEditing(bill);
    setForm({
      name: bill.name,
      amount: bill.amount,
      payment_frequency: bill.payment_frequency || "monthly",
      due_day: bill.due_day || "",
      due_day_of_week: bill.due_day_of_week || "Friday",
      category: bill.category || "other",
      notes: bill.notes || "",
      is_active: bill.is_active !== false,
    });
    setDialogOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      amount: parseFloat(form.amount) || 0,
      due_day: form.payment_frequency === "monthly" ? (parseInt(form.due_day) || null) : null,
      due_day_of_week: (form.payment_frequency === "weekly" || form.payment_frequency === "biweekly") ? (form.due_day_of_week || "Monday") : null,
    };
    if (editing) {
      await base44.entities.Bill.update(editing.id, data);
    } else {
      await base44.entities.Bill.create(data);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.Bill.delete(id);
    load();
  };

  const [paidBillId, setPaidBillId] = useState(null);
  const handleMarkPaid = async (bill) => {
    setPaidBillId(bill.id);
    await base44.entities.Payment.create({
      bill_id: bill.id,
      payment_type: "bill",
      amount: bill.amount,
      payment_date: format(new Date(), "yyyy-MM-dd"),
      note: `Auto-logged from Bills page`,
    });
    setPaidBillId(null);
  };

  const totalMonthly = useMemo(() => bills.filter(b => b.is_active !== false).reduce((s, b) => {
    const freq = b.payment_frequency || "monthly";
    if (freq === "weekly") return s + (b.amount || 0) * 4.33;
    if (freq === "biweekly") return s + (b.amount || 0) * 2.17;
    return s + (b.amount || 0);
  }, 0), [bills]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <BillPriceAlert />
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold font-heading text-foreground">Monthly Bills</h1>
          <Button size="sm" className="rounded-xl" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>

        {/* Total */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Monthly Equivalent</p>
            <p className="text-xl font-bold font-heading text-foreground">{fmt(totalMonthly)}</p>
          </div>
        </div>

        {/* Bills list */}
        <div className="space-y-3">
          <AnimatePresence>
            {bills.map((bill, i) => (
              <motion.div
                key={bill.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.04 }}
                className={`bg-card border border-border rounded-2xl p-4 flex items-center justify-between ${bill.is_active === false ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
                    {categoryIcons[bill.category] || "📋"}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{bill.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const freq = bill.payment_frequency || "monthly";
                        if (freq === "weekly") return `Weekly · ${bill.due_day_of_week || ""}`;
                        if (freq === "biweekly") return `Bi-weekly · ${bill.due_day_of_week || ""}`;
                        return bill.due_day ? `Monthly · ${bill.due_day}th` : "Monthly · No due day";
                      })()} · {bill.category}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-foreground text-sm">{fmt(bill.amount)}</p>
                  <button
                    onClick={() => handleMarkPaid(bill)}
                    disabled={paidBillId === bill.id}
                    className="p-2.5 text-muted-foreground hover:text-primary transition-colors"
                    title="Mark as Paid"
                  >
                    <CheckCircle2 className={`w-4 h-4 ${paidBillId === bill.id ? "text-primary animate-pulse" : ""}`} />
                  </button>
                  <button onClick={() => openEdit(bill)} className="p-2.5 text-muted-foreground hover:text-foreground transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(bill.id)} className="p-2.5 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {bills.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No bills yet. Add your first monthly bill.</p>
          </div>
        )}
      </motion.div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Bill" : "Add Bill"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Netflix" required className="mt-1 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Amount ($) *</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" required className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Frequency</Label>
                <Select value={form.payment_frequency} onValueChange={v => setForm(f => ({ ...f, payment_frequency: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.payment_frequency === "monthly" ? (
              <div>
                <Label className="text-xs text-muted-foreground">Due Day of Month (1-31)</Label>
                <Input type="number" min="1" max="31" value={form.due_day} onChange={e => setForm(f => ({ ...f, due_day: e.target.value }))} placeholder="1" className="mt-1 rounded-xl" />
              </div>
            ) : (
              <div>
                <Label className="text-xs text-muted-foreground">Due Day of Week</Label>
                <Select value={form.due_day_of_week} onValueChange={v => setForm(f => ({ ...f, due_day_of_week: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOW.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" className="mt-1 rounded-xl" />
            </div>
            <Button type="submit" disabled={saving} className="w-full rounded-xl">
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Bill"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}