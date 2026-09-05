import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { useCurrency } from "@/hooks/useCurrency";
import LogSuggestionStrip from "@/components/forms/LogSuggestionStrip";
import { computeLoanPreview } from "@/utils/logPreviewMath";
import { suggestPayment, suggestDefaults, getLoanMode } from "@/utils/loanEngine";
import LoanTypeAttributesFields from "@/components/LoanTypeAttributesFields";

const DOW = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Mirrors AddLoan's CATEGORIES so both pages show identical, translated labels
const CATEGORIES = [
  { value: "mortgage", emoji: "🏠", key: "catMortgage" },
  { value: "auto", emoji: "🚗", key: "catAuto" },
  { value: "student", emoji: "🎓", key: "catStudent" },
  { value: "personal", emoji: "💰", key: "catPersonal" },
  { value: "credit_card", emoji: "💳", key: "catCreditCard" },
  { value: "line_of_credit", emoji: "🏦", key: "catLineOfCredit" },
  { value: "lease", emoji: "🔑", key: "catLease" },
  { value: "bankruptcy", emoji: "⚖️", key: "catBankruptcy" },
  { value: "medical", emoji: "🏥", key: "catMedical" },
  { value: "other", emoji: "📋", key: "catOther" },
];

export default function EditLoanForm({ loan, onSave }) {
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: loan.name || "",
    lender: loan.lender || "",
    original_amount: loan.original_amount || "",
    current_balance: loan.current_balance || "",
    interest_rate: loan.interest_rate || "",
    monthly_payment: loan.monthly_payment || "",
    payment_amount_type: loan.payment_amount_type || "per_period",
    payment_frequency: loan.payment_frequency || "monthly",
    due_day: loan.due_day || "",
    due_day_of_week: loan.due_day_of_week || "Friday",
    start_date: loan.start_date || "",
    category: loan.category || "personal",
    term_months: loan.term_months || "",
    loan_type_attributes: loan.loan_type_attributes || {},
    notes: loan.notes || "",
  });

  const mode = getLoanMode(form.category);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const { formatCurrency: fmt } = useCurrency();
  const loanPreview = useMemo(() => computeLoanPreview(form, { fmt, T, locale: lang === "es" ? "es" : "en-US" }), [form, fmt, T, lang]);

  // Category-aware suggestion chips from the shared engine (same as AddLoan)
  const engineChips = useMemo(() => {
    const chips = [];
    const balance = parseFloat(form.current_balance) || parseFloat(form.original_amount) || 0;
    const defaults = suggestDefaults(form.category);
    if (!form.interest_rate && defaults.rate > 0) {
      chips.push({ label: T("suggestApr", "Suggest {n}% APR").replace("{n}", defaults.rate), field: "interest_rate", value: String(defaults.rate) });
    }
    if (mode === "amortizing" && !form.term_months && defaults.term) {
      chips.push({ label: T("suggestTerm", "Suggest {n}-mo term").replace("{n}", defaults.term), field: "term_months", value: String(defaults.term) });
    }
    if (balance > 0 && !form.monthly_payment) {
      const { suggestedPayment } = suggestPayment(form.category, balance);
      if (suggestedPayment > 0) {
        chips.push({ label: T("suggestPayment", "Suggest {n}/mo").replace("{n}", fmt(suggestedPayment)), field: "monthly_payment", value: String(suggestedPayment.toFixed(2)) });
      }
    }
    return chips;
  }, [form, mode, fmt, T]);

  const mergedPreview = useMemo(() => ({ lines: loanPreview.lines, chips: [...(loanPreview.chips || []), ...engineChips] }), [loanPreview, engineChips]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      ...form,
      original_amount: parseFloat(form.original_amount) || 0,
      current_balance: parseFloat(form.current_balance) || 0,
      interest_rate: parseFloat(form.interest_rate) || 0,
      monthly_payment: parseFloat(form.monthly_payment) || 0,
      term_months: mode === "amortizing" ? (parseInt(form.term_months) || null) : null,
      due_day: form.payment_frequency === "monthly" ? (parseInt(form.due_day) || null) : null,
      due_day_of_week: form.payment_frequency !== "monthly" ? form.due_day_of_week : null,
    });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-foreground">{T("category", "Category")}</Label>
        <Select value={form.category} onValueChange={(v) => handleChange("category", v)}>
          <SelectTrigger className="w-full h-[50px] rounded-2xl bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.emoji} {T(c.key, c.value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">{T("loanName", "Loan Name")}</Label>
          <Input
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder={T("loanNameEx", "e.g. Chase Auto Loan")}
            className="rounded-2xl bg-card border-border"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">{T("lenderLabel", "Lender")}</Label>
          <Input
            value={form.lender}
            onChange={(e) => handleChange("lender", e.target.value)}
            placeholder={T("lenderEx", "e.g. Chase")}
            className="rounded-2xl bg-card border-border"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">{T("originalAmount", "Original Amount")}</Label>
          <Input
            type="number"
            step="0.01"
            value={form.original_amount}
            onChange={(e) => handleChange("original_amount", e.target.value)}
            placeholder="$0.00"
            className="rounded-2xl bg-card border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">{T("currentBalance", "Current Balance")}</Label>
          <Input
            type="number"
            step="0.01"
            value={form.current_balance}
            onChange={(e) => handleChange("current_balance", e.target.value)}
            placeholder="$0.00"
            className="rounded-2xl bg-card border-border"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-foreground">{T("interestRatePct", "Interest Rate (%)")}</Label>
            <Sparkles className="w-3 h-3 text-primary/50" />
          </div>
          <Input
            type="number"
            step="0.01"
            value={form.interest_rate}
            onChange={(e) => handleChange("interest_rate", e.target.value)}
            placeholder={T("raymaWillCalculate", "Rayma AI will calculate")}
            className="rounded-2xl bg-card border-border placeholder:text-primary/40"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">
            {form.payment_frequency === "monthly"
              ? T("monthlyPayment", "Monthly Payment")
              : form.payment_amount_type === "monthly_equivalent"
                ? T("monthlyEquivalentPayment", "Monthly Equivalent Payment")
                : T("perPeriodPayment", "Payment (per period)")}
          </Label>
          <Input
            type="number"
            step="0.01"
            value={form.monthly_payment}
            onChange={(e) => handleChange("monthly_payment", e.target.value)}
            placeholder="$0.00"
            className="rounded-2xl bg-card border-border"
          />
        </div>
      </div>

      {/* Term + Start Date — only for amortizing loans (same as AddLoan) */}
      {mode === "amortizing" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-foreground">{T("termMonths", "Term (months)")}</Label>
              <Sparkles className="w-3 h-3 text-primary/50" />
            </div>
            <Input
              type="number"
              value={form.term_months}
              onChange={(e) => handleChange("term_months", e.target.value)}
              placeholder={T("termEx", "e.g. 60")}
              className="rounded-2xl bg-card border-border placeholder:text-primary/40"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-foreground">{T("startDate", "Start Date")}</Label>
            <Input
              type="date"
              value={form.start_date}
              onChange={(e) => handleChange("start_date", e.target.value)}
              className="rounded-2xl bg-card border-border"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">{T("paymentFrequency", "Payment Frequency")}</Label>
          <Select value={form.payment_frequency} onValueChange={(v) => handleChange("payment_frequency", v)}>
            <SelectTrigger className="w-full h-[50px] rounded-2xl bg-card border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">{T("monthly", "Monthly")}</SelectItem>
              <SelectItem value="biweekly">{T("biweekly", "Bi-Weekly")}</SelectItem>
              <SelectItem value="weekly">{T("weekly", "Weekly")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.payment_frequency === "monthly" ? (
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-foreground">{T("dueDayMonth", "Due Day (1-31)")}</Label>
            <Input
              type="number"
              min="1"
              max="31"
              value={form.due_day}
              onChange={(e) => handleChange("due_day", e.target.value)}
              placeholder="15"
              className="rounded-2xl bg-card border-border"
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-foreground">{T("dueDayWeek", "Due Day of Week")}</Label>
            <Select value={form.due_day_of_week} onValueChange={(v) => handleChange("due_day_of_week", v)}>
              <SelectTrigger className="w-full h-[50px] rounded-2xl bg-card border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOW.map((d) => <SelectItem key={d} value={d}>{T(`day${d}`, d)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {form.payment_frequency !== "monthly" && (
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">{T("paymentAmountType", "Payment Amount Type")}</Label>
          <Select value={form.payment_amount_type} onValueChange={(v) => handleChange("payment_amount_type", v)}>
            <SelectTrigger className="w-full h-[50px] rounded-2xl bg-card border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="per_period">{T("perPeriod", "Per period")}</SelectItem>
              <SelectItem value="monthly_equivalent">{T("monthlyEquivalent", "Monthly equivalent")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-foreground">{T("notes", "Notes")}</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          className="rounded-2xl bg-card border-border"
          rows={2}
        />
      </div>

      <LoanTypeAttributesFields
        category={form.category}
        attributes={form.loan_type_attributes || {}}
        onChange={(attrs) => handleChange("loan_type_attributes", attrs)}
        T={T}
      />

      <LogSuggestionStrip preview={mergedPreview} onAccept={handleChange} />

      <button
        type="submit"
        disabled={saving}
        className="w-full mt-2 flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50"
      >
        {saving ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <><Save className="w-5 h-5" /> {T("saveChanges", "Save Changes")}</>
        )}
      </button>
    </form>
  );
}