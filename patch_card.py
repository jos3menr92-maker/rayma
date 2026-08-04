import re

with open('src/components/documents/DocumentCard.jsx', 'r') as f:
    content = f.read()

# Add createRecord, updateRecord, ensureSupabaseSession to imports
content = re.sub(
    r'import { deleteRecord } from "@/lib/supabaseHelpers";',
    'import { deleteRecord, createRecord, updateRecord, ensureSupabaseSession } from "@/lib/supabaseHelpers";',
    content
)

# Add Database and Loader2 to lucide-react imports
content = re.sub(
    r'import { FileText, Eye, Trash2, CheckCircle2, Clock, Archive, ExternalLink } from "lucide-react";',
    'import { FileText, Eye, Trash2, CheckCircle2, Clock, Archive, ExternalLink, Database, Loader2 } from "lucide-react";',
    content
)

# Insert the handleLogToRecords function inside the component
func_code = """
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
"""

content = re.sub(
    r'(const status = statusConfig\[doc\.status\] \|\| statusConfig\.pending_review;\s+const StatusIcon = status\.icon;)',
    r'\1\n' + func_code,
    content
)

# Insert the button
button_code = """
            {doc.status === "pending_review" && (
              <button onClick={handleLogToRecords} disabled={logging}
                className="text-xs px-2.5 py-1 rounded-lg bg-green-500/10 text-green-600 font-medium flex items-center gap-1 hover:bg-green-500/20 transition-colors disabled:opacity-50">
                {logging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
                {T("logToRecords", "Log to Records")}
              </button>
            )}
"""

content = re.sub(
    r'(\{doc\.status === "pending_review" && \(\s+<button onClick=\{\(\) => onReview\(doc\)\}.*?\s+<Eye.*?\s+</button>\s+\)\})',
    button_code + r'\n            \1',
    content,
    flags=re.DOTALL
)

with open('src/components/documents/DocumentCard.jsx', 'w') as f:
    f.write(content)
