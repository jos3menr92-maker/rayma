import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, Check, X, Archive, AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClientFrontend";
import { createRecord, updateRecord, deleteRecord, ensureSupabaseSession } from "@/lib/supabaseHelpers";
import { toast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { useDisplayUrl } from "@/hooks/useDisplayUrl";

export default function DocumentReviewModal({ doc, analysis, loans, bills, onClose, onDone }) {
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const { url: displayUrl } = useDisplayUrl(doc.file_url);

  const folderLabels = {
    payments: T("folderPayments", "💳 Payments"),
    loans: T("folderLoans", "🏦 Loans"),
    bills: T("folderBills", "📄 Bills"),
    tax: T("folderTax", "🧾 Tax Documents"),
    misc: T("folderMisc", "📁 Miscellaneous"),
  };

  const [folder, setFolder] = useState(doc.folder || "misc");
  const [fields, setFields] = useState(doc.extracted_data || {});
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(doc.loggable === false ? "misc_prompt" : "review");

  const raymaMessage = analysis?.rayma_message || doc.notes || T("raymaAnalyzedMsg", "I've analyzed this document. Please review the extracted details below.");

  async function handleApprove() {
    setSaving(true);
    try {
      // Guarantee the Supabase session is alive so writes use the free path
      await ensureSupabaseSession();

      if (folder === "payments" && fields.amount && fields.date) {
        const matchedLoan = loans.find(l =>
          fields.payee && l.name?.toLowerCase().includes(fields.payee?.toLowerCase())
        ) || loans[0];
        if (matchedLoan) {
          const payment = await createRecord("payments", {
            loan_id: matchedLoan.id,
            amount: parseFloat(fields.amount),
            payment_date: fields.date,
            note: `Auto-logged from document: ${doc.file_name}`,
          });
          await updateRecord("loans", matchedLoan.id, {
            current_balance: Math.max((matchedLoan.current_balance || 0) - parseFloat(fields.amount), 0)
          });
          await updateRecord("documents", doc.id, {
            status: "logged", folder, extracted_data: fields,
            logged_entity_type: "payment", logged_entity_id: payment?.id
          });
        } else {
          await updateRecord("documents", doc.id, { status: "approved", folder, extracted_data: fields });
        }
      } else if (folder === "bills" && fields.amount && fields.description) {
        const bill = await createRecord("bills", {
          name: fields.description || fields.payee || "Imported Bill",
          amount: parseFloat(fields.amount),
          category: fields.category || "other",
          notes: `Imported from document: ${doc.file_name}`,
        });
        await updateRecord("documents", doc.id, {
          status: "logged", folder, extracted_data: fields,
          logged_entity_type: "bill", logged_entity_id: bill?.id
        });
      } else if (folder === "loans" && (fields.balance != null || fields.amount != null)) {
        const loan = await createRecord("loans", {
          name: fields.description || fields.payee || T("importedLoan", "Imported Loan"),
          lender: fields.payee || "",
          original_amount: parseFloat(fields.amount ?? fields.balance ?? 0),
          current_balance: parseFloat(fields.balance ?? fields.amount ?? 0),
          interest_rate: fields.interest_rate != null ? parseFloat(fields.interest_rate) : undefined,
          start_date: fields.date || undefined,
          category: "other",
          notes: `Imported from document: ${doc.file_name}`,
          status: "active",
        });
        await updateRecord("documents", doc.id, {
          status: "logged", folder, extracted_data: fields,
          logged_entity_type: "loan", logged_entity_id: loan?.id
        });
      } else {
        await updateRecord("documents", doc.id, { status: "approved", folder, extracted_data: fields });
      }
      toast({ title: T("approved", "Approved"), description: T("docSaved", "Document saved successfully.") });
    } catch (err) {
      console.error('Failed to approve document:', err);
      toast({ title: T("approveFailed", "Approve Failed"), description: err?.message || T("tryAgain", "Please try again."), variant: "destructive" });
      return;
    } finally {
      setSaving(false);
    }
    onDone();
  }

  async function handleArchive() {
    setSaving(true);
    try {
      await updateRecord("documents", doc.id, { status: "archived", folder });
    } catch (err) {
      console.error('Failed to archive document:', err);
      toast({ title: T("archiveFailed", "Archive Failed"), description: err?.message, variant: "destructive" });
      return;
    } finally {
      setSaving(false);
    }
    onDone();
  }

  async function handleDiscard() {
    setSaving(true);
    try {
      await deleteRecord("documents", doc.id);
    } catch (err) {
      console.error('Failed to discard document:', err);
      toast({ title: T("discardFailed", "Discard Failed"), description: err?.message, variant: "destructive" });
      return;
    } finally {
      setSaving(false);
    }
    onDone();
  }

  async function handleKeepMisc(keep) {
    setSaving(true);
    try {
      if (keep) {
        await updateRecord("documents", doc.id, { status: "archived", folder: "misc" });
      } else {
        await deleteRecord("documents", doc.id);
      }
    } catch (err) {
      console.error('Failed to update document:', err);
      toast({ title: T("actionFailed", "Action Failed"), description: err?.message, variant: "destructive" });
      return;
    } finally {
      setSaving(false);
    }
    onDone();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            {T("documentReview", "Document Review")}
          </DialogTitle>
        </DialogHeader>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex gap-2">
          <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-foreground leading-relaxed">{raymaMessage}</p>
        </div>

        {displayUrl && (
          <img src={displayUrl} alt="Document" className="w-full rounded-xl object-cover max-h-40" />
        )}

        {step === "misc_prompt" ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 bg-amber-400/10 border border-amber-400/20 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-foreground leading-relaxed">
                {T("miscPromptMsg", "This document ({type}) doesn't contain data I can directly log. Would you like me to save it in your Miscellaneous folder for reference?").replace("{type}", doc.document_type || "")}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="rounded-xl text-xs" onClick={() => handleKeepMisc(true)} disabled={saving}>
                <Archive className="w-3.5 h-3.5 mr-1" /> {T("yesSaveIt", "Yes, Save It")}
              </Button>
              <Button variant="ghost" className="rounded-xl text-xs text-destructive hover:text-destructive" onClick={() => handleKeepMisc(false)} disabled={saving}>
                <X className="w-3.5 h-3.5 mr-1" /> {T("noDiscard", "No, Discard")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">{T("documentTypeLabel", "Document Type")}</Label>
              <p className="text-sm font-semibold text-foreground mt-0.5">{doc.document_type || T("unknown", "Unknown")}</p>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">{T("saveToFolder", "Save to Folder")}</Label>
              <Select value={folder} onValueChange={setFolder}>
                <SelectTrigger className="mt-1 rounded-xl text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(folderLabels).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">{T("extractedDataVerify", "Extracted Data — Please Verify")}</Label>
              {fields.amount != null && (
                <div>
                  <Label className="text-[10px] text-muted-foreground">{T("amountLabel", "Amount")}</Label>
                  <Input value={fields.amount} onChange={e => setFields(f => ({ ...f, amount: e.target.value }))}
                    className="mt-0.5 rounded-xl h-8 text-sm" type="number" step="0.01" />
                </div>
              )}
              {fields.date && (
                <div>
                  <Label className="text-[10px] text-muted-foreground">{T("dateLabel", "Date")}</Label>
                  <Input value={fields.date} onChange={e => setFields(f => ({ ...f, date: e.target.value }))}
                    className="mt-0.5 rounded-xl h-8 text-sm" type="date" />
                </div>
              )}
              {fields.payee && (
                <div>
                  <Label className="text-[10px] text-muted-foreground">{T("payeeFrom", "Payee / From")}</Label>
                  <Input value={fields.payee} onChange={e => setFields(f => ({ ...f, payee: e.target.value }))}
                    className="mt-0.5 rounded-xl h-8 text-sm" />
                </div>
              )}
              {fields.description && (
                <div>
                  <Label className="text-[10px] text-muted-foreground">{T("descriptionLabel", "Description")}</Label>
                  <Input value={fields.description} onChange={e => setFields(f => ({ ...f, description: e.target.value }))}
                    className="mt-0.5 rounded-xl h-8 text-sm" />
                </div>
              )}
              {fields.balance != null && (
                <div>
                  <Label className="text-[10px] text-muted-foreground">{T("balanceLabel", "Balance")}</Label>
                  <Input value={fields.balance} onChange={e => setFields(f => ({ ...f, balance: e.target.value }))}
                    className="mt-0.5 rounded-xl h-8 text-sm" type="number" />
                </div>
              )}
              {fields.interest_rate != null && (
                <div>
                  <Label className="text-[10px] text-muted-foreground">{T("interestRate", "Interest Rate (%)")}</Label>
                  <Input value={fields.interest_rate} onChange={e => setFields(f => ({ ...f, interest_rate: e.target.value }))}
                    className="mt-0.5 rounded-xl h-8 text-sm" type="number" step="0.01" />
                </div>
              )}
              {Object.keys(fields).length === 0 && (
                <p className="text-xs text-muted-foreground italic">{T("noDataExtracted", "No structured data extracted. You can still save this document.")}</p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleApprove} disabled={saving} className="flex-1 rounded-xl text-xs h-9">
                <Check className="w-3.5 h-3.5 mr-1" /> {folder === "payments" || folder === "bills" ? T("approveAndLog", "Approve & Log") : T("approveAndSave", "Approve & Save")}
              </Button>
              <Button variant="outline" onClick={handleArchive} disabled={saving} className="rounded-xl text-xs h-9 px-3">
                <Archive className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" onClick={handleDiscard} disabled={saving} className="rounded-xl text-xs h-9 px-3 text-destructive hover:text-destructive">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}