import { useState, useMemo, useRef } from "react";
import { createRecord } from "@/lib/supabaseHelpers";
import { base44 } from "@/api/base44Client";
import { useT } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, Sparkles, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const SPLIT_CATEGORIES = [
  "food", "transport", "utilities", "subscriptions", "health", "insurance",
  "rent", "loan_payment", "savings", "entertainment", "shopping", "other"
];

const CATEGORY_KEYWORDS = {
  food: ["grocery", "groceries", "food", "restaurant", "market", "snack", "coffee", "bakery", "produce", "meat", "dairy", "deli"],
  transport: ["gas", "fuel", "gasoline", "uber", "lyft", "transit", "parking", "taxi", "bus", "train", "car", "auto"],
  utilities: ["electric", "electricity", "water", "gas bill", "internet", "cable", "phone", "utility", "utilities"],
  subscriptions: ["subscription", "netflix", "spotify", "hulu", "disney", "membership", "streaming"],
  health: ["pharmacy", "drug", "medicine", "health", "dental", "doctor", "clinic", "vitamin", "prescription", "medical"],
  insurance: ["insurance", "premium", "policy"],
  rent: ["rent", "mortgage", "lease"],
  loan_payment: ["loan", "interest", "principal"],
  savings: ["savings", "transfer", "deposit"],
  entertainment: ["movie", "game", "ticket", "concert", "entertainment", "theater"],
  shopping: ["clothing", "apparel", "store", "mall", "electronics", "household", "home goods", "walmart", "target", "amazon", "cosmetic", "toy"],
};

function matchCategory(raw) {
  if (!raw) return "other";
  const r = String(raw).toLowerCase().trim();
  if (SPLIT_CATEGORIES.includes(r)) return r;
  for (const [cat, keys] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keys.some(k => r.includes(k))) return cat;
  }
  return "other";
}

export function SplitTransactionDialog({ tx, onClose, onSaved, onError }) {
  const T = useT();
  const { formatCurrency: fmt } = useCurrency();
  const { toast } = useToast();
  const [splits, setSplits] = useState([
    { amount: "", category: tx?.category && tx.category !== "income" ? tx.category : "other", note: "" }
  ]);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef(null);

  const totalAmount = Math.abs(tx?.amount || 0);

  const allocated = useMemo(
    () => splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0),
    [splits]
  );
  const remaining = totalAmount - allocated;
  const pct = totalAmount > 0 ? Math.min(100, (allocated / totalAmount) * 100) : 0;
  const isValid =
    Math.abs(remaining) < 0.01 &&
    splits.length >= 2 &&
    splits.every(sp => parseFloat(sp.amount) > 0);

  const updateSplit = (idx, field, value) =>
    setSplits(prev => prev.map((sp, i) => (i === idx ? { ...sp, [field]: value } : sp)));

  const addSplit = () =>
    setSplits(prev => [...prev, { amount: "", category: "other", note: "" }]);

  const removeSplit = (idx) =>
    setSplits(prev => prev.filter((_, i) => i !== idx));

  const splitEvenly = () => {
    if (splits.length < 2) return;
    const share = totalAmount / splits.length;
    setSplits(prev => prev.map(sp => ({ ...sp, amount: share.toFixed(2) })));
  };

  const handleReceipt = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
      const up = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = up?.file_url;
      if (!fileUrl) throw new Error("Upload failed");

      const res = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: {
          type: "object",
          properties: {
            merchant: { type: "string" },
            total: { type: "number" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  amount: { type: "number" },
                  suggested_category: { type: "string" }
                }
              }
            }
          }
        }
      });

      const out = res?.output ?? res;
      const items = Array.isArray(out?.items) ? out.items : [];

      if (items.length >= 2) {
        const mapped = items.map(it => ({
          amount: String(Math.abs(it.amount || 0)),
          category: matchCategory(it.suggested_category || it.description),
          note: it.description || "",
        }));
        setSplits(mapped);
        toast({
          title: T("raymaAssistDone", "Rayma categorized your receipt!"),
          description: T("raymaAssistReview", "Review the splits and tap Save."),
        });
      } else {
        toast({
          title: T("raymaAssistNoItems", "Couldn't read clear line items"),
          description: T("raymaAssistManual", "You can split it manually below."),
        });
      }
    } catch (err) {
      console.error("Rayma Assist error:", err.message);
      toast({
        title: T("raymaAssistError", "Receipt scan failed"),
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      for (const sp of splits) {
        await createRecord("transaction_splits", {
          transaction_id: tx.id,
          amount: parseFloat(sp.amount) || 0,
          category: sp.category,
          note: sp.note || null,
          date: tx.date || null,
        });
      }
      onSaved?.(tx.id);
    } catch (err) {
      console.error("Split save error:", err.message);
      onError?.(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remainingLabel =
    Math.abs(remaining) < 0.01
      ? T("fullyAllocated", "Fully allocated")
      : remaining > 0
        ? T("leftToCategorize", "{n} left to categorize").replace("{n}", fmt(remaining))
        : T("overAllocated", "{n} over the total").replace("{n}", fmt(Math.abs(remaining)));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-border max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{T("distributeTransaction", "Distribute Transaction")}</DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="bg-muted/50 rounded-xl p-3">
          <p className="text-xs text-muted-foreground">
            {T("distributingPurchase", "Distributing your purchase at")}
            <span className="font-medium text-foreground"> {tx?.description || "—"}</span>
          </p>
          <p className="text-lg font-bold font-heading text-foreground mt-0.5">{fmt(totalAmount)}</p>
        </div>

        {/* Rayma Assist */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">{T("raymaAssist", "Rayma Assist")}</p>
                <p className="text-xs text-muted-foreground">{T("raymaAssistDesc", "Scan the receipt and Rayma splits it for you")}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={scanning}
            >
              {scanning ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
              {T("scanReceipt", "Scan Receipt")}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleReceipt}
            />
          </div>
        </div>

        {/* Splits */}
        <div className="space-y-3">
          {splits.map((sp, idx) => (
            <div key={idx} className="flex items-end gap-2">
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-muted-foreground block mb-1">{T("amount", "Amount")}</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={sp.amount}
                  onChange={e => updateSplit(idx, "amount", e.target.value)}
                  className="rounded-xl"
                  placeholder="0.00"
                />
              </div>
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-muted-foreground block mb-1">{T("category", "Category")}</Label>
                <Select value={sp.category} onValueChange={v => updateSplit(idx, "category", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SPLIT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {splits.length > 1 && (
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeSplit(idx)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button onClick={addSplit} className="flex items-center gap-1 text-sm text-primary font-medium">
            <Plus className="w-4 h-4" /> {T("addSplit", "Add Split")}
          </button>
          {splits.length >= 2 && (
            <button onClick={splitEvenly} className="text-xs text-muted-foreground hover:text-foreground">
              {T("splitEvenly", "Split evenly")}
            </button>
          )}
        </div>

        {/* Progress */}
        <div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all ${Math.abs(remaining) < 0.01 ? "bg-primary" : "bg-primary/60"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5 text-xs">
            <span className="text-muted-foreground">{T("allocated", "Allocated")}</span>
            <span className={Math.abs(remaining) < 0.01 ? "text-primary font-semibold flex items-center gap-1" : "text-destructive font-semibold"}>
              {Math.abs(remaining) < 0.01 && <Check className="w-3 h-3" />}
              {remainingLabel}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{T("cancel", "Cancel")}</Button>
          <Button onClick={handleSave} disabled={!isValid || saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {T("saveSplits", "Save Splits")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SplitTransactionDialog;