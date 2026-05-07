import { motion } from "framer-motion";
import { FileText, Eye, Trash2, CheckCircle2, Clock, Archive, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";

const folderEmoji = {
  payments: "💳",
  loans: "🏦",
  bills: "📄",
  tax: "🧾",
  misc: "📁",
};

const statusConfig = {
  pending_review: { label: "Pending Review", class: "bg-amber-400/10 text-amber-400", icon: Clock },
  approved: { label: "Approved", class: "bg-primary/10 text-primary", icon: CheckCircle2 },
  logged: { label: "Logged", class: "bg-green-500/10 text-green-500", icon: CheckCircle2 },
  archived: { label: "Archived", class: "bg-muted text-muted-foreground", icon: Archive },
};

export default function DocumentCard({ doc, index, onDelete, onReview }) {
  const status = statusConfig[doc.status] || statusConfig.pending_review;
  const StatusIcon = status.icon;

  async function handleDelete() {
    await base44.entities.ScannedDocument.delete(doc.id);
    onDelete(doc.id);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      <div className="flex gap-3 p-3">
        {doc.file_url ? (
          <img src={doc.file_url} alt="doc" className="w-14 h-14 rounded-xl object-cover shrink-0 bg-muted" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground truncate">{doc.document_type || doc.file_name || "Document"}</p>
              <p className="text-xs text-muted-foreground">{folderEmoji[doc.folder]} {doc.folder?.charAt(0).toUpperCase() + doc.folder?.slice(1)} · {doc.scan_date}</p>
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
              <button onClick={() => onReview(doc)}
                className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-medium flex items-center gap-1 hover:bg-primary/20 transition-colors">
                <Eye className="w-3 h-3" /> Review
              </button>
            )}
            {doc.file_url && (
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                className="text-xs px-2.5 py-1 rounded-lg bg-muted text-muted-foreground font-medium flex items-center gap-1 hover:text-foreground transition-colors">
                <ExternalLink className="w-3 h-3" /> View
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