import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { FolderOpen, Sparkles, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { useFinancialData } from "@/lib/FinancialDataContext"; // 🚀 NEW: Added the global data brain
import DocumentUploader from "../components/documents/DocumentUploader";
import DocumentCard from "../components/documents/DocumentCard";
import DocumentReviewModal from "../components/documents/DocumentReviewModal";

const FOLDERS_STATIC = [
  { id: "all", labelKey: "all", emoji: "🗂️" },
  { id: "pending_review", labelKey: "pending", emoji: "⏳", isStatus: true },
  { id: "payments", labelKey: "payments", emoji: "💳" },
  { id: "loans", labelKey: "loans", emoji: "🏦" },
  { id: "bills", labelKey: "bills", emoji: "📄" },
  { id: "tax", labelKey: "tax", emoji: "🧾" },
  { id: "misc", labelKey: "misc", emoji: "📁" },
];

export default function DocumentVault() {
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  
  // 🚀 FIXED: Pulling actual loans and bills from Supabase instead of local state!
  const { loans, bills } = useFinancialData(); 
  const activeLoans = useMemo(() => loans.filter(x => x.status !== "paid_off"), [loans]);

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState("all");
  const [reviewingDoc, setReviewingDoc] = useState(null);
  const [reviewAnalysis, setReviewAnalysis] = useState(null);

  const FOLDERS = FOLDERS_STATIC.map(f => ({
    ...f,
    label: T(f.labelKey, f.labelKey === "pending" ? "Pending" : f.labelKey.charAt(0).toUpperCase() + f.labelKey.slice(1))
  }));

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    // 🚀 FIXED: We only fetch scanned docs from Base44 now. Loans and Bills are handled by Supabase globally!
    const d = await base44.entities.ScannedDocument.list("-created_date", 100);
    setDocs(d);
    setLoading(false);
  }

  function handleDocumentScanned(doc) {
    setDocs(prev => [doc, ...prev]);
    // Auto-open review
    setReviewingDoc(doc);
    setReviewAnalysis(doc._analysis);
  }

  function handleDelete(id) {
    setDocs(prev => prev.filter(d => d.id !== id));
  }

  function handleReview(doc) {
    setReviewingDoc(doc);
    setReviewAnalysis(null);
  }

  async function handleReviewDone() {
    setReviewingDoc(null);
    setReviewAnalysis(null);
    await loadData();
  }

  const filtered = docs.filter(d => {
    if (activeFolder === "all") return true;
    if (activeFolder === "pending_review") return d.status === "pending_review";
    return d.folder === activeFolder;
  });

  const pendingCount = docs.filter(d => d.status === "pending_review").length;

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-foreground">{T("documentVault", "Document Vault")}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-5 ml-12">{T("documentVaultSubtitle", "Scan receipts, bills & documents — Rayma AI logs them for you")}</p>

        {/* RAYMA hint */}
        <div className="bg-primary/5 border border-primary/15 rounded-2xl p-3 mb-5 flex gap-2.5">
          <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-foreground leading-relaxed">
            {T("documentHint", "Upload any financial document and I'll analyze it, extract key data, and ask you to verify before logging it to your records. Tax forms and miscellaneous docs are saved for your reference.")}
          </p>
        </div>

        {/* Uploader */}
        <div className="mb-6">
          <DocumentUploader onDocumentScanned={handleDocumentScanned} />
        </div>

        {/* Folder tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 pb-1">
          {FOLDERS.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFolder(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border shrink-0 ${
                activeFolder === f.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {f.emoji} {f.label}
              {f.isStatus && pendingCount > 0 && (
                <span className="ml-0.5 bg-amber-400 text-background text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Document list */}
        {filtered.length === 0 ? (
          <div className="text-center py-14">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-3xl">📂</div>
            <p className="text-sm font-semibold text-foreground mb-1">{T("noDocumentsYet", "No documents here yet")}</p>
            <p className="text-xs text-muted-foreground">{T("uploadDocumentStart", "Upload a receipt or document above to get started")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingCount > 0 && activeFolder === "all" && (
              <div className="flex items-center gap-2 text-xs text-amber-400 font-medium mb-1">
                <Clock className="w-3.5 h-3.5" />
                {pendingCount} {T("documentAwaiting", `document${pendingCount > 1 ? "s" : ""} awaiting your review`)}
              </div>
            )}
            {filtered.map((doc, i) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                index={i}
                onDelete={handleDelete}
                onReview={handleReview}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Review Modal */}
      {reviewingDoc && (
        <DocumentReviewModal
          doc={reviewingDoc}
          analysis={reviewAnalysis}
          loans={activeLoans} // 🚀 Using the active loans from Supabase
          bills={bills}       // 🚀 Using the bills from Supabase
          onClose={() => setReviewingDoc(null)}
          onDone={handleReviewDone}
        />
      )}
    </div>
  );
}
