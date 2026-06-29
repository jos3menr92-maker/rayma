import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

const DOW = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export default function EditLoanForm({ loan, onSave }) {
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);

  const categories = [
    { value: "mortgage", label: `🏠 ${T("catMortgage", "Mortgage")}` },
    { value: "auto", label: `🚗 ${T("catAuto", "Auto Loan")}` },
    { value: "student", label: `🎓 ${T("catStudent", "Student Loan")}` },
    { value: "personal", label: `💰 ${T("catPersonal", "Personal Loan")}` },
    { value: "credit_card", label: `💳 ${T("catCreditCard", "Credit Card")}` },
    { value: "medical", label: `🏥 ${T("catMedical", "Medical")}` },
    { value: "other", label: `📋 ${T("catOther", "Other")}` },
  ];

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: loan.name || "",
    lender: loan.lender || "",
    original_amount: loan.original_amount || "",
    current_balance: loan.current_balance || "",
    interest_rate: loan.interest_rate || "",
    monthly_payment: loan.monthly_payment || "",
    payment_frequency: loan.payment_frequency || "monthly",
    due_day: loan.due_day || "",
    due_day_of_week: loan.due_day_of_week || "Friday",
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
      due_day: form.payment_frequency === "monthly" ? (parseInt(form.due_day) || null) : null,
      due_day_of_week: form.payment_frequency !== "monthly" ? form.due_day_of_week : null,
    });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-2">
      <div>
        <Label className="text-xs text-muted-foreground">{T("name", "Name *")}</Label>
        <Input value={form.name} onChange={(e) => handleChange("name", e.target.value)} required className="mt-1 rounded-xl" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">{T("lenderLabel", "Lender")}</Label>
        <Input value={form.lender} onChange={(e) => handleChange("lender", e.target.value)} className="mt-1 rounded-xl" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">{T("category", "Category")}</Label>
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
          <Label className="text-xs text-muted-foreground">{T("originalAmount", "Original Amount")}</Label>
          <Input type="number" step="0.01" value={form.original_amount} onChange={(e) => handleChange("original_amount", e.target.value)} className="mt-1 rounded-xl" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">{T("currentBalance", "Current Balance")}</Label>
          <Input type="number" step="0.01" value={form.current_balance} onChange={(e) => handleChange("current_balance", e.target.value)} className="mt-1 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">{T("interestRatePct", "Interest Rate (%)")}</Label>
          <Input type="number" step="0.01" value={form.interest_rate} onChange={(e) => handleChange("interest_rate", e.target.value)} className="mt-1 rounded-xl" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">{T("monthlyPayment", "Monthly Payment")}</Label>
          <Input type="number" step="0.01" value={form.monthly_payment} onChange={(e) => handleChange("monthly_payment", e.target.value)} className="mt-1 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">{T("paymentFrequency", "Payment Frequency")}</Label>
          <Select value={form.payment_frequency} onValueChange={(v) => handleChange("payment_frequency", v)}>
            <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">{T("monthly", "Monthly")}</SelectItem>
              <SelectItem value="biweekly">{T("biweekly", "Bi-weekly")}</SelectItem>
              <SelectItem value="weekly">{T("weekly", "Weekly")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">{T("startDate", "Start Date")}</Label>
          <Input type="date" value={form.start_date} onChange={(e) => handleChange("start_date", e.target.value)} className="mt-1 rounded-xl" />
        </div>
      </div>
      {form.payment_frequency === "monthly" ? (
        <div>
          <Label className="text-xs text-muted-foreground">{T("dueDayMonth", "Due Day of Month (1-31)")}</Label>
          <Input type="number" min="1" max="31" value={form.due_day} onChange={(e) => handleChange("due_day", e.target.value)} className="mt-1 rounded-xl" />
        </div>
      ) : (
        <div>
          <Label className="text-xs text-muted-foreground">{T("dueDayWeek", "Due Day of Week")}</Label>
          <Select value={form.due_day_of_week} onValueChange={(v) => handleChange("due_day_of_week", v)}>
            <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOW.map(d => <SelectItem key={d} value={d}>{T(`day${d}`, d)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <Label className="text-xs text-muted-foreground">{T("notes", "Notes")}</Label>
        <Textarea value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} className="mt-1 rounded-xl" rows={2} />
      </div>
      <Button type="submit" disabled={saving} className="w-full rounded-xl">
        {saving ? T("saving", "Saving...") : T("saveChanges", "Save Changes")}
      </Button>
    </form>
  );
}