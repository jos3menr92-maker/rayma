import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useFinancialData } from "@/lib/FinancialDataContext"; 
import { useT } from "@/lib/LanguageContext";

// 🚀 FIXED: Merged all icons into one single, clean import line!
import { X, Landmark, PiggyBank, PieChart, TrendingDown, FolderOpen, TrendingUp, BarChart2, CalendarDays, FileText, Bell, User, Heart, ShieldCheck, Trash2, Headset, Download, MessageSquare, CreditCard,} from "lucide-react";

const moreItems = [
  { path: "/loans", icon: CreditCard, labelKey: "loans", labelFallback: "Loans & Debt", descKey: "manageActiveLoans", descFallback: "Manage your active loans" },
  { path: "/bank-accounts", icon: Landmark, labelKey: "bankAccounts", labelFallback: "Bank Accounts", descKey: "manageAccountsTransactions", descFallback: "Manage accounts & transactions" },
  { path: "/budget", icon: PiggyBank, labelKey: "savingsVault", labelFallback: "Savings Vault", descKey: "trackGrowSavings", descFallback: "Track and grow your savings" }, 
  { path: "/budget-dashboard", icon: PieChart, labelKey: "budgetDashboard", labelFallback: "Budget Dashboard", descKey: "advancedCategoryTracking", descFallback: "Advanced category tracking" }, 
  { path: "/debt-simulator", icon: TrendingDown, labelKey: "debtSimulator", labelFallback: "Debt Simulator", descKey: "planPayoffStrategy", descFallback: "Plan your payoff strategy" },
  { path: "/documents", icon: FolderOpen, labelKey: "documentVault", labelFallback: "Document Vault", descKey: "storeScanFinancialDocs", descFallback: "Store & scan financial docs" },
  { path: "/monthly-recap", icon: CalendarDays, labelKey: "monthlyRecap", labelFallback: "Monthly Recap", descKey: "summary", descFallback: "Income & spending summary" },
  { path: "/assets", icon: BarChart2, labelKey: "assetsAndNetWorth", labelFallback: "Assets & Net Worth", descKey: "trackWhatYouOwn", descFallback: "Track what you own" },
  // 🛡️ ROUTED TO VAULT
  { path: "/profile", icon: Download, labelKey: "exportMyData", labelFallback: "Export Data", descKey: "goToSecurityVault", descFallback: "Go to Security Vault" }, 
  { path: "/trend", icon: TrendingUp, labelKey: "monthlyTrend", labelFallback: "Monthly Trend", descKey: "spendingTrendsOverTime", descFallback: "Spending trends over time" },
  { path: "/tax-summary", icon: FileText, labelKey: "taxSummary", labelFallback: "Tax Summary", descKey: "annualReportDeductibles", descFallback: "Annual report & deductibles" },
  { path: "/reminders", icon: Bell, labelKey: "reminders", labelFallback: "Reminders", descKey: "paymentReminders", descFallback: "Payment reminders" },
  { path: "/profile", icon: User, labelKey: "profile", labelFallback: "Profile", descKey: "settingsPreferences", descFallback: "Settings & preferences" },
  { path: "/security", icon: ShieldCheck, labelKey: "securityAudit", labelFallback: "Security Audit", descKey: "verifyDataSafetyDefenses", descFallback: "Verify data safety & defenses" },
  { path: "/store", icon: Heart, labelKey: "store", labelFallback: "Store", descKey: "annualPassOrTokens", descFallback: "Get Annual Pass or AI token packs", highlight: true },
  { path: "/admin", icon: ShieldCheck, labelKey: "adminPanel", labelFallback: "Admin Panel", descKey: "appOversightMetrics", descFallback: "App oversight & metrics", adminOnly: true },
  { path: "/remote-support", icon: Headset, labelKey: "liveRemoteAssistance", labelFallback: "Live Remote Assistance", descKey: "securePinSupport", descFallback: "Generate a secure pin for developer support" },
  { path: "/feedback", icon: MessageSquare, labelKey: "submitFeedback", labelFallback: "Submit Feedback", descKey: "reportBugsSuggestFeatures", descFallback: "Report bugs or suggest features" },
  // 🛡️ ROUTED TO VAULT
  { path: "/profile", icon: Trash2, labelKey: "deleteAccountLabel", labelFallback: "Delete Account", descKey: "goToSecurityVault", descFallback: "Go to Security Vault", isDelete: true }
];

export default function MoreMenu({ open, onClose }) {
  const navigate = useNavigate();
  const T = useT();
  const { userProfile } = useFinancialData(); 
  const isAdmin = userProfile?.role === "admin";

  const visibleItems = moreItems.filter(item => !item.adminOnly || isAdmin);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  // 🧹 CLEANED: Removed the rogue popup logic. It just routes smoothly now.
  function go(path) {
    navigate(path);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl border-t border-border shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-muted-foreground/30" /></div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h2 className="text-base font-bold font-heading text-foreground">{T("allFeatures", "All Features")}</h2>
              <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 pb-28">
              <div className="grid grid-cols-2 gap-3">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const label = T(item.labelKey, item.labelFallback);
                  const desc = T(item.descKey, item.descFallback);
                  return (
                    <button key={`${item.path}-${item.labelKey}`} onClick={() => go(item.path)} className={`flex items-start gap-3 p-3 rounded-2xl border transition-all text-left ${item.isDelete ? "bg-destructive/5 border-destructive/20 hover:border-destructive hover:bg-destructive/10" : item.highlight ? "bg-primary/5 border-primary/30 hover:border-primary hover:bg-primary/10" : "bg-background border-border hover:border-primary/40 hover:bg-primary/5"}`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.isDelete ? "bg-destructive/10" : item.highlight ? "bg-primary/20" : "bg-primary/10"}`}>
                        <Icon className={`w-4 h-4 ${item.isDelete ? "text-destructive" : "text-primary"}`} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold leading-tight ${item.isDelete ? "text-destructive" : "text-foreground"}`}>{label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}