import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck, Archive, ChevronRight, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BugReportsArchive() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      if (me?.role !== "admin") { setUnauthorized(true); setLoading(false); return; }
      const list = await base44.entities.BugReport.filter({ status: "resolved" }, "-updated_date", 200);
      setReports(list || []);
    } catch (err) {
      console.error("Failed to load resolved reports:", err);
    } finally {
      setLoading(false);
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

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Link to="/admin" className="text-xs text-primary font-semibold flex items-center gap-1">
            {T("backToAdmin", "Back to Admin")}
          </Link>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <Archive className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold font-heading text-foreground">{T("resolvedArchive", "Resolved Archive")}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {T("resolvedArchiveDesc", "All bugs you've marked as resolved. They no longer clutter the active Admin list.")}
        </p>

        {reports.length === 0 ? (
          <div className="flex flex-col items-center py-14 bg-card border border-border rounded-2xl">
            <Inbox className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">{T("noResolvedBugs", "No resolved bugs yet.")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <Link
                key={report.id}
                to={`/admin/bug-report/${report.id}`}
                className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/30 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{report.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(report.updated_date || report.created_date).toLocaleDateString()}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}