import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Eye, CheckCircle2, ShieldCheck, Loader2, Globe, Bug, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import CopyButton from "@/components/CopyButton";

const STATUS_CONFIG = {
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: Clock },
  in_review: { label: "In Review", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Eye },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
};

export default function BugReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      if (me?.role !== "admin") { setUnauthorized(true); setLoading(false); return; }
      const data = await base44.entities.BugReport.get(id);
      setReport(data);
    } catch (err) {
      console.error("Failed to load bug report:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(newStatus) {
    setUpdating(true);
    try {
      await base44.entities.BugReport.update(id, { status: newStatus });
      setReport((r) => (r ? { ...r, status: newStatus } : r));
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (unauthorized) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
      <ShieldCheck className="w-12 h-12 text-destructive" />
      <h1 className="text-xl font-bold text-foreground">{T("adminAccessOnly", "Admin Access Only")}</h1>
      <Button onClick={() => navigate("/")} variant="outline">{T("goHome", "Go Home")}</Button>
    </div>
  );

  if (!report) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
      <Bug className="w-10 h-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{T("bugNotFound", "Bug report not found.")}</p>
      <Link to="/admin" className="text-sm text-primary font-semibold">{T("backToAdmin", "Back to Admin")}</Link>
    </div>
  );

  const config = STATUS_CONFIG[report.status] || STATUS_CONFIG.submitted;
  const StatusIcon = config.icon;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Link to="/admin/bug-reports/resolved" className="text-xs text-primary font-semibold flex items-center gap-1">
            <Archive className="w-3.5 h-3.5" /> {T("resolvedArchive", "Resolved Archive")}
          </Link>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.color}`}>
              <StatusIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold font-heading text-foreground leading-tight">{report.title}</h1>
              <p className="text-[10px] text-muted-foreground">{new Date(report.created_date).toLocaleString()}</p>
            </div>
          </div>

          {report.description && (
            <div className="mb-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{T("description", "Description")}</p>
              <p className="text-sm text-foreground selectable whitespace-pre-wrap leading-relaxed">{report.description}</p>
            </div>
          )}

          {report.page_url && (
            <div className="mb-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{T("page", "Page")}</p>
              <a href={report.page_url} target="_blank" rel="noreferrer" className="text-xs font-mono text-primary break-all flex items-center gap-1.5">
                <Globe className="w-3 h-3 shrink-0" /> {report.page_url}
              </a>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{T("codeSnippet", "Code Snippet")}</p>
              <CopyButton text={report.code_snippet} />
            </div>
            <pre data-copyable className="selectable bg-slate-900 dark:bg-slate-950 text-slate-100 p-3 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed">{report.code_snippet}</pre>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">{T("status", "Status")}</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_CONFIG).map(([value, cfg]) => {
              const Icon = cfg.icon;
              const active = report.status === value;
              return (
                <button
                  key={value}
                  disabled={updating}
                  onClick={() => handleStatusChange(value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all disabled:opacity-50 ${
                    active ? `${cfg.color} border-transparent` : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {T(`bugStatus_${value}`, cfg.label)}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            {T("resolvedHint", "Marking a bug as Resolved moves it to the Resolved Archive and out of the active list.")}
          </p>
        </div>
      </motion.div>
    </div>
  );
}