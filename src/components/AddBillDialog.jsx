import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function AddBillDialog({ open, onClose, onSaved }) {
  const { userProfile, reload } = useFinancialData();
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);

  const categories = [
    { value: "utilities", label: `⚡ ${T("catUtilities", "Utilities")}` },
    { value: "subscriptions", label: `📱 ${T("catSubscriptions", "Subscriptions")}` },
    { value: "insurance", label: `🛡️ ${T("catInsurance", "Insurance")}` },
    { value: "rent", label: `🏠 ${T("catRent", "Rent / Housing")}` },
    { value: "food", label: `🍽️ ${T("catFood", "Food")}` },
    { value: "transport", label: `🚗 ${T("catTransport", "Transport")}` },
    { value: "health", label: `🏥 ${T("catHealth", "Health")}` },
    { value: "other", label: `📋 ${T("catOther", "Other")}` },
  ];

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", amount: "", payment_frequency: "monthly", due_day: "", due_day_of_week: "", category: "other", autopay: false, notes: "",
  });

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  const isWeekly = form.payment_frequency === "weekly" || form.payment_frequency === "biweekly";

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    
    const payload = {
      name: form.name,
      user_id: userProfile?.id,
      amount: parseFloat(form.amount) || 0,
      payment_frequency: form.payment_frequency,
      category: form.category,
      notes: form.notes,
      is_active: true,
    };
    
    if (isWeekly) {
      payload.due_day_of_week = form.due_day_of_week;
    } else {
      payload.due_day = parseInt(form.due_day) || null;
    }
    
    await supabase.from('bills').insert([payload]);
    setSaving(false);
    setForm({ name: "", amount: "", payment_frequency: "monthly", due_day: "", due_day_of_week: "", category: "other", autopay: false, notes: "" });
    reload();
    onClose();
    if (onSaved) onSaved();
  }

  const isValid = form.name && form.amount && (isWeekly ? form.due_day_of_week : form.due_day);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{T("addBill", "Add Bill")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-1">
          <div>
            <Label className="text-xs text-muted-foreground">{T("billNameRequired", "Bill Name *")}</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} required placeholder={T("billNamePlaceholder", "e.g. Netflix")} className="mt-1 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">{T("category", "Category")}</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{T("frequencyRequired", "Frequency *")}</Label>
              <Select value={form.payment_frequency} onValueChange={v => set("payment_frequency", v)}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{T("monthly", "Monthly")}</SelectItem>
                  <SelectItem value="weekly">{T("weekly", "Weekly")}</SelectItem>
                  <SelectItem value="biweekly">{T("biweekly", "Biweekly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">{T("amountDollarRequired", "Amount ($) *")}</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={e => set("amount", e.target.value)} required placeholder="0.00" className="mt-1 rounded-xl" />
            </div>
            <div>
              {isWeekly ? (
                <>
                  <Label className="text-xs text-muted-foreground">{T("dueDayWeekRequired", "Due Day of Week *")}</Label>
                  <Select value={form.due_day_of_week} onValueChange={v => set("due_day_of_week", v)}>
                    <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder={T("selectDay", "Select day")} /></SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map(d => <SelectItem key={d} value={d}>{T(`day${d}`, d)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <>
                  <Label className="text-xs text-muted-foreground">{T("dueDayRequired", "Due Day (1-31) *")}</Label>
                  <Input type="number" min="1" max="31" value={form.due_day} onChange={e => set("due_day", e.target.value)} required placeholder="1" className="mt-1 rounded-xl" />
                </>
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{T("notes", "Notes")}</Label>
            <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder={T("optional", "Optional")} className="mt-1 rounded-xl" />
          </div>
          <Button type="submit" disabled={saving || !isValid} className="w-full rounded-xl">
            {saving ? T("saving", "Saving...") : T("addBill", "Add Bill")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}