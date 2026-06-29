import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

export default function PushNotificationPrompt() {
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem("push_prompt_dismissed")) return;

    const timer = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  async function handleEnable() {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await base44.auth.updateMe({ push_notifications_enabled: true });
    }
    setShow(false);
    setDismissed(true);
    localStorage.setItem("push_prompt_dismissed", "1");
  }

  function handleDismiss() {
    setShow(false);
    setDismissed(true);
    localStorage.setItem("push_prompt_dismissed", "1");
  }

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-24 left-4 right-4 z-50 max-w-sm mx-auto"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{T("neverMissPayment", "Never miss a payment")}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {T("getNotifiedBills", "Get notified before bills and loan payments are due.")}
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="rounded-xl text-xs h-8" onClick={handleEnable}>
                  {T("enable", "Enable")}
                </Button>
                <Button size="sm" variant="ghost" className="rounded-xl text-xs h-8 text-muted-foreground" onClick={handleDismiss}>
                  {T("notNow", "Not now")}
                </Button>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}