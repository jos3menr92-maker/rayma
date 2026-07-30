import React, { useState, useEffect, useMemo } from "react";
import { Bug, ChevronDown, ChevronUp, Loader2, Inbox, Clock, CheckCircle2, Eye } from "lucide-react";
import CopyButton from "@/components/CopyButton";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

const STATUS_CONFIG = {
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: Clock },
  in_review: { label: "In Review", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Eye },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
};

export default function BugReportViewer() {
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { loadReports(); }, []);

  async function loadReports() {
    setLoading(true);
    try {
      const list = await base44.entities.BugReport.list("-created_date", 50);
      setReports(list || []);
    } catch (err) {
      console.error("Failed to load bug reports:", err);
    }
    setLoading(false);
  }

  async function handleStatusChange(id, newStatus) {
    try {
      await base44.entities.BugReport.update(id, { status: newStatus });
      loadReports();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Bug className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">{T("bugReports", "Bug Reports")}</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        {T("bugReportsDesc", "Bug reports submitted from Diagnostics & Repair appear here.")}
      </p>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <Inbox className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{T("noBugReports", "No bug reports yet.")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => {
            const config = STATUS_CONFIG[report.status] || STATUS_CONFIG.submitted;
            const StatusIcon = config.icon;
            const isExpanded = expandedId === report.id;

            return (
              <div key={report.id} className="bg-background border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                      <StatusIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{report.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(report.created_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                    {report.description && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{T("description", "Description")}</p>
                        <p className="text-sm text-foreground selectable">{report.description}</p>
                      </div>
                    )}
                    {report.page_url && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{T("page", "Page")}</p>
                        <p className="text-xs font-mono text-muted-foreground break-all">{report.page_url}</p>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{T("codeSnippet", "Code Snippet")}</p>
                        <CopyButton text={report.code_snippet} />
                      </div>
                      <pre data-copyable className="selectable bg-slate-900 dark:bg-slate-950 text-slate-100 p-3 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed">{report.code_snippet}</pre>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{T("status", "Status")}:</span>
                      <select
                        value={report.status}
                        onChange={(e) => handleStatusChange(report.id, e.target.value)}
                        className="bg-background border border-border rounded-lg px-2 py-1 text-xs"
                      >
                        <option value="submitted">{T("submitted", "Submitted")}</option>
                        <option value="in_review">{T("inReview", "In Review")}</option>
                        <option value="resolved">{T("resolved", "Resolved")}</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}