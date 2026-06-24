import { Heart, ShieldCheck, Bell, User, Download, Trash2, PieChart, TrendingDown, CalendarDays, BarChart2, FolderOpen, TrendingUp, FileText, Headset, MessageSquare, PiggyBank } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { AnimatePresence, motion } from "framer-motion";

const moreItems = [
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
            
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <h2 className="font-semibold text-foreground">More Features</h2>
              <button onClick={onClose} className="text-muted-foreground text-sm">Close</button>
            </div>

            <div className="overflow-y-auto flex-1 p-3">
              <div className="grid gap-2">
                {visibleItems.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => go(item.path)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all ${
                        item.highlight
                          ? "bg-primary/10 border-primary/30"
                          : item.isDelete
                          ? "bg-destructive/5 border-destructive/20"
                          : "bg-card border-border hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.highlight ? "bg-primary/15" : item.isDelete ? "bg-destructive/10" : "bg-muted"}`}>
                          <Icon className={`w-4 h-4 ${item.isDelete ? "text-destructive" : item.highlight ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${item.isDelete ? "text-destructive" : "text-foreground"}`}>{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
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
