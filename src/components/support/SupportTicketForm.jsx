import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useT } from "@/lib/LanguageContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Ticket, CheckCircle2 } from "lucide-react";

export default function SupportTicketForm({ onCreated }) {
  const T = useT();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({
    issue_type: "other",
    subject: "",
    description: "",
    order_id: "",
    transaction_date: "",
    contact_preference: "ai_only",
  });

  const ISSUE_TYPES = [
    { value: "payment_failed", label: T("issuePaymentFailed", "Payment Failed") },
    { value: "double_charge", label: T("issueDoubleCharge", "Double Charge") },
    { value: "refund_request", label: T("issueRefund", "Refund Request") },
    { value: "subscription_cancel", label: T("issueSubCancel", "Cancel Subscription") },
    { value: "receipt_missing", label: T("issueReceipt", "Missing Receipt") },
    { value: "billing_error", label: T("issueBillingError", "Billing Error") },
    { value: "other", label: T("issueOther", "Other") },
  ];

  const CONTACT_OPTIONS = [
    { value: "ai_only", label: T("contactAiOnly", "AI follow-up (recommended)") },
    { value: "email", label: T("contactEmail", "Email") },
    { value: "phone", label: T("contactPhone", "Phone") },
  ];

  const handleSubmit = async () => {
    if (!form.subject.trim() || !form.description.trim()) {
      toast({
        title: T("ticketRequiredFields", "Subject and description are required"),
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const count = await base44.entities.SupportTicket.filter({}).then((r) => r.length).catch(() => 0);
      const ticketNumber = 1000 + (count || 0) + 1;
      const record = await base44.entities.SupportTicket.create({
        ...form,
        ticket_number: ticketNumber,
        status: "open",
        ai_attempted: false,
      });
      setSuccess(record);
      if (onCreated) onCreated(record);
      toast({
        title: T("ticketCreated", "Ticket created"),
        description: `#${ticketNumber}`,
      });
    } catch (e) {
      toast({
        title: T("ticketCreateFailed", "Failed to create ticket"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-base font-semibold font-heading text-foreground mb-1">
          {T("ticketSubmitted", "Ticket Submitted!")}
        </h3>
        <p className="text-sm text-muted-foreground mb-1">
          {T("ticketNumberLabel", "Your ticket number:")} <span className="font-semibold text-foreground">#{success.ticket_number}</span>
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          {T("ticketReviewMsg", "Our team will review it and update the status here. You'll be notified when it's resolved.")}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSuccess(null);
            setForm({ issue_type: "other", subject: "", description: "", order_id: "", transaction_date: "", contact_preference: "ai_only" });
          }}
        >
          {T("createAnotherTicket", "Create Another Ticket")}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Ticket className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold font-heading text-foreground">
          {T("createTicketTitle", "Create a Support Ticket")}
        </h3>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{T("ticketIssueType", "Issue Type")}</Label>
        <Select value={form.issue_type} onValueChange={(v) => setForm({ ...form, issue_type: v })}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ISSUE_TYPES.map((it) => (
              <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{T("ticketSubject", "Subject")} *</Label>
        <Input
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          placeholder={T("ticketSubjectPlaceholder", "Brief title of your issue")}
          className="text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{T("ticketDescription", "Description")} *</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder={T("ticketDescPlaceholder", "Describe what happened, what you expected, and any error messages...")}
          className="text-sm min-h-[100px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{T("ticketOrderId", "Order ID (optional)")}</Label>
          <Input
            value={form.order_id}
            onChange={(e) => setForm({ ...form, order_id: e.target.value })}
            placeholder="cs_..."
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{T("ticketTxDate", "Transaction Date (optional)")}</Label>
          <Input
            type="date"
            value={form.transaction_date}
            onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
            className="text-sm"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{T("ticketContactPref", "Preferred Follow-up")}</Label>
        <Select value={form.contact_preference} onValueChange={(v) => setForm({ ...form, contact_preference: v })}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CONTACT_OPTIONS.map((co) => (
              <SelectItem key={co.value} value={co.value}>{co.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSubmit} disabled={submitting} className="w-full">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : T("submitTicket", "Submit Ticket")}
      </Button>
    </div>
  );
}