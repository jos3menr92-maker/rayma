import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { ChevronLeft, Save, AlertTriangle, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { createRecord } from "@/lib/supabaseHelpers";
import { useCurrency } from "@/hooks/useCurrency";
import LogSuggestionStrip from "@/components/forms/LogSuggestionStrip";
import { computeLoanPreview } from "@/utils/logPreviewMath";
import { suggestPayment, suggestDefaults, getLoanMode } from "@/utils/loanEngine";
import LoanTypeAttributesFields from "@/components/LoanTypeAttributesFields";

const DOW = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const CATEGORIES = [
  { value: "mortgage", emoji: "🏠" },
  { value: "auto", emoji: "🚗" },
  { value: "student", emoji: "🎓" },
  { value: "personal", emoji: "💰" },
  { value: "credit_card", emoji: "💳" },
  { value: "line_of_credit", emoji: "🏦" },
  { value: "lease", emoji: "🔑" },
  { value: "bankruptcy", emoji: "⚖️" },
  { value: "medical", emoji: "🏥" },
  { value: "other", emoji: "📋" },
];

export default function AddLoan() {
  const navigate = useNavigate();
  const { reload } = useFinancialData();
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => {
    const translated = t(lang, key);
    return translated !== key ? translated : fallback;
  }, [lang]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    lender: "",
    category: "personal",
    original_amount: "",
    current_balance: "",
    interest_rate: "",
    monthly_payment: "",
    payment_amount_type: "per_period",
    payment_frequency: "monthly",
    term_months: "",
    due_day: "",
    due_day_of_week: "Friday",
    start_date: new Date().toISOString().split("T")[0],
    loan_type_attributes: {},
    notes: "",
  });

  const { formatCurrency: fmt } = useCurrency();
  const mode = getLoanMode(form.category);

  // Live preview from the shared preview helper (keeps the suggestion strip consistent)
  const loanPreview = useMemo(() => computeLoanPreview(form, { fmt, T, locale: lang === "es" ? "es" : "en-US" }), [form, fmt, T, lang]);

  // Category-aware suggestion chips: suggest APR + term + payment from the engine
  const engineChips = useMemo(() => {
    const chips = [];
    const balance = parseFloat(form.current_balance) || parseFloat(form.original_amount) || 0;
    const defaults = suggestDefaults(form.category);

    // APR chip — only if rate is empty and category has a meaningful default
    if (!form.interest_rate && defaults.rate > 0) {
      chips.push({
        label: T("suggestApr", "Suggest {n}% APR").replace("{n}", defaults.rate),
        field: "interest_rate",
        value: String(defaults.rate),
      });
    }

    // Term chip — for amortizing loans only (credit cards are revolving, no term)
    if (mode === "amortizing" && !form.term_months && defaults.term) {
      chips.push({
        label: T("suggestTerm", "Suggest {n}-mo term").replace("{n}", defaults.term),
        field: "term_months",
        value: String(defaults.term),
      });
    }

    // Payment chip — derive from engine when balance is known and payment is empty
    if (balance > 0 && !form.monthly_payment) {
      const { suggestedPayment } = suggestPayment(form.category, balance);
      if (suggestedPayment > 0) {
        chips.push({
          label: T("suggestPayment", "Suggest {n}/mo").replace("{n}", fmt(suggestedPayment)),
          field: "monthly_payment",
          value: String(suggestedPayment.toFixed(2)),
        });
      }
    }
    return chips;
  }, [form, mode, fmt, T]);

  // Merge engine chips into the preview so LogSuggestionStrip renders them
  const mergedPreview = useMemo(() => ({
    lines: loanPreview.lines,
    chips: [...(loanPreview.chips || []), ...engineChips],
  }), [loanPreview, engineChips]);

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleAccept(field, value) {
    handleChange(field, value);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const balance = parseFloat(form.current_balance) || parseFloat(form.original_amount) || 0;
      const original = parseFloat(form.original_amount) || balance;

      const payload = {
        name: form.name || "Unnamed Loan",
        lender: form.lender || null,
        category: form.category,
        original_amount: original,
        current_balance: balance,
        interest_rate: parseFloat(form.interest_rate) || 0,
        monthly_payment: parseFloat(form.monthly_payment) || 0,
        payment_amount_type: form.payment_amount_type || "per_period",
        payment_frequency: form.payment_frequency,
        term_months: mode === "amortizing" ? (parseInt(form.term_months) || null) : null,
        due_day: form.payment_frequency === "monthly" ? (parseInt(form.due_day) || null) : null,
        due_day_of_week: form.payment_frequency !== "monthly" ? form.due_day_of_week : null,
        start_date: form.start_date || null,
        loan_type_attributes: form.loan_type_attributes || {},
        notes: form.notes || null,
        status: "active",
      };

      await createRecord("loans", payload);
      await reload();
      navigate("/loans");
    } catch (error) {
      console.error("Failed to add loan:", error);
      setErrorMsg(error.message || "Failed to save the loan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold font-heading text-foreground">{T("addNewLoan", "Add New Loan")}</h1>
      </motion.div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive font-medium">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category picker — drives everything below */}
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">{T("category", "Category")}</Label>
          <Select value={form.category} onValueChange={(v) => handleChange("category", v)}>
            <SelectTrigger className="w-full h-[50px] rounded-2xl bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.emoji} {T(`cat_${c.value}`, c.value)}
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

        {/* Term — only for amortizing loans (credit cards are revolving) */}
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

        <LoanTypeAttributesFields
          category={form.category}
          attributes={form.loan_type_attributes || {}}
          onChange={(attrs) => handleChange("loan_type_attributes", attrs)}
          T={T}
        />

        <LogSuggestionStrip preview={mergedPreview} onAccept={handleAccept} />

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <><Save className="w-5 h-5" /> {T("saveLoan", "Save Loan")}</>
          )}
        </button>
      </form>
    </div>
  );
}