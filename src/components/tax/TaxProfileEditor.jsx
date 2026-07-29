import { useState, useMemo } from "react";
import { Users, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

export const TAX_EVENT_TYPES = {
  solar: { label: "Solar Installation", emoji: "☀️", treatment: "credit", rate: 0.30 },
  ev_purchase: { label: "Electric Vehicle", emoji: "🚗", treatment: "credit", rate: 0.30, max: 7500 },
  education: { label: "Education Expenses", emoji: "🎓", treatment: "credit", rate: 0.20, max: 2000 },
  energy_efficient: { label: "Energy Efficient Home", emoji: "⚡", treatment: "credit", rate: 0.10, max: 1200 },
  first_home: { label: "First Home Purchase", emoji: "🏠", treatment: "info" },
  charitable: { label: "Charitable Donations", emoji: "❤️", treatment: "deduction" },
  medical_large: { label: "Large Medical Expenses", emoji: "🏥", treatment: "deduction" },
  other: { label: "Other", emoji: "📌", treatment: "info" },
};

export default function TaxProfileEditor({ profile, onProfileChange }) {
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const tr = t(lang, key); return tr !== key ? tr : fallback; }, [lang]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ event_type: "solar", amount: "", date: "", description: "" });

  const filingStatus = profile?.filing_status || "single";
  const dependents = profile?.dependents || 0;
  const taxEvents = profile?.tax_events || [];

  function updateFilingStatus(status) {
    onProfileChange({ ...profile, filing_status: status });
  }

  function updateDependents(delta) {
    onProfileChange({ ...profile, dependents: Math.max(0, dependents + delta) });
  }

  function addEvent() {
    onProfileChange({
      ...profile,
      tax_events: [...taxEvents, { ...newEvent, amount: Number(newEvent.amount) || 0 }],
    });
    setNewEvent({ event_type: "solar", amount: "", date: "", description: "" });
    setDialogOpen(false);
  }

  function removeEvent(index) {
    onProfileChange({ ...profile, tax_events: taxEvents.filter((_, i) => i !== index) });
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">{T("yourTaxProfile", "Your Tax Profile")}</p>
      </div>

      {/* Filing Status */}
      <p className="text-xs text-muted-foreground mb-2">{T("filingStatus", "Filing Status")}</p>
      <div className="flex gap-2 mb-4">
        {[
          { id: "single", label: T("filingSingle", "Single") },
          { id: "married", label: T("filingMarried", "Married Joint") },
          { id: "head_of_household", label: T("filingHOH", "Head of HH") },
        ].map(s => (
          <button
            key={s.id}
            onClick={() => updateFilingStatus(s.id)}
            className={`flex-1 px-2 py-2 rounded-xl text-xs font-semibold transition-all border ${
              filingStatus === s.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Dependents */}
      <p className="text-xs text-muted-foreground mb-2">{T("dependents", "Dependents (children under 17)")}</p>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => updateDependents(-1)}
          className="w-9 h-9 rounded-xl bg-background border border-border flex items-center justify-center text-lg text-foreground hover:border-primary/40 transition-all"
        >−</button>
        <span className="text-2xl font-bold text-foreground w-8 text-center">{dependents}</span>
        <button
          onClick={() => updateDependents(1)}
          className="w-9 h-9 rounded-xl bg-background border border-border flex items-center justify-center text-lg text-foreground hover:border-primary/40 transition-all"
        >+</button>
        <span className="text-xs text-muted-foreground">{T("childTaxCreditHint", "$2,000 credit per child")}</span>
      </div>

      {/* Tax Events */}
      <p className="text-xs text-muted-foreground mb-2">{T("taxEvents", "Major Purchases & Tax Events")}</p>
      {taxEvents.length === 0 ? (
        <p className="text-xs text-muted-foreground mb-2 italic">{T("noTaxEvents", "No tax events added yet")}</p>
      ) : (
        <div className="space-y-2 mb-2">
          {taxEvents.map((event, i) => {
            const info = TAX_EVENT_TYPES[event.event_type] || TAX_EVENT_TYPES.other;
            return (
              <div key={i} className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2">
                <span className="text-lg">{info.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{info.label}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {event.amount > 0 && `$${event.amount.toLocaleString()}`}
                    {event.date && `${event.amount > 0 ? " · " : ""}${event.date}`}
                  </p>
                </div>
                {info.treatment === "credit" && (
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium shrink-0">{T("credit", "Credit")}</span>
                )}
                {info.treatment === "deduction" && (
                  <span className="text-[10px] bg-accent/10 text-accent-foreground px-1.5 py-0.5 rounded-full font-medium shrink-0">{T("deduction", "Deduction")}</span>
                )}
                <button onClick={() => removeEvent(i)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full text-xs">
            <Plus className="w-3.5 h-3.5" /> {T("addTaxEvent", "Add Tax Event")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{T("addTaxEvent", "Add Tax Event")}</DialogTitle>
            <DialogDescription>{T("addTaxEventDesc", "Add a major purchase or event that affects your taxes")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">{T("eventType", "Event Type")}</Label>
              <Select value={newEvent.event_type} onValueChange={v => setNewEvent({ ...newEvent, event_type: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TAX_EVENT_TYPES).map(([key, info]) => (
                    <SelectItem key={key} value={key}>{info.emoji} {info.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{T("amount", "Amount")}</Label>
              <Input type="number" value={newEvent.amount} onChange={e => setNewEvent({ ...newEvent, amount: e.target.value })} placeholder="0" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">{T("date", "Date")}</Label>
              <Input type="date" value={newEvent.date} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">{T("descriptionOptional", "Description (optional)")}</Label>
              <Input value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{T("cancel", "Cancel")}</Button>
            <Button onClick={addEvent}>{T("addEvent", "Add Event")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}