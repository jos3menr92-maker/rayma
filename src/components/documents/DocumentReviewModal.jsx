import { useState, useMemo } from "react";
import { Sparkles, Check, X, Archive, AlertTriangle, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createRecord, updateRecord, deleteRecord, ensureSupabaseSession } from "@/lib/supabaseHelpers";
import { toast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useDisplayUrl } from "@/hooks/useDisplayUrl";

// Map the AI's free-text category (and common merchant keywords) onto the
// Transaction category enum so scanned receipts feed Merchant Insights.
const TX_CATEGORIES = ["income", "food", "transport", "utilities", "subscriptions", "health", "insurance", "rent", "loan_payment", "savings", "entertainment", "shopping", "other"];
function normalizeTxCategory(raw) {
  if (!raw) return "other";
  const c = String(raw).toLowerCase();
  if (TX_CATEGORIES.includes(c)) return c;
  if (/(food|grocer|restaurant|coffee|meal|snack|bakery|market)/.test(c)) return "food";
  if (/(transport|gas|fuel|uber|lyft|taxi|parking|transit|car|auto)/.test(c)) return "transport";
  if (/(util|electric|water|internet|phone|wifi|broadband)/.test(c)) return "utilities";
  if (/(subscription|netflix|spotify|disney|hulu|prime|audible)/.test(c)) return "subscriptions";
  if (/(health|medical|pharmacy|dental|doctor|clinic|hospital)/.test(c)) return "health";
  if (/(insur)/.test(c)) return "insurance";
  if (/(rent)/.test(c)) return "rent";
  if (/(entertain|movie|cinema|game|concert|theatre)/.test(c)) return "entertainment";
  if (/(shop|retail|store|amazon|walmart|target|purchase|clothing|apparel|mall)/.test(c)) return "shopping";
  return "other";
}

export default function DocumentReviewModal({ doc, analysis, loans, bills, onClose, onDone }) {
  const { lang } = useLanguage();
  const { incomes, reload } = useFinancialData();
  const { formatCurrency: fmt } = useCurrency();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const { url: displayUrl } = useDisplayUrl(doc.file_url);

  const folderLabels = {
    payments: T("folderPayments", "💳 Payments"),
    loans: T("folderLoans", "🏦 Loans"),
    bills: T("folderBills", "📄 Bills"),
    tax: T("folderTax", "🧾 Tax Documents"),
    misc: T("folderMisc", "📁 Miscellaneous"),
  };

  const isPaystub = /pay\s*stub/i.test(doc.document_type || "") || (doc.document_type || "").toLowerCase().includes("paystub");
  const [folder, setFolder] = useState(doc.folder || "misc");
  const [fields, setFields] = useState(doc.extracted_data || {});
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(doc.loggable === false ? "misc_prompt" : "review");
  const [replaceTarget, setReplaceTarget] = useState(null); // closest existing income entry to the scanned pay date

  const raymaMessage = analysis?.rayma_message || doc.notes || T("raymaAnalyzedMsg", "I've analyzed this document. Please review the extracted details below.");

  // Find the income entry closest to the scanned pay date (within ~7 days)
  function findClosestIncome(payDate) {
    if (!payDate) return null;
    const target = new Date(payDate + "T00:00:00").getTime();
    let best = null;
    let bestDiff = Infinity;
    for (const inc of incomes) {
      const ws = inc.week_start || inc.date;
      if (!ws) continue;
      const diff = Math.abs(new Date(ws + "T00:00:00").getTime() - target);
      if (diff <= bestDiff) { best = inc; bestDiff = diff; }
    }
    return bestDiff <= 7 * 24 * 60 * 60 * 1000 ? best : null;
  }

  // Log the scanned paystub — either replacing the closest existing entry
  // (turning it into a REAL paycheck that feeds the auto-average) or as a new entry.
  async function logPaystubIncome(replace) {
    setSaving(true);
    try {
      await ensureSupabaseSession();
      const payAmount = fields.amount != null ? fields.amount : fields.income_amount;
      const payDate = fields.date || new Date().toISOString().split("T")[0];
      const payload = {
        amount: parseFloat(payAmount) || 0,
        note: fields.description || `Imported paystub: ${doc.file_name || ""}`,
        source: fields.payee || fields.employer || "Paystub",
      };
      if (replace && replaceTarget) {
        await updateRecord("incomes", replaceTarget.id, {
          ...payload,
          week_start: payDate,
          ...(replaceTarget.is_recurring ? {} : { recurring_source_id: null, is_recurring: false, recurring_active: false }),
        });
        await updateRecord("documents", doc.id, {
          status: "logged", folder, extracted_data: fields,
          logged_entity_type: "income", logged_entity_id: replaceTarget.id,
          document_date: fields.date || null,
        });
      } else {
        const income = await createRecord("incomes", {
          ...payload,
          date: payDate,
          week_start: payDate,
          is_recurring: false,
        });
        await updateRecord("documents", doc.id, {
          status: "logged", folder, extracted_data: fields,
          logged_entity_type: "income", logged_entity_id: income?.id,
          document_date: fields.date || null,
        });
      }
      await reload();
      toast({ title: T("approved", "Approved"), description: T("docSaved", "Document saved successfully.") });
    } catch (err) {
      console.error("Failed to log paystub income:", err);
      toast({ title: T("approveFailed", "Approve Failed"), description: err?.message || T("tryAgain", "Please try again."), variant: "destructive" });
      return;
    } finally {
      setSaving(false);
    }
    onDone();
  }

  async function handleApprove() {
    setSaving(true);
    try {
      // Guarantee the Supabase session is alive so writes use the free path
      await ensureSupabaseSession();

      const payAmount = fields.amount != null ? fields.amount : fields.income_amount;
      if (isPaystub && payAmount != null) {
        // Paystub: check for an existing entry near the pay date first —
        // a scan should replace the closest pay period, not silently duplicate it
        const payDate = fields.date || new Date().toISOString().split("T")[0];
        const closest = findClosestIncome(payDate);
        if (closest) {
          setReplaceTarget(closest);
          return; // ask the user: replace the closest entry, or keep both?
        }
        await logPaystubIncome(false);
        return;
      } else if ((folder === "payments" || /receipt/i.test(doc.document_type || "")) && fields.amount != null && fields.date) {
        const amount = parseFloat(fields.amount);
        if (!isNaN(amount)) {
          const today = new Date().toISOString().split("T")[0];
          const txDate = fields.date || today;
          const tx = await createRecord("transactions", {
            date: txDate,
            description: fields.description || fields.payee || T("scannedReceipt", "Scanned receipt"),
            amount: -Math.abs(amount),
            category: normalizeTxCategory(fields.category),
            type: "debit",
            notes: `Auto-logged from document: ${doc.file_name}`,
          });
          await updateRecord("documents", doc.id, {
            status: "logged", folder, extracted_data: fields,
            logged_entity_type: "transaction", logged_entity_id: tx?.id,
            document_date: fields.date || null,
          });
        } else {
          await updateRecord("documents", doc.id, { status: "approved", folder, extracted_data: fields, document_date: fields.date || null });
        }
      } else if (folder === "bills" && fields.amount != null) {
        const bill = await createRecord("bills", {
          name: fields.description || fields.payee || "Imported Bill",
          amount: parseFloat(fields.amount) || 0,
          payment_frequency: "monthly",
          is_active: true,
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
          original_amount: parseFloat(fields.amount ?? fields.balance ?? 0) || 0,
          current_balance: parseFloat(fields.balance ?? fields.amount ?? 0) || 0,
          interest_rate: parseFloat(fields.interest_rate) || 0,
          monthly_payment: parseFloat(fields.monthly_payment) || 0,
          payment_frequency: "monthly",
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
        ) : replaceTarget ? (
          <div className="space-y-3">
            <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-3 flex gap-2">
              <RefreshCw className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-foreground leading-relaxed">
                {T("replaceIncomePrompt", "You already have an income entry for {date} ({oldAmount}). Replace it with the amount from this paystub ({newAmount})?")
                  .replace("{date}", new Date((replaceTarget.week_start || replaceTarget.date || "") + "T00:00:00").toLocaleDateString(lang, { month: "short", day: "numeric", year: "numeric" }))
                  .replace("{oldAmount}", fmt(replaceTarget.amount || 0))
                  .replace("{newAmount}", fmt(parseFloat(fields.amount ?? fields.income_amount) || 0))}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => logPaystubIncome(true)} disabled={saving} className="rounded-xl text-xs h-9">
                <Check className="w-3.5 h-3.5 mr-1" /> {T("replace", "Replace")}
              </Button>
              <Button variant="outline" onClick={() => logPaystubIncome(false)} disabled={saving} className="rounded-xl text-xs h-9">
                {T("keepBoth", "Keep Both")}
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
              {fields.income_amount != null && fields.amount == null && (
                <div>
                  <Label className="text-[10px] text-muted-foreground">{T("incomeAmountLabel", "Income Amount")}</Label>
                  <Input value={fields.income_amount} onChange={e => setFields(f => ({ ...f, income_amount: e.target.value }))}
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
                <Check className="w-3.5 h-3.5 mr-1" /> {folder === "payments" || folder === "bills" || isPaystub || /receipt/i.test(doc.document_type || "") ? T("approveAndLog", "Approve & Log") : T("approveAndSave", "Approve & Save")}
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