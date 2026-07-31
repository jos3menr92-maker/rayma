import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Bug, Loader2, Inbox, Clock, Eye, Archive } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

const STATUS_CONFIG = {
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: Clock },
  in_review: { label: "In Review", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Eye },
};

export default function BugReportViewer() {
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvedCount, setResolvedCount] = useState(0);

  useEffect(() => { loadReports(); }, []);

  async function loadReports() {
    setLoading(true);
    try {
      // Only fetch open reports (submitted + in_review) so the Admin list stays short
      const submitted = await base44.entities.BugReport.filter({ status: "submitted" }, "-created_date", 100);
      const inReview = await base44.entities.BugReport.filter({ status: "in_review" }, "-created_date", 100);
      const open = [...(inReview || []), ...(submitted || [])];
      setReports(open);

      const resolved = await base44.entities.BugReport.filter({ status: "resolved" }, "-created_date", 200);
      setResolvedCount((resolved || []).length);
    } catch (err) {
      console.error("Failed to load bug reports:", err);
    }
    setLoading(false);
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Bug className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">{T("bugReports", "Bug Reports")}</h2>
        </div>
        <Link to="/admin/bug-reports/resolved" className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
          <Archive className="w-3.5 h-3.5" />
          {T("resolved", "Resolved")} ({resolvedCount})
        </Link>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        {T("bugReportsDesc", "Tap any report to open it. Resolved bugs are saved to the archive, not here.")}
      </p>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <Inbox className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{T("noOpenBugReports", "No open bug reports. Nice!")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => {
            const config = STATUS_CONFIG[report.status] || STATUS_CONFIG.submitted;
            const StatusIcon = config.icon;
            return (
              <Link
                key={report.id}
                to={`/admin/bug-report/${report.id}`}
                className="flex items-center gap-3 bg-background border border-border rounded-xl px-4 py-3 hover:border-primary/30 transition-colors group"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                  <StatusIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{report.title}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(report.created_date).toLocaleString()}</p>
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-primary transition-colors">{T("open", "Open")}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}