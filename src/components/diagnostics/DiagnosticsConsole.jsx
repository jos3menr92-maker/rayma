import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DiagnosticsGate from "./DiagnosticsGate";
import TableScanPanel from "./TableScanPanel";

export default function DiagnosticsConsole() {
  const [unlocked, setUnlocked] = useState(false);

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
          <TableScanPanel onLock={() => setUnlocked(false)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}