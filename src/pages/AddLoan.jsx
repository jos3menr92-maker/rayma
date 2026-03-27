import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
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

export default function AddLoan() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    lender: "",
    original_amount: "",
    current_balance: "",
    interest_rate: "",
    monthly_payment: "",
    due_day: "",
    start_date: "",
    category: "personal",
    notes: "",
    status: "active",
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    const data = {
      ...form,
      original_amount: parseFloat(form.original_amount) || 0,
      current_balance: parseFloat(form.current_balance) || parseFloat(form.original_amount) || 0,
      interest_rate: parseFloat(form.interest_rate) || 0,
      monthly_payment: parseFloat(form.monthly_payment) || 0,
      due_day: parseInt(form.due_day) || null,
    };

    await base44.entities.Loan.create(data);
    navigate("/");
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-bold font-heading text-foreground mb-6">
          Add New Loan
        </h1>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Loan Name *</Label>
          <Input
            placeholder="e.g. Car Loan"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
            className="mt-1 rounded-xl"
          />
        </div>

        <div>
          <Label className="text-xs font-medium text-muted-foreground">Lender</Label>
          <Input
            placeholder="e.g. Bank of America"
            value={form.lender}
            onChange={(e) => handleChange("lender", e.target.value)}
            className="mt-1 rounded-xl"
          />
        </div>

        <div>
          <Label className="text-xs font-medium text-muted-foreground">Category</Label>
          <Select value={form.category} onValueChange={(v) => handleChange("category", v)}>
            <SelectTrigger className="mt-1 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Original Amount *</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="$0.00"
              value={form.original_amount}
              onChange={(e) => handleChange("original_amount", e.target.value)}
              required
              className="mt-1 rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Current Balance *</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="$0.00"
              value={form.current_balance}
              onChange={(e) => handleChange("current_balance", e.target.value)}
              required
              className="mt-1 rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Interest Rate (%)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.interest_rate}
              onChange={(e) => handleChange("interest_rate", e.target.value)}
              className="mt-1 rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Monthly Payment</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="$0.00"
              value={form.monthly_payment}
              onChange={(e) => handleChange("monthly_payment", e.target.value)}
              className="mt-1 rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Due Day (1-31)</Label>
            <Input
              type="number"
              min="1"
              max="31"
              placeholder="15"
              value={form.due_day}
              onChange={(e) => handleChange("due_day", e.target.value)}
              className="mt-1 rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Start Date</Label>
            <Input
              type="date"
              value={form.start_date}
              onChange={(e) => handleChange("start_date", e.target.value)}
              className="mt-1 rounded-xl"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
          <Textarea
            placeholder="Any additional notes..."
            value={form.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            className="mt-1 rounded-xl"
            rows={3}
          />
        </div>

        <Button
          type="submit"
          disabled={saving || !form.name || !form.original_amount}
          className="w-full rounded-xl h-12 text-sm font-semibold"
        >
          {saving ? "Saving..." : "Add Loan"}
        </Button>
      </form>
    </div>
  );
}