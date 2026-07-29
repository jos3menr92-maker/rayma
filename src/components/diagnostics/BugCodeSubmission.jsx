import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Bug, Send, CheckCircle2, Loader2, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { base44 } from "@/api/base44Client";

export default function BugCodeSubmission() {
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setCode(text);
    } catch {
      setError(T("clipboardPasteError", "Couldn't access clipboard. Please paste manually."));
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !code.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await base44.functions.invoke("submitBugReport", {
        title: title.trim(),
        description: description.trim(),
        code_snippet: code.trim(),
        page_url: window.location.href
      });
      if (res.data?.success) {
        setSubmitted(true);
        setTitle("");
        setDescription("");
        setCode("");
      } else {
        setError(res.data?.error || T("submitBugError", "Failed to submit. Please try again."));
      }
    } catch (err) {
      setError(err.message || T("submitBugError", "Failed to submit. Please try again."));
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-xl font-bold font-heading text-foreground mb-2">
          {T("bugReportSent", "Bug Report Sent!")}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {T("bugReportSentDesc", "Your troubleshooting code has been emailed to the support team. We'll investigate and get back to you.")}
        </p>
        <Button variant="outline" onClick={() => setSubmitted(false)} className="rounded-xl">
          {T("submitAnother", "Submit Another")}
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-6"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Bug className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold font-heading text-foreground">
            {T("submitBugCode", "Submit Bug Code")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {T("submitBugCodeDesc", "Paste the troubleshooting code from Rayma AI chat to send it to support.")}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
            {T("bugTitle", "Title")} *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={T("bugTitlePlaceholder", "Brief title for the issue")}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
            {T("bugDescription", "Description (optional)")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={T("bugDescriptionPlaceholder", "What happened? What did you expect?")}
            rows={2}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {T("troubleshootingCode", "Troubleshooting Code")} *
            </label>
            <button
              onClick={handlePaste}
              className="flex items-center gap-1 text-xs text-primary font-medium hover:opacity-80 transition-opacity"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              {T("paste", "Paste")}
            </button>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={T("codePlaceholder", "Paste the code from Rayma AI here...")}
            rows={6}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary resize-y"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!title.trim() || !code.trim() || submitting}
          className="w-full rounded-xl h-12 font-semibold gap-2"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> {T("sending", "Sending...")}</>
          ) : (
            <><Send className="w-4 h-4" /> {T("sendToSupport", "Send to Support")}</>
          )}
        </Button>
      </div>
    </motion.div>
  );
}