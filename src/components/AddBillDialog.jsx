import { useState } from "react";
import { supabase } from "@/lib/supabaseClient"; // 🔌 THE VAULT
import { useFinancialData } from "@/lib/FinancialDataContext"; // 🧠 THE BRAIN
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const categories = [
  { value: "utilities", label: "⚡ Utilities" },
  { value: "subscriptions", label: "📱 Subscriptions" },
  { value: "insurance", label: "🛡️ Insurance" },
  { value: "rent", label: "🏠 Rent / Housing" },
  { value: "food", label: "🍽️ Food" },
  { value: "transport", label: "🚗 Transport" },
  { value: "health", label: "🏥 Health" },
  { value: "other", label: "📋 Other" },
];

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function AddBillDialog({ open, onClose, onSaved }) {
  const { userProfile, reload } = useFinancialData(); // 🚀 CONNECTED TO BRAIN
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", amount: "", payment_frequency: "monthly", due_day: "", due_day_of_week: "", category: "other", autopay: false, notes: "",
  });

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  const isWeekly = form.payment_frequency === "weekly" || form.payment_frequency === "biweekly";

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    
    const payload = {
      name: form.name,
      user_id: userProfile?.id,
      amount: parseFloat(form.amount) || 0,
      payment_frequency: form.payment_frequency,
      category: form.category,
      notes: form.notes,
      is_active: true,
    };
    
    if (isWeekly) {
      payload.due_day_of_week = form.due_day_of_week;
    } else {
      payload.due_day = parseInt(form.due_day) || null; // Fixed to allow null if no day provided
    }
    
    await supabase.from('bills').insert([payload]);
    setSaving(false);
    setForm({ name: "", amount: "", payment_frequency: "monthly", due_day: "", due_day_of_week: "", category: "other", autopay: false, notes: "" });
    reload(); // Refresh the brain!
    onClose();
    if (onSaved) onSaved();
  }

  const isValid = form.name && form.amount && (isWeekly ? form.due_day_of_week : form.due_day);

  return (
    // ... KEEP THE EXACT SAME UI CODE HERE ...
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Bill</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-1">
          <div>
            <Label className="text-xs text-muted-foreground">Bill Name *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} required placeholder="e.g. Netflix" className="mt-1 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Frequency *</Label>
              <Select value={form.payment_frequency} onValueChange={v => set("payment_frequency", v)}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Amount ($) *</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={e => set("amount", e.target.value)} required placeholder="0.00" className="mt-1 rounded-xl" />
            </div>
            <div>
              {isWeekly ? (
                <>
                  <Label className="text-xs text-muted-foreground">Due Day of Week *</Label>
                  <Select value={form.due_day_of_week} onValueChange={v => set("due_day_of_week", v)}>
                    <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="Select day" /></SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <>
                  <Label className="text-xs text-muted-foreground">Due Day (1-31) *</Label>
                  <Input type="number" min="1" max="31" value={form.due_day} onChange={e => set("due_day", e.target.value)} required placeholder="1" className="mt-1 rounded-xl" />
                </>
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional" className="mt-1 rounded-xl" />
          </div>
          <Button type="submit" disabled={saving || !isValid} className="w-full rounded-xl">
            {saving ? "Saving..." : "Add Bill"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
