import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Trash2, ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";

export default function DeleteAccount() {
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const [step, setStep] = useState("confirm"); // confirm | deleting | done
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (confirmText.toLowerCase() !== "delete my account") {
      setError(T("pleaseTypeConfirm", 'Please type "delete my account" to confirm.'));
      return;
    }
    setError("");
    setStep("deleting");

    // Delete all user data entities
    try {
      const [loans, bills, payments, transactions, bankAccounts, assets, savingsGoals,
             budgetCategories, weeklyIncome, netWorthSnapshots, userMemories, scannedDocs, loanAdjustments] =
        await Promise.all([
          base44.entities.Loan.list(),
          base44.entities.Bill.list(),
          base44.entities.Payment.list(),
          base44.entities.Transaction.list(),
          base44.entities.BankAccount.list(),
          base44.entities.Asset.list(),
          base44.entities.SavingsGoal.list(),
          base44.entities.BudgetCategory.list(),
          base44.entities.WeeklyIncome.list(),
          base44.entities.NetWorthSnapshot.list(),
          base44.entities.UserMemory.list(),
          base44.entities.ScannedDocument.list(),
          base44.entities.LoanAdjustment.list(),
        ]);

      await Promise.all([
        ...loans.map(r => base44.entities.Loan.delete(r.id)),
        ...bills.map(r => base44.entities.Bill.delete(r.id)),
        ...payments.map(r => base44.entities.Payment.delete(r.id)),
        ...transactions.map(r => base44.entities.Transaction.delete(r.id)),
        ...bankAccounts.map(r => base44.entities.BankAccount.delete(r.id)),
        ...assets.map(r => base44.entities.Asset.delete(r.id)),
        ...savingsGoals.map(r => base44.entities.SavingsGoal.delete(r.id)),
        ...budgetCategories.map(r => base44.entities.BudgetCategory.delete(r.id)),
        ...weeklyIncome.map(r => base44.entities.WeeklyIncome.delete(r.id)),
        ...netWorthSnapshots.map(r => base44.entities.NetWorthSnapshot.delete(r.id)),
        ...userMemories.map(r => base44.entities.UserMemory.delete(r.id)),
        ...scannedDocs.map(r => base44.entities.ScannedDocument.delete(r.id)),
        ...loanAdjustments.map(r => base44.entities.LoanAdjustment.delete(r.id)),
      ]);

      // Log deletion for GDPR/CCPA audit trail
      console.log(`[GDPR/CCPA AUDIT] Account deletion initiated at ${new Date().toISOString()}`);
      setStep("done");
      // Sign out after a brief moment
      setTimeout(() => base44.auth.logout(), 3000);
    } catch (err) {
      setStep("confirm");
      setError(T("deleteError", "Something went wrong. Please try again or contact support@raymaapp.com"));
    }
  };

  if (step === "done") {
    return (
      <div className="max-w-lg mx-auto px-4 pt-16 pb-24 flex flex-col items-center text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold font-heading mb-2">{T("accountDeleted", "Account Deleted")}</h1>
          <p className="text-sm text-muted-foreground">
            {T("allDataRemoved", "All your data has been removed. You will be signed out shortly.")}
          </p>
        </motion.div>
      </div>
    );
  }

  if (step === "deleting") {
    return (
      <div className="max-w-lg mx-auto px-4 pt-16 pb-24 flex flex-col items-center text-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">{T("deletingData", "Deleting your data...")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

        <Link to="/profile" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 w-fit">
          <ArrowLeft className="w-4 h-4" /> {T("backToProfile", "Back to Profile")}
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-heading text-foreground">{T("deleteAccount", "Delete Account")}</h1>
            <p className="text-xs text-muted-foreground">{T("permanentAction", "This action is permanent and cannot be undone")}</p>
          </div>
        </div>

        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 mb-6 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
            <p className="font-semibold text-foreground">{T("dataWillBeDeleted", "The following data will be permanently deleted:")}</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>{T("allLoans", "All loans and payment history")}</li>
              <li>{T("allBills", "All bills and recurring expenses")}</li>
              <li>{T("allTransactions", "All transactions and bank accounts")}</li>
              <li>{T("budgetAndGoals", "Budget categories and savings goals")}</li>
              <li>{T("documentsFiles", "Documents and scanned files")}</li>
              <li>{T("aiMemory", "RAYMA AI memory and preferences")}</li>
            </ul>
            <p className="mt-2">{T("accountDeactivated", "Your account login will be deactivated and all data removed within 30 days.")}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">
              {T("typeToConfirm", "Type")} <span className="font-bold text-destructive">delete my account</span> {T("toConfirm", "to confirm:")}
            </p>
            <Input
              value={confirmText}
              onChange={(e) => { setConfirmText(e.target.value); setError(""); }}
              placeholder="delete my account"
              className="rounded-xl"
            />
            {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
          </div>

          <Button
            variant="destructive"
            className="w-full rounded-xl h-11 font-semibold"
            onClick={handleDelete}
            disabled={confirmText.toLowerCase() !== "delete my account"}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {T("permanentlyDelete", "Permanently Delete My Account")}
          </Button>

          <Link to="/profile">
            <Button variant="outline" className="w-full rounded-xl h-11">
              {T("cancelKeepAccount", "Cancel — Keep My Account")}
            </Button>
          </Link>
        </div>

      </motion.div>
    </div>
  );
}