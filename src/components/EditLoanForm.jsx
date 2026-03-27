import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const categories = [
  { value: "mortgage", label: "🏠 Mortgage" },
  { value: "auto", label: "🚗 Auto Loan" },
  { value: "student", label: "🎓 Student Loan" },
  { value: "personal", label: "💰 Personal Loan" },
  { value: "credit_card", label: "💳 Credit Card" },
  { value: "medical", label: "🏥 Medical" },
  { value: "other", label: "📋 Other" },
];

export default function EditLoanForm({ loan, onSave }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: loan.name || "",
    lender: loan.lender || "",
    original_amount: loan.original_amount || "",
    current_balance: loan.current_balance || "",
    interest_rate: loan.interest_rate || "",
    monthly_payment: loan.monthly_payment || "",
    due_day: loan.due_day || "",
    start_date: loan.start_date || "",
    category: loan.category || "personal",
    notes: loan.notes || "",
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      ...form,
      original_amount: parseFloat(form.original_amount) || 0,
      current_balance: parseFloat(form.current_balance) || 0,
      interest_rate: parseFloat(form.interest_rate) || 0,
      monthly_payment: parseFloat(form.monthly_payment) || 0,
      due_day: parseInt(form.due_day) || null,
    });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-2">
      <div>
        <Label className="text-xs text-muted-foreground">Name</Label>
        <Input value={form.name} onChange={(e) => handleChange("name", e.target.value)} required className="mt-1 rounded-xl" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Lender</Label>
        <Input value={form.lender} onChange={(e) => handleChange("lender", e.target.value)} className="mt-1 rounded-xl" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Category</Label>
        <Select value={form.category} onValueChange={(v) => handleChange("category", v)}>
          <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Original Amount</Label>
          <Input type="number" step="0.01" value={form.original_amount} onChange={(e) => handleChange("original_amount", e.target.value)} className="mt-1 rounded-xl" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Current Balance</Label>
          <Input type="number" step="0.01" value={form.current_balance} onChange={(e) => handleChange("current_balance", e.target.value)} className="mt-1 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Interest Rate (%)</Label>
          <Input type="number" step="0.01" value={form.interest_rate} onChange={(e) => handleChange("interest_rate", e.target.value)} className="mt-1 rounded-xl" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Monthly Payment</Label>
          <Input type="number" step="0.01" value={form.monthly_payment} onChange={(e) => handleChange("monthly_payment", e.target.value)} className="mt-1 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Due Day (1-31)</Label>
          <Input type="number" min="1" max="31" value={form.due_day} onChange={(e) => handleChange("due_day", e.target.value)} className="mt-1 rounded-xl" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Start Date</Label>
          <Input type="date" value={form.start_date} onChange={(e) => handleChange("start_date", e.target.value)} className="mt-1 rounded-xl" />
        </div>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Notes</Label>
        <Textarea value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} className="mt-1 rounded-xl" rows={2} />
      </div>
      <Button type="submit" disabled={saving} className="w-full rounded-xl">
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}