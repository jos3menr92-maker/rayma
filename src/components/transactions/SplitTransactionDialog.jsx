import { useState, useMemo } from "react";
import { createRecord } from "@/lib/supabaseHelpers";
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
    if (!isValid) return;
    setSaving(true);
    try {
      for (const split of splits) {
        await createRecord("transaction_splits", {
          transaction_id: tx?.id,
          amount: parseFloat(split.amount),
          category: split.category,
          note: split.note,
          user_id: supaUser?.id
        });
      }
      if (onSaved) onSaved();
    } catch (error) {
      console.error("Error saving splits:", error);
      if (onError) onError(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{T?.splitTransaction || "Split Transaction"}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="flex justify-between items-center text-sm mb-4">
            <span className="font-medium">Total: {fmt(totalAmount)}</span>
            <span className={`font-medium ${Math.abs(remaining) < 0.01 ? "text-green-600" : "text-red-500"}`}>
              Remaining: {fmt(remaining)}
            </span>
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
            {splits.map((split, idx) => (
              <div key={idx} className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-md border">
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={split.amount}
                      onChange={(e) => updateSplit(idx, "amount", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Select value={split.category} onValueChange={(val) => updateSplit(idx, "category", val)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SPLIT_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1 flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">Note</Label>
                    <Input
                      value={split.note}
                      onChange={(e) => updateSplit(idx, "note", e.target.value)}
                      placeholder="Optional note"
                    />
                  </div>
                  {splits.length >= 2 && (
                    <Button variant="ghost" size="icon" onClick={() => removeSplit(idx)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full mt-2" onClick={addSplit}>
            <Plus className="h-4 w-4 mr-2" /> Add Split
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={!isValid || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Splits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SplitTransactionDialog;
