import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useFinancialData } from "@/lib/FinancialDataContext"; // 🧠 SECURE BRAIN

// 🚀 FIXED: Merged all icons into one single, clean import line!
import { X, Landmark, PiggyBank, PieChart, TrendingDown, FolderOpen, TrendingUp, BarChart2, CalendarDays, FileText, Bell, User, Heart, ShieldCheck, Trash2, Headset, AlertTriangle, Download } from "lucide-react";

const moreItems = [
  { path: "/bank-accounts", icon: Landmark, label: "Bank Accounts", desc: "Manage accounts & transactions" },
  { path: "/budget", icon: PiggyBank, label: "Savings Vault", desc: "Track and grow your savings" }, // 🐷 KEPT YOUR SAVINGS VAULT!
  { path: "/budget-dashboard", icon: PieChart, label: "Budget Dashboard", desc: "Advanced category tracking" }, // ✨ RECOVERED!
  { path: "/debt-simulator", icon: TrendingDown, label: "Debt Simulator", desc: "Plan your payoff strategy" },
  { path: "/documents", icon: FolderOpen, label: "Document Vault", desc: "Store & scan financial docs" },
  { path: "/monthly-recap", icon: CalendarDays, label: "Monthly Recap", desc: "Income & spending summary" },
  { path: "/assets", icon: BarChart2, label: "Assets & Net Worth", desc: "Track what you own" },
  { path: "/data-export", icon: Download, label: "Export Data", desc: "Download your RAYMA records" }, // ✨ ADDED!
  { path: "/trend", icon: TrendingUp, label: "Monthly Trend", desc: "Spending trends over time" },
  { path: "/tax-summary", icon: FileText, label: "Tax Summary", desc: "Annual report & deductibles" },
  { path: "/reminders", icon: Bell, label: "Reminders", desc: "Payment reminders" },
  { path: "/user-profile", icon: User, label: "Profile", desc: "Settings & preferences" },
  { path: "/security", icon: ShieldCheck, label: "Security Audit", desc: "Verify data safety & defenses" },
  { path: "/support", icon: Heart, label: "Support RAYMA", desc: "Get Annual Pass or AI token packs", highlight: true },
  { path: "/delete-account", icon: Trash2, label: "Delete Account", desc: "Permanently erase your data & profile", isDelete: true },
  { path: "/admin", icon: ShieldCheck, label: "Admin Panel", desc: "App oversight & metrics", adminOnly: true },
  { path: "/remote-support", icon: Headset, label: "Live Remote Assistance", desc: "Generate a secure pin for developer support" },
];

export default function MoreMenu({ open, onClose }) {
  const navigate = useNavigate();
  const { userProfile } = useFinancialData(); // 🔒 Safe fetch from Supabase Context
  const isAdmin = userProfile?.role === "admin";
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const visibleItems = moreItems.filter(item => !item.adminOnly || isAdmin);

  function go(path) {
    if (path === "/delete-account") {
      setShowDeleteConfirm(true);
      return;
    }
    navigate(path);
    onClose();
  }

  function confirmDeletion() {
    setShowDeleteConfirm(false);
    navigate("/profile?action=delete");
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
                    <button key={item.path} onClick={() => go(item.path)} className={`flex items-start gap-3 p-3 rounded-2xl border transition-all text-left ${item.isDelete ? "bg-destructive/5 border-destructive/20 hover:border-destructive hover:bg-destructive/10" : item.highlight ? "bg-primary/5 border-primary/30 hover:border-primary hover:bg-primary/10" : "bg-background border-border hover:border-primary/40 hover:bg-primary/5"}`}>
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

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-card relative z-10 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-border">
            <div className="flex items-center gap-3 mb-4 text-destructive">
              <div className="p-2 bg-destructive/10 rounded-full shrink-0"><AlertTriangle className="w-6 h-6" /></div>
              <h3 className="text-xl font-bold">Delete Account?</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">Are you absolutely sure you want to delete your account? This action is <strong className="text-foreground">permanent</strong> and cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">Cancel</button>
              <button onClick={confirmDeletion} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm">Yes, Delete</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
