import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";

const SPLIT_CATEGORIES = [
  "income", "food", "transport", "utilities", "subscriptions", "health",
  "insurance", "rent", "loan_payment", "savings", "entertainment", "shopping", "other"
];

export function SplitTransactionDialog({ tx, supaUser, onClose, onSaved, onError }) {
  const T = useT();
  const { formatCurrency: fmt } = useCurrency();
  const [splits, setSplits] = useState([
    { amount: String(Math.abs(tx?.amount || 0)), category: tx?.category || "other", note: "" }
  ]);
  const [saving, setSaving] = useState(false);

  const totalAmount = Math.abs(tx?.amount || 0);
  const allocated = useMemo(
    () => splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0),
    [splits]
  );
  const remaining = totalAmount - allocated;
  const isValid = Math.abs(remaining) < 0.01 && splits.length >= 2 && splits.every(sp => parseFloat(sp.amount) > 0);

  const updateSplit = (idx, field, value) => {
    setSplits(prev => prev.map((sp, i) => i === idx ? { ...sp, [field]: value } : sp));
  };

  const addSplit = () => {
    setSplits(prev => [...prev, { amount: "", category: "other", note: "" }]);
  };

  const removeSplit = (idx) => {
    setSplits(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!isValid || !supaUser?.id) return;
    setSaving(true);
    try {
      const rows = splits.map(sp => ({
        transaction_id: tx.id,
        user_id: supaUser.id,
        amount: parseFloat(sp.amount) || 0,
        category: sp.category,
        note: sp.note || null,
      }));

      const { error } = await supabase.from("transaction_splits").insert(rows);
      if (error) throw error;

      onSaved?.(tx.id);
    } catch (err) {
      console.error("Split save error:", err.message);
      onError?.(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-border max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{T("splitTransaction", "Split Transaction")}</DialogTitle>
        </DialogHeader>

        <div className="bg-muted/50 rounded-xl p-3 mb-4">
          <p className="text-xs text-muted-foreground">{tx?.description}</p>
          <p className="text-lg font-bold font-heading text-foreground">{fmt(totalAmount)}</p>
        </div>

        <div className="space-y-3">
          {splits.map((sp, idx) => (
            <div key={idx} className="flex items-end gap-2">
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-muted-foreground block mb-1">{T("amount", "Amount")}</Label>
                <Input
                  type="number"
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

        <button onClick={addSplit} className="flex items-center gap-1 text-sm text-primary font-medium mt-2">
          <Plus className="w-4 h-4" /> {T("addSplit", "Add Split")}
        </button>

        <div className={`flex items-center justify-between text-sm pt-2 border-t border-border ${remaining === 0 ? "text-primary" : "text-destructive"}`}>
          <span className="text-muted-foreground">{T("remaining", "Remaining")}</span>
          <span className="font-bold">{fmt(remaining)}</span>
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