import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useT } from "@/lib/LanguageContext";
import { Button } from "@/components/ui/button";
import { Database, Loader2, CheckCircle2, XCircle, FlaskConical, RefreshCw, Beaker, Lock } from "lucide-react";
import { motion } from "framer-motion";

export default function TableScanPanel({ onLock }) {
  const T = useT();
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResults, setSeedResults] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmResults, setConfirmResults] = useState(null);
  const [error, setError] = useState("");

  const runScan = async () => {
    setScanning(true);
    setError("");
    setScanResults(null);
    setConfirmResults(null);
    try {
      const res = await base44.functions.invoke("auditSupabaseTables", {});
      setScanResults(res.data);
    } catch (err) {
      setError(err.message || T("scanFailed", "Scan failed."));
    } finally {
      setScanning(false);
    }
  };

  const runSeed = async () => {
    setSeeding(true);
    setError("");
    setSeedResults(null);
    try {
      const res = await base44.functions.invoke("seedTestData", {});
      setSeedResults(res.data);
    } catch (err) {
      setError(err.message || T("seedFailed", "Seeding failed."));
    } finally {
      setSeeding(false);
    }
  };

  const runConfirm = async () => {
    setConfirming(true);
    setError("");
    setConfirmResults(null);
    try {
      const res = await base44.functions.invoke("auditSupabaseTables", {});
      setConfirmResults(res.data);
    } catch (err) {
      setError(err.message || T("confirmFailed", "Confirmation scan failed."));
    } finally {
      setConfirming(false);
    }
  };

  const renderTableGrid = (results, label) => {
    const tables = results?.tableResults || {};
    const summary = results?.summary || {};
    const tableNames = Object.keys(tables);

    if (tableNames.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">{label}</p>
          <p className="text-xs font-medium text-muted-foreground">
            {summary.ok ?? 0}/{summary.total ?? tableNames.length} {T("tablesOk", "OK")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {tableNames.map(name => {
            const t = tables[name];
            const isOk = t?.status === "OK";
            return (
              <div
                key={name}
                className={`rounded-lg border p-2.5 flex items-center gap-2 ${
                  isOk ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/20"
                }`}
              >
                {isOk ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-foreground truncate">{name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {isOk ? `${t.rowCount ?? 0} ${T("rows", "rows")}` : T("error", "Error")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSeedResults = () => {
    if (!seedResults?.seeded) return null;
    const entries = Object.entries(seedResults.seeded);

    return (
      <div className="mb-4">
        <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-2">
          {T("seedResults", "Seed Results")}
        </p>
        <div className="space-y-1.5">
          {entries.map(([table, result]) => {
            const isError = String(result).startsWith("Error");
            return (
              <div
                key={table}
                className={`flex items-center justify-between rounded-lg border p-2.5 ${
                  isError ? "bg-destructive/5 border-destructive/20" : "bg-primary/5 border-primary/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isError ? (
                    <XCircle className="w-3.5 h-3.5 text-destructive" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  )}
                  <span className="text-[11px] font-semibold text-foreground">{table}</span>
                </div>
                <span className={`text-[11px] ${isError ? "text-destructive" : "text-primary"}`}>{result}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      {/* Header with lock button */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold font-heading text-foreground flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" /> {T("scanAndRepair", "Scan & Repair")}
        </h3>
        <button
          onClick={onLock}
          className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
        >
          <Lock className="w-3 h-3" /> {T("lock", "Lock")}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Step 1: Scan */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">1</span>
            {T("runFullScan", "Run Full Table Scan")}
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground mb-2">
          {T("scanDesc", "Scans all 19 Supabase tables for connectivity, row counts, and schema issues.")}
        </p>
        <Button onClick={runScan} disabled={scanning} variant="secondary" size="sm" className="w-full">
          {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
          {scanning ? T("scanning", "Scanning…") : T("runScan", "Run Scan")}
        </Button>
        {scanResults && renderTableGrid(scanResults, T("scanResultsLabel", "Table Status"))}
      </div>

      {/* Step 2: Seed */}
      {scanResults && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">2</span>
            {T("seedTestData", "Seed Test Data")}
          </p>
          <p className="text-[11px] text-muted-foreground mb-2">
            {T("seedDesc", "Inserts test records across 8 tables (loans, bills, transactions, assets, etc.) to verify the Supabase write connection.")}
          </p>
          <Button onClick={runSeed} disabled={seeding} size="sm" className="w-full">
            {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <FlaskConical className="w-3.5 h-3.5 mr-1" />}
            {seeding ? T("seeding", "Seeding…") : T("seedData", "Seed Test Data")}
          </Button>
          {seedResults && renderSeedResults()}
        </motion.div>
      )}

      {/* Step 3: Confirm */}
      {seedResults && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">3</span>
            {T("confirmConnection", "Confirm Connection")}
          </p>
          <p className="text-[11px] text-muted-foreground mb-2">
            {T("confirmDesc", "Re-scans tables to verify seeded data landed in Supabase.")}
          </p>
          <Button onClick={runConfirm} disabled={confirming} size="sm" className="w-full">
            {confirming ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
            {confirming ? T("confirming", "Confirming…") : T("confirmNow", "Confirm Now")}
          </Button>
          {confirmResults && (
            <div className="mt-3">
              {renderTableGrid(confirmResults, T("confirmedCounts", "Confirmed Counts"))}
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2 mt-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <p className="text-xs font-medium text-green-800 dark:text-green-300">
                  {T("connectionVerified", "Connection verified — test data confirmed in Supabase.")}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}