import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DiagnosticsGate from "./DiagnosticsGate";
import TableScanPanel from "./TableScanPanel";
import SecurityAudit from "@/pages/SecurityAudit";
import { useT } from "@/lib/LanguageContext";
import { Button } from "@/components/ui/button";
import { Database, ShieldCheck, Lock } from "lucide-react";

export default function DiagnosticsConsole() {
  const T = useT();
  const [unlocked, setUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState("scan");

  return (
    <AnimatePresence mode="wait">
      {!unlocked ? (
        <motion.div
          key="gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <DiagnosticsGate onUnlock={() => setUnlocked(true)} />
        </motion.div>
      ) : (
        <motion.div
          key="panel"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Tab Selector */}
          <div className="flex gap-2 mb-4 bg-card border border-border rounded-2xl p-1.5">
            <button
              onClick={() => setActiveTab("scan")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === "scan" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Database className="w-4 h-4" /> {T("tableScan", "Table Scan")}
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === "audit" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> {T("securityAudit", "Security Audit")}
            </button>
          </div>

          {/* Active Tab Content */}
          {activeTab === "scan" ? (
            <TableScanPanel onLock={() => setUnlocked(false)} />
          ) : (
            <div>
              <SecurityAudit />
              <div className="flex justify-center mt-4">
                <Button onClick={() => setUnlocked(false)} variant="outline" className="rounded-xl gap-2">
                  <Lock className="w-4 h-4" /> {T("lockConsole", "Lock Console")}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}