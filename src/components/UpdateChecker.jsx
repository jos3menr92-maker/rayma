import { useEffect, useState, useRef } from "react";
import { RefreshCw, X } from "lucide-react";
import { useT } from "@/lib/LanguageContext";

// How often to check for a new deployment while the app is open
const CHECK_INTERVAL_MS = 15 * 60 * 1000;
// Small delay on boot so the check never competes with startup
const BOOT_DELAY_MS = 8000;
// Skip a check if the last one ran less than this long ago (throttles
// rapid app-switching on mobile, where visibilitychange fires often)
const MIN_GAP_MS = 5 * 60 * 1000;

/** The hashed entry script of the version currently running in this tab */
function getRunningEntry() {
  const el = document.querySelector('script[type="module"]');
  return el ? el.getAttribute("src") : "";
}

/** The hashed entry script of the newest deployed version (bypasses cache) */
async function getLiveEntry() {
  const res = await fetch("/", { cache: "no-store" });
  if (!res.ok) return null;
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const el = doc.querySelector('script[type="module"]');
  return el ? el.getAttribute("src") : null;
}

/**
 * Detects when a newer version of Rayma AI has been deployed and offers
 * a one-tap refresh that also clears the browser's cached files.
 */
export default function UpdateChecker() {
  const T = useT();
  const [updateReady, setUpdateReady] = useState(false);
  const checking = useRef(false);
  const lastCheck = useRef(0);
  const dismissed = useRef(false);

  useEffect(() => {
    async function checkForUpdate() {
      if (checking.current || updateReady || dismissed.current) return;
      if (lastCheck.current && Date.now() - lastCheck.current < MIN_GAP_MS) return;
      checking.current = true;
      lastCheck.current = Date.now();
      try {
        const running = getRunningEntry();
        const live = await getLiveEntry();
        if (live && running && live !== running) {
          setUpdateReady(true);
        }
      } catch (e) {
        // Network hiccup — next check will retry
      } finally {
        checking.current = false;
      }
    }

    const bootTimer = setTimeout(checkForUpdate, BOOT_DELAY_MS);
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(bootTimer);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [updateReady]);

  const refreshNow = async () => {
    try {
      // Wipe any cached responses so the reload pulls everything fresh
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) {
      // If cache clearing fails, a plain reload still gets the new build
    }
    window.location.reload();
  };

  if (!updateReady) return null;

  return (
    <div className="fixed left-4 right-4 bottom-24 z-50">
      <div className="bg-card border border-primary/30 rounded-2xl shadow-lg p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <RefreshCw className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{T("updateReady", "Update Ready")}</p>
          <p className="text-xs text-muted-foreground leading-snug">
            {T("updateReadyDesc", "A new version of Rayma AI is available. Refresh to get the latest improvements.")}
          </p>
        </div>
        <button
          onClick={refreshNow}
          className="text-xs font-bold text-primary-foreground bg-primary rounded-xl px-3 py-2 shrink-0"
        >
          {T("refreshNow", "Refresh")}
        </button>
        <button
          onClick={() => { dismissed.current = true; setUpdateReady(false); }}
          aria-label={T("dismissLabel", "Dismiss")}
          className="text-muted-foreground shrink-0 p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}