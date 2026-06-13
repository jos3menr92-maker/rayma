import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, Receipt, DollarSign, PiggyBank, TrendingDown, ArrowLeftRight, ScanLine } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function QuickAddMenu({ open, onClose }) {
  const navigate = useNavigate();

  const actions = [
    { key: "scan", icon: ScanLine, label: "Scan & Log Document", color: "bg-primary/10 text-primary border-primary/20", badge: "AI", action: () => { onClose(); navigate("/documents"); } },
    { key: "loan", icon: CreditCard, label: "Add Loan", color: "bg-blue-500/10 text-blue-600 border-blue-200", action: () => { onClose(); navigate("/add-loan"); } },
    { key: "bill", icon: Receipt, label: "Add Bill", color: "bg-orange-500/10 text-orange-600 border-orange-200", action: () => { onClose(); navigate("/bills"); } },
    
    // 🚀 FIXED: Now sends user directly to the Finance Overview for the Payday log
    { key: "income", icon: DollarSign, label: "Log Income", color: "bg-green-500/10 text-green-600 border-green-200", action: () => { onClose(); navigate("/finance"); } }, 
    
    // 🚀 FIXED: Routes to the dedicated savings page
    { key: "savings", icon: PiggyBank, label: "Add Savings Goal", color: "bg-purple-500/10 text-purple-600 border-purple-200", action: () => { onClose(); navigate("/savings"); } }, 
    
    { key: "payment", icon: TrendingDown, label: "Record Payment", color: "bg-red-500/10 text-red-600 border-red-200", action: () => { onClose(); navigate("/loans"); } },
    
    // 🚀 FIXED: Routes to the Bank Accounts page where Plaid will live!
    { key: "transaction", icon: ArrowLeftRight, label: "Log Transaction", color: "bg-teal-500/10 text-teal-600 border-teal-200", action: () => { onClose(); navigate("/bank-accounts"); } }, 
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl border-t border-border shadow-2xl pb-10"
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div>
                <h2 className="text-base font-bold font-heading text-foreground">Quick Add</h2>
                <p className="text-xs text-muted-foreground">What would you like to track?</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 pb-2 grid grid-cols-1 gap-2">
              {actions.map((a, i) => {
                const Icon = a.icon;
                return (
                  <motion.button
                    key={a.key}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={a.action}
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl border text-left transition-all active:scale-[0.98] ${a.color}`}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/60">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-sm">{a.label}</span>
                    {a.badge && (
                      <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">{a.badge}</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
