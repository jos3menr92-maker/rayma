import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useT } from "@/lib/LanguageContext";

// Admin moderation list: approve/reject each review, and feature
// approved + consented reviews on the public landing page.
export default function FeedbackModeration({ feedback, onChanged }) {
  const T = useT();
  const [busyId, setBusyId] = useState(null);

  const update = async (id, patch) => {
    setBusyId(id);
    try {
      await base44.entities.Feedback.update(id, patch);
      onChanged();
    } catch (e) {
      alert(e?.message || "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  if (!feedback || feedback.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
        <p className="text-sm text-muted-foreground p-4">{T("noFeedbackYet", "No feedback yet.")}</p>
      </div>
    );
  }

  const statusBadge = (status) => {
    if (status === "approved") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (status === "rejected") return "bg-destructive/10 text-destructive";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
      <p className="text-[10px] text-muted-foreground px-4 py-2 border-b border-border">
        {T("moderationHint", "Approve reviews, then feature consented ones on the public landing page.")}
      </p>
      {feedback.map((fb, i) => (
        <div key={fb.id} className={`px-4 py-3 ${i < feedback.length - 1 ? "border-b border-border" : ""}`}>
          <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-foreground capitalize">{fb.category || "general"}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusBadge(fb.status)}`}>
                {fb.status === "approved" ? T("fbApproved", "Approved") : fb.status === "rejected" ? T("fbRejected", "Rejected") : T("fbPending", "Pending")}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${fb.public_consent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {fb.public_consent ? T("consentYes", "Public consent ✓") : T("consentNo", "No public consent")}
              </span>
            </div>
            <span className="text-xs text-amber-500">{"★".repeat(fb.rating || 0)}{"☆".repeat(5 - (fb.rating || 0))}</span>
          </div>
          {fb.message && <p className="text-xs text-muted-foreground leading-relaxed">{fb.message}</p>}
          <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
            <span className="text-[10px] text-muted-foreground">
              {fb.public_consent ? (fb.display_name || "—") : ""}
            </span>
            <div className="flex items-center gap-2">
              {fb.status !== "approved" && (
                <button
                  disabled={busyId === fb.id}
                  onClick={() => update(fb.id, { status: "approved" })}
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                  {T("approveBtn", "Approve")}
                </button>
              )}
              {fb.status !== "rejected" && (
                <button
                  disabled={busyId === fb.id}
                  onClick={() => update(fb.id, { status: "rejected", feature_on_landing: false })}
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                >
                  {T("rejectBtn", "Reject")}
                </button>
              )}
              {fb.status === "approved" && fb.public_consent && (
                <button
                  disabled={busyId === fb.id}
                  onClick={() => update(fb.id, { feature_on_landing: !fb.feature_on_landing })}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-colors disabled:opacity-50 ${
                    fb.feature_on_landing
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                >
                  {fb.feature_on_landing ? T("unfeatureBtn", "Unfeature") : T("featureBtn", "Feature")}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}