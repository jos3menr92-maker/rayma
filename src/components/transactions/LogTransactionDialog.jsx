import { useState, useMemo } from "react";
import { createRecord, updateRecord } from "@/lib/supabaseHelpers";
import { useT } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownCircle, ArrowUpCircle, Loader2, Wallet } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import LogSuggestionStrip from "@/components/forms/LogSuggestionStrip";
import { computeTransactionPreview } from "@/utils/logPreviewMath";

const CATEGORIES = [
  "income", "food", "transport", "utilities", "subscriptions", "health",
  "insurance", "rent", "loan_payment", "savings", "entertainment", "shopping", "other"
];

export function LogTransactionDialog({ accounts, defaultAccountId, onClose, onSaved }) {
  const T = useT();
  const { formatCurrency: fmt } = useCurrency();
  const { toast } = useToast();
  const [direction, setDirection] = useState("out"); // "out" = expense, "in" = income
  const [form, setForm] = useState({
    bank_account_id: defaultAccountId || "",
    date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    amount: "",
    category: "other",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const selectedAccount = accounts.find(a => a.id === form.bank_account_id);
  const rawAmount = parseFloat(form.amount) || 0;
  const amountNum = Math.abs(rawAmount);
  const signedAmount = direction === "out" ? -amountNum : amountNum;
  const previewBalance =
    selectedAccount != null ? (selectedAccount.balance || 0) + signedAmount : null;

  const canSave = !!form.bank_account_id && amountNum > 0 && form.description.trim().length > 0;

  const txPreview = useMemo(() => computeTransactionPreview(form, { fmt, T }), [form, fmt, T]);
  const acceptSuggestion = (field, value) => setField(field, value);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAmountChange = (e) => {
    // Always keep the typed amount positive — direction toggle controls the sign.
    const val = e.target.value;
    const positive = val.startsWith("-") ? val.slice(1) : val;
    setField("amount", positive);
  };

  const save = async () => {
    if (!canSave) {
      toast({ title: T("fillRequired", "Please fill in account, vendor and amount.") });
      return;
    }
    setSaving(true);
    try {
      await createRecord("transactions", {
        bank_account_id: form.bank_account_id,
        date: form.date,
        description: form.description.trim(),
        amount: signedAmount,
        category: direction === "in" ? "income" : form.category,
        type: direction === "out" ? "debit" : "credit",
        notes: form.notes || null,
      });

      // Adjust the linked account balance so the "link" is real
      if (selectedAccount) {
        await updateRecord("bank_accounts", selectedAccount.id, {
          balance: (selectedAccount.balance || 0) + signedAmount,
          last_synced: format(new Date(), "yyyy-MM-dd"),
        });
      }

      toast({
        title: T("transactionLogged", "Transaction logged"),
        description: `${form.description.trim()} · ${signedAmount >= 0 ? "+" : ""}${fmt(signedAmount)}`,
      });
      onSaved?.();
    } catch (err) {
      console.error("LogTransaction error:", err.message);
      toast({ title: T("saveFailed", "Save failed"), description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-border max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{T("logTransaction", "Log Transaction")}</DialogTitle>
        </DialogHeader>

        {/* Direction toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDirection("out")}
            className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-all ${
              direction === "out"
                ? "border-destructive/60 bg-destructive/10 text-destructive"
                : "border-border text-muted-foreground"
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            {T("moneyOut", "Money Out")}
          </button>
          <button
            type="button"
            onClick={() => setDirection("in")}
            className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-all ${
              direction === "in"
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" />
            {T("moneyIn", "Money In")}
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <Label>{T("account", "Account")}</Label>
            <Select value={form.bank_account_id} onValueChange={v => setField("bank_account_id", v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={T("selectAccount", "Select account")} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{T("vendorOrSource", "Vendor / Source")}</Label>
            <Input
              className="mt-1"
              value={form.description}
              onChange={e => setField("description", e.target.value)}
              placeholder={direction === "out"
                ? T("vendorExpensePlaceholder", "e.g. Walmart, Shell, Netflix")
                : T("vendorIncomePlaceholder", "e.g. Paycheck, Freelance, Refund")}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>{T("amount", "Amount")}</Label>
              <Input
                className="mt-1"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={handleAmountChange}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>{T("date", "Date")}</Label>
              <Input className="mt-1" type="date" value={form.date} onChange={e => setField("date", e.target.value)} />
            </div>
          </div>

          {direction === "out" && (
            <div>
              <Label>{T("category", "Category")}</Label>
              <Select value={form.category} onValueChange={v => setField("category", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter(c => c !== "income").map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Live balance preview */}
          {selectedAccount && (
            <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Wallet className="w-3.5 h-3.5" />
                <span className="font-medium text-foreground">{selectedAccount.name}</span>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{T("balanceAfter", "Balance after")}</p>
                <p className={`text-sm font-bold ${previewBalance < 0 ? "text-destructive" : "text-foreground"}`}>
                  {fmt(previewBalance)}
                </p>
              </div>
            </div>
          )}
          <LogSuggestionStrip preview={txPreview} onAccept={acceptSuggestion} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{T("cancel", "Cancel")}</Button>
          <Button onClick={save} disabled={!canSave || saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {T("logTransaction", "Log Transaction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LogTransactionDialog;