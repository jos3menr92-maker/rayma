import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useT } from "@/lib/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, Lock, Loader2, ShieldCheck, Headset, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

export default function DiagnosticsGate({ onUnlock }) {
  const T = useT();
  const [pin, setPin] = useState(null);
  const [timeLeft, setTimeLeft] = useState(900);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  // Single interval — only created once when PIN is set, not re-created every second
  useEffect(() => {
    if (!pin) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setPin(null);
          return 900;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pin]);

  const generatePin = () => {
    const num = Math.floor(100000 + Math.random() * 900000).toString();
    setPin(`${num.substring(0, 3)}-${num.substring(3, 6)}`);
    setTimeLeft(900);
    setError("");
  };

  const handleUnlock = async () => {
    setVerifying(true);
    setError("");
    try {
      const res = await base44.functions.invoke("verifyDebugPassword", { password });
      if (res.data?.valid) {
        onUnlock();
      } else {
        setError(T("invalidDebugCode", "Invalid code. Please try again."));
      }
    } catch (err) {
      setError(err.message || T("verificationFailed", "Verification failed."));
    } finally {
      setVerifying(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6">
      {/* Header */}
      <div className="border-b border-border pb-4 mb-5">
        <h2 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
          <Headset className="w-6 h-6 text-primary" /> {T("diagnosticsConsole", "Diagnostics Console")}
        </h2>
        <p className="text-muted-foreground text-sm mt-2">
          {T("consoleDesc", "Two-step verification unlocks the scan and repair tools below.")}
        </p>
      </div>

      {/* Barrier 1: PIN */}
      <div className="text-center bg-primary/5 rounded-xl p-6 border border-primary/20 mb-4">
        <h3 className="text-base font-semibold text-foreground mb-2 flex items-center justify-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" /> {T("barrier1", "Step 1 — Generate Access PIN")}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {T("pinDesc", "Generate a temporary PIN to begin the verification process.")}
        </p>
        {pin ? (
          <div>
            <div className="text-4xl font-bold tracking-widest text-primary font-mono mb-2">{pin}</div>
            {timeLeft > 0 && (
              <p className="text-sm text-destructive font-medium">
                {T("expiresIn", "Expires in")} {minutes}:{seconds.toString().padStart(2, "0")}
              </p>
            )}
          </div>
        ) : (
          <Button onClick={generatePin} variant="secondary" size="default" className="text-base">
            <RefreshCw className="w-4 h-4 mr-1.5" /> {T("generatePin", "Generate PIN")}
          </Button>
        )}
      </div>

      {/* Barrier 2: Debug Password */}
      {pin && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-muted/40 rounded-xl p-6 border border-border"
        >
          <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" /> {T("barrier2", "Step 2 — Enter Debug Code")}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            {T("debugCodeDesc", "Enter the diagnostic code provided by Rayma AI support.")}
          </p>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder={T("enterDebugCode", "Enter debug code…")}
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={verifying}
              className="text-base"
              onKeyDown={e => e.key === "Enter" && password && handleUnlock()}
            />
            <Button onClick={handleUnlock} disabled={verifying || !password} className="shrink-0" size="default">
              {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </motion.div>
      )}

      {/* Privacy note */}
      <div className="bg-muted rounded-lg p-4 border border-border mt-4">
        <div className="flex gap-3">
          <span className="text-lg shrink-0">🛡️</span>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {T("privacyGuard", "Privacy Guard: The console scans table connectivity and can seed test data to verify your Supabase sync. No sensitive account numbers or passwords are exposed. Lock the console at any time.")}
          </p>
        </div>
      </div>
    </div>
  );
}