import React, { useState } from "react";
import DiagnosticsGate from "./DiagnosticsGate";
import TableScanPanel from "./TableScanPanel";
import { useT } from "@/lib/LanguageContext";

export default function DiagnosticsConsole() {
  const T = useT();
  const [unlocked, setUnlocked] = useState(false);

  if (!unlocked) {
    return <DiagnosticsGate onUnlock={() => setUnlocked(true)} />;
  }

  return <TableScanPanel onLock={() => setUnlocked(false)} />;
}