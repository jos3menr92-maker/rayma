/**
 * Push Notification Permission Prompt
 * Shows a gentle nudge to enable push notifications for bill reminders.
 * Only shown if: browser supports notifications AND permission not yet granted/denied.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function PushNotificationPrompt() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only show if notifications supported and permission is default (not yet asked)
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem("push_prompt_dismissed")) return;

    // Delay by 5s so it doesn't interrupt the first load
    const timer = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  async function handleEnable() {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      // Save to user profile so we know they opted in
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
              <p className="text-sm font-semibold text-foreground">Never miss a payment</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Get notified before bills and loan payments are due.
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="rounded-xl text-xs h-8" onClick={handleEnable}>
                  Enable
                </Button>
                <Button size="sm" variant="ghost" className="rounded-xl text-xs h-8 text-muted-foreground" onClick={handleDismiss}>
                  Not now
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