import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Star, Send, ChevronLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { supabase } from "@/lib/supabaseClient";
import { useFinancialData } from "@/lib/FinancialDataContext";

const CATEGORIES_STATIC = [
  { value: "compliment", labelKey: "compliment" },
  { value: "feature_request", labelKey: "featureRequest" },
  { value: "bug", labelKey: "bugReport" },
  { value: "general", labelKey: "general" },
];

export default function Feedback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile } = useFinancialData();
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);

  const CATEGORIES = CATEGORIES_STATIC.map(c => ({
    ...c,
    label: c.labelKey === "compliment" ? T("complimentLabel", "👍 Compliment") :
           c.labelKey === "featureRequest" ? T("featureRequestLabel", "💡 Feature Request") :
           c.labelKey === "bugReport" ? T("bugReportLabel", "🐛 Bug Report") :
           T("generalLabel", "💬 General")
  }));

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;
    setSaving(true);
    
    try {
      // 🚀 SECURE: Saves directly to your Supabase Vault using your exact schema!
      await supabase.from('feedback').insert([{
        rating,
        message: message.trim() || null,
        category,
        page: location.pathname, 
        user_id: userProfile?.id // Ties it securely to the user
      }]);
      
      setSubmitted(true);
      setTimeout(() => navigate(-1), 2000); // Auto-return to previous page
    } catch (err) {
      console.error(err);
      alert(T("failedToSend", "Failed to send. Check your Supabase 'feedback' table!"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-8 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" /> {T("back", "Back")}
        </button>

        {submitted ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-12 bg-card border border-border rounded-3xl mt-10">
            <div className="text-5xl mb-4">🙏</div>
            <h2 className="text-2xl font-bold font-heading text-foreground">{T("thankYou", "Thank you!")}</h2>
            <p className="text-sm text-muted-foreground mt-2">{T("feedbackThankYou", "Your feedback helps us improve Rayma AI.")}</p>
          </motion.div>
        ) : (
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-bold font-heading text-foreground">{T("shareFeedback", "Share Feedback")}</h2>
              <p className="text-sm text-muted-foreground mt-1">{T("shareFeedbackDesc", "Let us know how we can make the app better.")}</p>
            </div>

            {/* Star Rating (From your original code) */}
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-semibold">{T("howDoYouLike", "How do you like the app?")}</p>
            <div className="flex gap-2 mb-8">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
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

            {/* Category Pills (From your original code) */}
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
                  {c.label}
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

            <Button
              onClick={handleSubmit}
              disabled={!rating || saving}
              className="w-full rounded-2xl h-12 text-base font-bold shadow-md"
            >
              {saving ? T("sending", "Sending...") : (
                <>
                  <Send className="w-5 h-5 mr-2" /> {T("submitFeedback", "Submit Feedback")}
                </>
              )}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}