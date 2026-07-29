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

  useEffect(() => {
    let timer;
    if (pin && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(p => p - 1), 1000);
    } else if (pin && timeLeft === 0) {
      setPin(null);
      setTimeLeft(900);
    }
    return () => clearInterval(timer);
  }, [pin, timeLeft]);

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
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Headset className="w-5 h-5 text-primary" /> {T("diagnosticsConsole", "Diagnostics Console")}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {T("consoleDesc", "Scan and repair mode for troubleshooting account data and Supabase connectivity.")}
        </p>
      </div>

      {/* Barrier 1: PIN */}
      <div className="text-center bg-primary/5 rounded-xl p-5 border border-primary/20 mb-4">
        <h3 className="text-sm font-medium text-foreground mb-2 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" /> {T("barrier1", "Barrier 1 — Generate Access PIN")}
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          {T("pinDesc", "Generate a temporary PIN to begin the verification process.")}
        </p>
        {pin ? (
          <div>
            <div className="text-3xl font-bold tracking-widest text-primary font-mono mb-2">{pin}</div>
            {timeLeft > 0 && (
              <p className="text-xs text-destructive font-medium">
                {T("expiresIn", "Expires in")} {minutes}:{seconds.toString().padStart(2, "0")}
              </p>
            )}
          </div>
        ) : (
          <Button onClick={generatePin} variant="secondary" size="sm">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> {T("generatePin", "Generate PIN")}
          </Button>
        )}
      </div>

      {/* Barrier 2: Debug Password */}
      {pin && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-muted/40 rounded-xl p-5 border border-border"
        >
          <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> {T("barrier2", "Barrier 2 — Enter Debug Code")}
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            {T("debugCodeDesc", "Enter the diagnostic code provided by Rayma AI support.")}
          </p>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder={T("enterDebugCode", "Enter debug code…")}
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={verifying}
              onKeyDown={e => e.key === "Enter" && password && handleUnlock()}
            />
            <Button onClick={handleUnlock} disabled={verifying || !password} className="shrink-0">
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            </Button>
          </div>
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        </motion.div>
      )}

      {/* Privacy note */}
      <div className="bg-muted rounded-lg p-4 border border-border mt-4">
        <div className="flex gap-3">
          <span className="text-lg shrink-0">🛡️</span>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {T("privacyGuard", "Privacy Guard: The console scans table connectivity and can seed test data to verify your Supabase sync. No sensitive account numbers or passwords are exposed. Lock the console at any time.")}
          </p>
        </div>
      </div>
    </div>
  );
}