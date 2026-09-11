import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Send, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate, useLocation } from "react-router-dom";
import { useT } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";

const CATEGORIES = [
  { value: "compliment", labelKey: "complimentLabel", fallback: "👍 Compliment" },
  { value: "feature_request", labelKey: "featureRequestLabel", fallback: "💡 Feature Request" },
  { value: "bug", labelKey: "bugReportLabel", fallback: "🐛 Bug Report" },
  { value: "general", labelKey: "generalLabel", fallback: "💬 General" },
];

// Public name = first name + last initial (e.g. "Jose M.") — never the email.
function derivePublicName(fullName) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Member";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export default function Feedback() {
  const navigate = useNavigate();
  const location = useLocation();
  const T = useT();

  const [checking, setChecking] = useState(true);
  const [existing, setExisting] = useState(null);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [consent, setConsent] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  // One review per user: load their existing review (if any) into edit mode.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await base44.auth.me();
        const mine = await base44.entities.Feedback.filter({ created_by_id: me.id }, "-created_date", 5);
        if (!alive) return;
        const mine0 = mine && mine[0];
        if (mine0) {
          setExisting(mine0);
          setRating(mine0.rating || 0);
          setCategory(mine0.category || "general");
          setMessage(mine0.message || "");
          setConsent(mine0.public_consent === true);
          setDisplayName(mine0.display_name || derivePublicName(me.full_name));
        } else {
          setDisplayName(derivePublicName(me.full_name));
        }
      } catch (e) {
        // Form stays usable even if the lookup fails.
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const handleSubmit = async () => {
    if (!rating) return;
    setSaving(true);
    try {
      const payload = {
        rating,
        message: message.trim() || null,
        category,
        page: location.pathname,
        public_consent: consent,
        display_name: consent ? (displayName.trim() || null) : null,
      };
      if (!consent) payload.feature_on_landing = false;

      if (existing) {
        const update = { ...payload };
        // Edited reviews go back through moderation before any public display.
        if (existing.status === "approved") update.status = "pending";
        await base44.entities.Feedback.update(existing.id, update);
      } else {
        await base44.entities.Feedback.create({ ...payload, status: "pending", feature_on_landing: false });
      }

      setSubmitted(true);
      setTimeout(() => navigate(-1), 2000);
    } catch (err) {
      alert(T("failedToSend", "Failed to send. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-8 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" /> {T("back", "Back")}
        </button>

        {submitted ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-12 bg-card border border-border rounded-3xl mt-10">
            <div className="text-5xl mb-4">🙏</div>
            <h2 className="text-2xl font-bold font-heading text-foreground">
              {existing ? T("reviewUpdatedTitle", "Review updated!") : T("thankYou", "Thank you!")}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">{T("feedbackThankYou", "Your feedback helps us improve Rayma AI.")}</p>
          </motion.div>
        ) : (
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-bold font-heading text-foreground">
                {existing ? T("yourReview", "Your Review") : T("shareFeedback", "Share Feedback")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {existing
                  ? T("editReviewHint", "You've already shared a review — update it anytime.")
                  : T("shareFeedbackDesc", "Let us know how we can make the app better.")}
              </p>
            </div>

            {/* Star Rating */}
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-semibold">{T("howDoYouLike", "How do you like the app?")}</p>
            <div className="flex gap-2 mb-8">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setRating(s)}
                  className="transition-transform active:scale-90"
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      s <= (hovered || rating)
                        ? "text-amber-400 fill-amber-400 drop-shadow-md"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Category Pills */}
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-semibold">{T("category", "Category")}</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`text-xs px-4 py-2 rounded-full border transition-all ${
                    category === c.value
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/40"
                  }`}
                >
                  {T(c.labelKey, c.fallback)}
                </button>
              ))}
            </div>

            {/* Message Area */}
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-semibold">{T("messageOptional", "Message (optional)")}</p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={T("tellUsWhat", "Tell us what you think...")}
              rows={4}
              className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none mb-6 shadow-inner"
            />

            {/* Public consent guardrail */}
            <div className="mb-5 p-4 rounded-2xl bg-muted/40 border border-border">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="public-consent"
                  checked={consent}
                  onCheckedChange={(v) => setConsent(v === true)}
                  className="mt-0.5"
                />
                <label htmlFor="public-consent" className="text-xs text-foreground leading-relaxed cursor-pointer">
                  {T("publicConsentLabel", "Rayma AI may feature my review publicly (first name only)")}
                </label>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                {T("consentPrivacyNote", "Only your first name and review are shown publicly — never your email.")}
              </p>
              {consent && (
                <div className="mt-3">
                  <label htmlFor="display-name" className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block mb-1">
                    {T("publicNameLabel", "Name shown publicly")}
                  </label>
                  <Input
                    id="display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={40}
                    className="rounded-xl"
                  />
                </div>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!rating || saving}
              className="w-full rounded-2xl h-12 text-base font-bold shadow-md"
            >
              {saving ? T("sending", "Sending...") : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  {existing ? T("updateReviewBtn", "Update Review") : T("submitFeedback", "Submit Feedback")}
                </>
              )}
            </Button>

            {existing && existing.status === "approved" && (
              <p className="text-[10px] text-muted-foreground text-center mt-3">
                {T("reviewResubmitNote", "Edits are re-checked before being shown publicly.")}
              </p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}