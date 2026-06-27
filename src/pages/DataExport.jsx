import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Download, Shield, FileJson, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { useFinancialData } from "@/lib/FinancialDataContext";

export default function DataExport() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const { userProfile, incomes, bills, loans } = useFinancialData();

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const EXPORT_ITEMS = [
    T("loansBalances", "Loans & balances"),
    T("billsSubscriptions", "Bills & subscriptions"),
    T("paymentHistory", "Payment history"),
    T("budgetCategories", "Budget categories"),
    T("weeklyIncomeRecords", "Weekly income records")
  ];

  async function handleExport() {
    setLoading(true);

    // Bundle all their data securely on the client side
    const exportData = {
      profile: userProfile,
      incomes,
      bills,
      loans,
      exported_at: new Date().toISOString()
    };

    // UX pause so it feels like a heavy download
    await new Promise(resolve => setTimeout(resolve, 800));

    // Generate the JSON file and trigger download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rayma-data-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    setLoading(false);
    setDone(true);
    setTimeout(() => setDone(false), 4000);
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-8 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => navigate("/profile")} className="flex items-center gap-1 text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors">
          ← {T("backToProfile", "Back to Profile")}
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <FileJson className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-foreground mb-2">{T("exportYourData", "Export Your Data")}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {T("exportDataDesc", "Download a complete copy of all your RAYMA data — loans, bills, transactions, and more.")}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 mb-6 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{T("whatsIncluded", "What's included")}</p>
          {EXPORT_ITEMS.map(item => (
            <div key={item} className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              {item}
            </div>
          ))}
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {T("gdprCcpaNote", "This is your right under GDPR Article 20 (Right to Data Portability) and CCPA. Your data is exported as a JSON file and is only accessible to you.")}
          </p>
        </div>

        {done ? (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <p className="text-sm font-medium text-green-800 dark:text-green-300">{T("exportSuccess", "Export downloaded successfully!")}</p>
          </div>
        ) : (
          <Button className="w-full rounded-2xl h-12 text-base gap-2 shadow-lg" onClick={handleExport} disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {loading ? T("preparingExport", "Preparing export…") : T("downloadMyData", "Download My Data")}
          </Button>
        )}

        <p className="text-center text-xs text-muted-foreground mt-4">
          {T("deleteAccountMsg", "To permanently delete your account and all data, visit")} {" "}
          <button onClick={() => navigate("/profile")} className="text-destructive underline">{T("deleteAccount", "Delete Account")}</button>.
        </p>
      </motion.div>
    </div>
  );
}
