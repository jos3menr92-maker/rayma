import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useT } from "@/lib/LanguageContext";

/**
 * PullToRefreshIndicator — the rotating spinner + status label shown above
 * page content while the user pulls down to refresh. Pair with usePullToRefresh.
 */
export default function PullToRefreshIndicator({ pullDistance, refreshing }) {
  const T = useT();
  return (
    <AnimatePresence>
      {(pullDistance > 10 || refreshing) && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: 48, marginBottom: 8 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="flex items-center justify-center gap-3"
        >
          <div
            className="relative w-7 h-7 flex items-center justify-center"
            style={{ transform: `rotate(${pullDistance * 4}deg)` }}
          >
            <RefreshCw
              className={`w-7 h-7 ${refreshing ? "animate-spin" : ""}`}
              style={{ color: refreshing || pullDistance > 50 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
            />
          </div>
          <span
            className={`text-sm font-medium ${refreshing || pullDistance > 50 ? "text-primary" : "text-muted-foreground"}`}
          >
            {refreshing
              ? T("refreshing", "Refreshing...")
              : pullDistance > 50
                ? T("releaseRefresh", "Release to refresh")
                : T("pullRefresh", "Pull to refresh")}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}