import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Landmark, PieChart, TrendingDown, FolderOpen, TrendingUp, BarChart2, CalendarDays, FileText, Bell, User, Heart, ShieldCheck, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const moreItems = [
  { path: "/bank-accounts", icon: Landmark, label: "Bank Accounts", desc: "Manage accounts & transactions" },
  { path: "/budget", icon: PieChart, label: "Budget", desc: "Track spending by category" },
  { path: "/debt-simulator", icon: TrendingDown, label: "Debt Simulator", desc: "Plan your payoff strategy" },
  { path: "/documents", icon: FolderOpen, label: "Document Vault", desc: "Store & scan financial docs" },
  { path: "/monthly-recap", icon: CalendarDays, label: "Monthly Recap", desc: "Income & spending summary" },
  { path: "/assets", icon: BarChart2, label: "Assets & Net Worth", desc: "Track what you own" },
  { path: "/trend", icon: TrendingUp, label: "Monthly Trend", desc: "Spending trends over time" },
  { path: "/tax-summary", icon: FileText, label: "Tax Summary", desc: "Annual report & deductibles" },
  { path: "/calendar", icon: Calendar, label: "Bill Calendar", desc: "View upcoming due dates" },
  { path: "/reminders", icon: Bell, label: "Reminders", desc: "Payment reminders" },
  { path: "/profile", icon: User, label: "Profile", desc: "Settings & preferences" },
  { path: "/security", icon: ShieldCheck, label: "Security Audit", desc: "Verify data safety & defenses" },
  { path: "/support", icon: Heart, label: "Support RAYMA", desc: "Get Annual Pass or AI token packs", highlight: true },
  { path: "/admin", icon: ShieldCheck, label: "Admin Panel", desc: "App oversight & metrics", adminOnly: true },
];

export default function MoreMenu({ open, onClose }) {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (open) base44.auth.me().then(u => setIsAdmin(u?.role === "admin"));
  }, [open]);

  const visibleItems = moreItems.filter(item => !item.adminOnly || isAdmin);

  function go(path) {
    navigate(path);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl border-t border-border shadow-2xl max-h-[80vh] flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h2 className="text-base font-bold font-heading text-foreground">All Features</h2>
              <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Items grid */}
            <div className="overflow-y-auto flex-1 p-4">
              <div className="grid grid-cols-2 gap-3">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => go(item.path)}
                      className={`flex items-start gap-3 p-3 rounded-2xl border transition-all text-left ${item.highlight ? "bg-primary/5 border-primary/30 hover:border-primary hover:bg-primary/10" : "bg-background border-border hover:border-primary/40 hover:bg-primary/5"}`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.highlight ? "bg-primary/20" : "bg-primary/10"}`}>
                        <Icon className={`w-4 h-4 ${item.highlight ? "text-primary" : "text-primary"}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight">{item.label}</p>
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