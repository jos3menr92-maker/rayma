import { useState } from "react";
import { base44 } from "@/api/base44Client";
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
  { value: "phone", label: "📞 Phone" },
  { value: "internet", label: "🌐 Internet" },
  { value: "food", label: "🍽️ Food" },
  { value: "other", label: "📋 Other" },
];

export default function AddBillDialog({ open, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", amount: "", due_day: "", category: "other", autopay: false, notes: "",
  });

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await base44.entities.Bill.create({
      ...form,
      amount: parseFloat(form.amount) || 0,
      due_day: parseInt(form.due_day) || 1,
    });
    setSaving(false);
    setForm({ name: "", amount: "", due_day: "", category: "other", autopay: false, notes: "" });
    onClose();
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Monthly Bill</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-1">
          <div>
            <Label className="text-xs text-muted-foreground">Bill Name *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} required placeholder="e.g. Netflix" className="mt-1 rounded-xl" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select value={form.category} onValueChange={v => set("category", v)}>
              <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Amount ($) *</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={e => set("amount", e.target.value)} required placeholder="0.00" className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Due Day (1-31) *</Label>
              <Input type="number" min="1" max="31" value={form.due_day} onChange={e => set("due_day", e.target.value)} required placeholder="1" className="mt-1 rounded-xl" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autopay"
              checked={form.autopay}
              onChange={e => set("autopay", e.target.checked)}
              className="rounded"
            />
            <label htmlFor="autopay" className="text-xs text-muted-foreground">Autopay enabled</label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional" className="mt-1 rounded-xl" />
          </div>
          <Button type="submit" disabled={saving || !form.name || !form.amount || !form.due_day} className="w-full rounded-xl">
            {saving ? "Saving..." : "Add Bill"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}