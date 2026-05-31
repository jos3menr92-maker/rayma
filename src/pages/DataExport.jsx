import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Download, Shield, FileJson, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function DataExport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleExport() {
    setLoading(true);
    const response = await base44.functions.invoke("exportUserData", {});
    setLoading(false);

    // The function returns JSON blob — trigger download
    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rayma-data-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDone(true);
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-8 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => navigate("/profile")} className="flex items-center gap-1 text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors">
          ← Back to Profile
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <FileJson className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-foreground mb-2">Export Your Data</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Download a complete copy of all your RAYMA data — loans, bills, transactions, budgets, and more.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 mb-6 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">What's included</p>
          {["Loans & balances", "Bills & subscriptions", "Payment history", "Transactions", "Budget categories", "Assets & net worth", "Savings goals", "Weekly income records", "AI memory preferences"].map(item => (
            <div key={item} className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              {item}
            </div>
          ))}
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            This is your right under <strong>GDPR Article 20</strong> (Right to Data Portability) and <strong>CCPA</strong>. Your data is exported as a JSON file and is only accessible to you.
          </p>
        </div>

        {done ? (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <p className="text-sm font-medium text-green-800 dark:text-green-300">Export downloaded successfully!</p>
          </div>
        ) : (
          <Button className="w-full rounded-2xl h-12 text-base gap-2" onClick={handleExport} disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {loading ? "Preparing export…" : "Download My Data"}
          </Button>
        )}

        <p className="text-center text-xs text-muted-foreground mt-4">
          To permanently delete your account and all data, visit{" "}
          <button onClick={() => navigate("/delete-account")} className="text-destructive underline">Delete Account</button>.
        </p>
      </motion.div>
    </div>
  );
}