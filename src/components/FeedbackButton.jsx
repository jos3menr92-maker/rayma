import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquarePlus, Star, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useLocation } from "react-router-dom";

const CATEGORIES = [
  { value: "compliment", label: "👍 Compliment" },
  { value: "feature_request", label: "💡 Feature Request" },
  { value: "bug", label: "🐛 Bug Report" },
  { value: "general", label: "💬 General" },
];

export default function FeedbackButton() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleOpen = () => {
    setOpen(true);
    setSubmitted(false);
    setRating(0);
    setMessage("");
    setCategory("general");
  };

  const handleSubmit = async () => {
    if (!rating) return;
    setSaving(true);
    await base44.entities.Feedback.create({
      rating,
      message: message.trim() || undefined,
      category,
      page: location.pathname,
    });
    setSaving(false);
    setSubmitted(true);
    setTimeout(() => setOpen(false), 1800);
  };

  return (
    <>
      {/* Trigger button — bottom-right corner, above nav */}
      <button
        onClick={handleOpen}
        title="Share feedback"
        className="fixed bottom-24 right-4 z-40 w-11 h-11 rounded-full bg-secondary shadow-lg flex items-center justify-center text-secondary-foreground hover:bg-secondary/80 transition-colors"
      >
        <MessageSquarePlus className="w-5 h-5" />
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/40 z-50"
            />

            {/* Sheet */}
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl border-t border-border p-6 max-w-lg mx-auto"
            >
              {submitted ? (
                <div className="text-center py-6">
                  <div className="text-4xl mb-3">🙏</div>
                  <h2 className="text-lg font-bold font-heading text-foreground">Thank you!</h2>
                  <p className="text-sm text-muted-foreground mt-1">Your feedback helps us improve.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-bold font-heading text-foreground">Share Feedback</h2>
                    <button onClick={() => setOpen(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Star Rating */}
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">How do you like the app?</p>
                  <div className="flex gap-2 mb-5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        onMouseEnter={() => setHovered(s)}
                        onMouseLeave={() => setHovered(0)}
                        onClick={() => setRating(s)}
                        className="transition-transform active:scale-90"
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            s <= (hovered || rating)
                              ? "text-amber-400 fill-amber-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  {/* Category */}
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Category</p>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setCategory(c.value)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          category === c.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-border hover:border-primary/40"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  {/* Message */}
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Message (optional)</p>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what you think..."
                    rows={3}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none mb-4"
                  />

                  <Button
                    onClick={handleSubmit}
                    disabled={!rating || saving}
                    className="w-full rounded-xl gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {saving ? "Sending..." : "Submit Feedback"}
                  </Button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}