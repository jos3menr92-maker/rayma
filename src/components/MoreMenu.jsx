import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useFinancialData } from "@/lib/FinancialDataContext"; 

// 🚀 FIXED: Merged all icons into one single, clean import line!
import { X, Landmark, PiggyBank, PieChart, TrendingDown, FolderOpen, TrendingUp, BarChart2, CalendarDays, FileText, Bell, User, Heart, ShieldCheck, Trash2, Headset, AlertTriangle, Download, MessageSquare, CreditCard,} from "lucide-react";

const moreItems = [
  { path: "/loans", icon: CreditCard, label: "Loans & Debt", desc: "Manage your active loans" },
  { path: "/bank-accounts", icon: Landmark, label: "Bank Accounts", desc: "Manage accounts & transactions" },
  { path: "/budget", icon: PiggyBank, label: "Savings Vault", desc: "Track and grow your savings" }, 
  { path: "/budget-dashboard", icon: PieChart, label: "Budget Dashboard", desc: "Advanced category tracking" }, 
  { path: "/debt-simulator", icon: TrendingDown, label: "Debt Simulator", desc: "Plan your payoff strategy" },
  { path: "/documents", icon: FolderOpen, label: "Document Vault", desc: "Store & scan financial docs" },
  { path: "/monthly-recap", icon: CalendarDays, label: "Monthly Recap", desc: "Income & spending summary" },
  { path: "/assets", icon: BarChart2, label: "Assets & Net Worth", desc: "Track what you own" },
  // 🛡️ ROUTED TO VAULT
  { path: "/profile", icon: Download, label: "Export Data", desc: "Go to Security Vault" }, 
  { path: "/trend", icon: TrendingUp, label: "Monthly Trend", desc: "Spending trends over time" },
  { path: "/tax-summary", icon: FileText, label: "Tax Summary", desc: "Annual report & deductibles" },
  { path: "/reminders", icon: Bell, label: "Reminders", desc: "Payment reminders" },
  { path: "/profile", icon: User, label: "Profile", desc: "Settings & preferences" },
  { path: "/security", icon: ShieldCheck, label: "Security Audit", desc: "Verify data safety & defenses" },
  { path: "/store", icon: Heart, label: "Store", desc: "Get Annual Pass or AI token packs", highlight: true },
  { path: "/admin", icon: ShieldCheck, label: "Admin Panel", desc: "App oversight & metrics", adminOnly: true },
  { path: "/remote-support", icon: Headset, label: "Live Remote Assistance", desc: "Generate a secure pin for developer support" },
  { path: "/feedback", icon: MessageSquare, label: "Submit Feedback", desc: "Report bugs or suggest features" },
  // 🛡️ ROUTED TO VAULT
  { path: "/profile", icon: Trash2, label: "Delete Account", desc: "Go to Security Vault", isDelete: true }
];

export default function MoreMenu({ open, onClose }) {
  const navigate = useNavigate();
  const { userProfile } = useFinancialData(); 
  const isAdmin = userProfile?.role === "admin";

  const visibleItems = moreItems.filter(item => !item.adminOnly || isAdmin);

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
              <h2 className="text-base font-bold font-heading text-foreground">All Features</h2>
              <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 pb-28">
              <div className="grid grid-cols-2 gap-3">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.label} onClick={() => go(item.path)} className={`flex items-start gap-3 p-3 rounded-2xl border transition-all text-left ${item.isDelete ? "bg-destructive/5 border-destructive/20 hover:border-destructive hover:bg-destructive/10" : item.highlight ? "bg-primary/5 border-primary/30 hover:border-primary hover:bg-primary/10" : "bg-background border-border hover:border-primary/40 hover:bg-primary/5"}`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.isDelete ? "bg-destructive/10" : item.highlight ? "bg-primary/20" : "bg-primary/10"}`}>
                        <Icon className={`w-4 h-4 ${item.isDelete ? "text-destructive" : "text-primary"}`} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold leading-tight ${item.isDelete ? "text-destructive" : "text-foreground"}`}>{item.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{item.desc}</p>
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
