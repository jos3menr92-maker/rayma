import { motion } from "framer-motion";
import { FileText, Eye, Trash2, CheckCircle2, Clock, Archive, ExternalLink, Database, Loader2 } from "lucide-react";
import { deleteRecord, createRecord, updateRecord, ensureSupabaseSession } from "@/lib/supabaseHelpers";
import { toast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { useMemo, useState } from "react";
import { useDisplayUrl } from "@/hooks/useDisplayUrl";

const folderEmoji = {
  payments: "💳",
  loans: "🏦",
  bills: "📄",
  tax: "🧾",
  misc: "📁",
};

export default function DocumentCard({ doc, index, onDelete, onReview }) {
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const { url: displayUrl } = useDisplayUrl(doc.file_url);

  const statusConfig = {
    pending_review: { label: T("pendingReview", "Pending Review"), class: "bg-amber-400/10 text-amber-400", icon: Clock },
    approved: { label: T("approvedStatus", "Approved"), class: "bg-primary/10 text-primary", icon: CheckCircle2 },
    logged: { label: T("loggedStatus", "Logged"), class: "bg-green-500/10 text-green-500", icon: CheckCircle2 },
    archived: { label: T("archivedStatus", "Archived"), class: "bg-muted text-muted-foreground", icon: Archive },
  };

  const status = statusConfig[doc.status] || statusConfig.pending_review;
  const StatusIcon = status.icon;

  const [logging, setLogging] = useState(false);

  async function handleLogToRecords() {
    setLogging(true);
    try {
      await ensureSupabaseSession();
      const fields = doc.extracted_data || {};
      let logged = false;
      let folder = doc.folder || 'misc';

      if (doc.document_type === 'paystub' && fields.amount != null) {
        const income = await createRecord("incomes", {
          amount: parseFloat(fields.amount) || 0,
          date: fields.date || new Date().toISOString().split("T")[0],
          note: fields.description || `Imported paystub: ${doc.file_name || ""}`,
          source: fields.payee || fields.employer || "Paystub",
          is_recurring: false
        });
        await updateRecord("documents", doc.id, {
          status: "logged", folder,
          logged_entity_type: "income", logged_entity_id: income?.id
        });
        logged = true;
      } else if ((doc.document_type === 'receipt' || folder === 'payments') && fields.amount != null) {
        const today = new Date().toISOString().split("T")[0];
        const tx = await createRecord("transactions", {
          date: fields.date || today,
          description: fields.description || fields.payee || T("scannedReceipt", "Scanned receipt"),
          amount: -Math.abs(parseFloat(fields.amount) || 0),
          category: fields.category || "other",
          type: "debit",
          notes: `Auto-logged from document: ${doc.file_name || ""}`,
        });
        await updateRecord("documents", doc.id, {
          status: "logged", folder,
          logged_entity_type: "transaction", logged_entity_id: tx?.id
        });
        logged = true;
      }

      if (logged) {
        toast({ title: T("loggedStatus", "Logged"), description: T("docSaved", "Document saved successfully.") });
        // Call onDelete to remove it from the list or trigger a reload. 
        // Actually, we should trigger a reload. onDelete(doc.id) usually reloads the data, but it might just remove the card locally. 
        // Let's call onDelete(doc.id) since it triggers a reload in DocumentVault!
        onDelete(doc.id);
      } else {
        // Fallback to review modal if it can't be auto-logged
        toast({ title: T("reviewRequired", "Review Required"), description: T("cannotAutoLog", "Please review and approve this document manually.") });
        onReview(doc);
      }
    } catch (err) {
      console.error('Failed to log document:', err);
      toast({ title: T("actionFailed", "Action Failed"), description: err?.message, variant: "destructive" });
    } finally {
      setLogging(false);
    }
  }


  async function handleDelete() {
    try {
      await deleteRecord("documents", doc.id);
      onDelete(doc.id);
    } catch (err) {
      console.error('Failed to delete document:', err);
      toast({ title: T("deleteFailed", "Delete Failed"), description: err?.message, variant: "destructive" });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      <div className="flex gap-3 p-3">
        {displayUrl ? (
          <img src={displayUrl} alt="doc" className="w-14 h-14 rounded-xl object-cover shrink-0 bg-muted" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground truncate">{doc.document_type || doc.file_name || T("document", "Document")}</p>
              <p className="text-xs text-muted-foreground">{folderEmoji[doc.folder]} {doc.folder ? doc.folder.charAt(0).toUpperCase() + doc.folder.slice(1) : ""} · {doc.scan_date}</p>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${status.class}`}>
              <StatusIcon className="w-2.5 h-2.5" />
              {status.label}
            </span>
          </div>
          {doc.notes && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{doc.notes}</p>
          )}
          <div className="flex gap-2 mt-2">
            
            {doc.status === "pending_review" && (
              <button onClick={handleLogToRecords} disabled={logging}
                className="text-xs px-2.5 py-1 rounded-lg bg-green-500/10 text-green-600 font-medium flex items-center gap-1 hover:bg-green-500/20 transition-colors disabled:opacity-50">
                {logging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
                {T("logToRecords", "Log to Records")}
              </button>
            )}

            {doc.status === "pending_review" && (
              <button onClick={() => onReview(doc)}
                className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-medium flex items-center gap-1 hover:bg-primary/20 transition-colors">
                <Eye className="w-3 h-3" /> {T("review", "Review")}
              </button>
            )}
            {displayUrl && (
              <a href={displayUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs px-2.5 py-1 rounded-lg bg-muted text-muted-foreground font-medium flex items-center gap-1 hover:text-foreground transition-colors">
                <ExternalLink className="w-3 h-3" /> {T("view", "View")}
              </a>
            )}
            <button onClick={handleDelete}
              className="text-xs px-2.5 py-1 rounded-lg bg-muted text-muted-foreground font-medium flex items-center gap-1 hover:text-destructive transition-colors ml-auto">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}