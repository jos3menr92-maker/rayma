import { Outlet, useLocation } from "react-router-dom";
import { useTabNavigation } from "@/hooks/useTabNavigation";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, CreditCard, Receipt, TrendingUp, Menu, MoreHorizontal, Sparkles } from "lucide-react";
import SideDrawer from "./SideDrawer";
import RaymaChat from "./RaymaChat";
import MoreMenu from "./MoreMenu";
import GlobalBatteryBar from "./GlobalBatteryBar";
import PushNotificationPrompt from "./PushNotificationPrompt";
import AppTour from "./AppTour";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useT } from "@/lib/LanguageContext";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { useBackHandler } from "@/hooks/useBackHandler";


export default function Layout() {
  const T = useT();
  const location = useLocation();
  const { activeTab, handleTabClick } = useTabNavigation();
  const { deletionCancelled, clearDeletionCancelled } = useAuth();
  const { toast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [raymaOpen, setRaymaOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const [raymaAutoOpen, setRaymaAutoOpen] = useState(false);
  const [raymaPrefillPrompt, setRaymaPrefillPrompt] = useState("");
  const [raymaGreeting, setRaymaGreeting] = useState(false);

  useBackHandler([
    { isOpen: drawerOpen, onClose: () => setDrawerOpen(false) },
    { isOpen: moreOpen, onClose: () => setMoreOpen(false) },
    { isOpen: raymaOpen, onClose: () => setRaymaOpen(false) },
  ]);

  // Welcome-back toast when a grace-period deletion is cancelled by re-login
  useEffect(() => {
    if (deletionCancelled) {
      toast({ title: T("welcomeBackDeletionCancelled", "Welcome back! Your account deletion has been cancelled and your data is restored.") });
      clearDeletionCancelled();
    }
  }, [deletionCancelled]);

  // 🧠 SECURE: Pulling the ENTIRE vault for the God-View
  const {
    loans,
    bills,
    incomes,
    payments = [], // Ready for the calendar/transactions
    assets = [], // Ready for net worth
    bankAccounts = [], // Ready for net worth and recent spending
    savingsGoals = [], // Ready for the Savings Vault
    transactions = [], // Ready for recent-spending lookup
    userProfile,
    addTransaction
  } = useFinancialData();

  useEffect(() => {
    try {
      const flag = sessionStorage.getItem("rayma_auto_open");
      if (flag === "true") {
        setRaymaAutoOpen(true);
        sessionStorage.removeItem("rayma_auto_open");
      }
    } catch (e) {}
  }, []);

  // Allow any page to open Rayma chat with an optional prefill prompt
  useEffect(() => {
    const handler = (e) => {
      setRaymaOpen(true);
      if (e?.detail?.prefill) setRaymaPrefillPrompt(e.detail.prefill);
      if (e?.detail?.greeting) setRaymaGreeting(true);
    };
    window.addEventListener("rayma:open", handler);
    return () => window.removeEventListener("rayma:open", handler);
  }, []);


  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <MoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} />
      
      <div className="sticky top-0 z-30 bg-card/80 backdrop-blur border-b border-border" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex items-center justify-between max-w-lg mx-auto px-4 h-14">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 border border-primary/10 shadow-sm"
              style={{ backgroundColor: "#0dcfba" }}>
              {!imageError ? (
                <img src="/icon-192.png" className="w-full h-full object-cover" alt={T("raymaAiLogo", "Rayma AI logo")} onError={() => setImageError(true)} />
              ) : (
                <span className="text-xs font-bold text-white">R</span>
              )}
            </div>
            <span className="text-sm font-semibold font-heading text-foreground tracking-wide">Rayma AI</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <GlobalBatteryBar />
            <button onClick={() => setDrawerOpen(true)} aria-label={T("openMenu", "Open Menu")} className="w-14 h-14 -mr-2 flex items-center justify-center flex-shrink-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted active:bg-muted transition-colors">
              <Menu className="w-7 h-7" />
            </button>
          </div>
        </div>
      </div>
      
      <main className="flex-1 pb-safe overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {!raymaOpen && (
        <motion.button
          drag
          dragMomentum={false}
          dragElastic={0.1}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.08 }}
          whileDrag={{ scale: 1.12, boxShadow: "0 12px 40px rgba(0,0,0,0.3)" }}
          onDragStart={(_, info) => {dragStartPos.current = { x: info.point.x, y: info.point.y };isDragging.current = false;}}
          onDrag={(_, info) => {
            const dx = Math.abs(info.point.x - dragStartPos.current.x);
            const dy = Math.abs(info.point.y - dragStartPos.current.y);
            if (dx > 5 || dy > 5) isDragging.current = true;
          }}
          onDragEnd={() => setTimeout(() => {isDragging.current = false;}, 100)}
          onClick={(e) => {if (isDragging.current) {e.preventDefault();return;}setRaymaOpen(true);}}
          style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
          id="rayma-fab"
          className="fixed right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 shadow-[0_4px_20px_rgba(56,189,248,0.35)] flex items-center justify-center cursor-grab active:cursor-grabbing"
          title={T("raymaChatButton", "Rayma AI — tap to chat, drag to move")}
          aria-label={T("raymaChatButton", "Rayma AI — tap to chat, drag to move")}>
          <Sparkles className="w-6 h-6 text-cyan-400 dark:text-cyan-600" />
        </motion.button>
      )}

      <PushNotificationPrompt />
      <AppTour onboardingComplete={userProfile?.onboarding_complete === true} />
      
      <nav id="bottom-nav" className="fixed bottom-0 left-0 right-0 bg-card border-t border-border backdrop-blur-xl bg-opacity-90 z-50" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-between max-w-lg mx-auto px-4 h-16">
          <button onClick={() => handleTabClick("home")} className={`flex flex-col items-center gap-0.5 w-12 ${activeTab === "home" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-medium">{T("dashboard", "Home")}</span>
          </button>
          <button onClick={() => handleTabClick("finance")} className={`flex flex-col items-center gap-0.5 w-12 ${activeTab === "finance" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px] font-medium">{T("finance", "Finance")}</span>
          </button>

          <button onClick={() => handleTabClick("loans")} className={`flex flex-col items-center gap-0.5 w-12 ${activeTab === "loans" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <CreditCard className="w-5 h-5" />
            <span className="text-[10px] font-medium">{T("loans", "Loans")}</span>
          </button>

          <button onClick={() => handleTabClick("bills")} className={`flex flex-col items-center gap-0.5 w-12 ${activeTab === "bills" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <Receipt className="w-5 h-5" />
            <span className="text-[10px] font-medium">{T("bills", "Bills")}</span>
          </button>
          <button onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-0.5 w-12 text-muted-foreground hover:text-foreground">
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">{T("more", "More")}</span>
          </button>
        </div>
      </nav>

      {/* ✨ THE BIG BRAIN CONNECTION — rendered after nav for z-index supremacy */}
      <RaymaChat
        autoOpen={raymaAutoOpen}
        forceOpen={raymaOpen}
        onClose={() => setRaymaOpen(false)}
        prefillPrompt={raymaPrefillPrompt}
        onPrefillConsumed={() => setRaymaPrefillPrompt("")}
        showGreeting={raymaGreeting}
        onGreetingConsumed={() => setRaymaGreeting(false)}
        loans={loans}
        bills={bills}
        incomes={incomes}
        payments={payments} // <-- NEW: Transaction History
        assets={assets} // <-- NEW: Net Worth Tracking
        bankAccounts={bankAccounts} // <-- NEW: Bank Accounts for Net Worth
        savingsGoals={savingsGoals} // <-- NEW: Savings Vault
        transactions={transactions} // <-- NEW: Recent spending lookup
        userProfile={userProfile}
        currentPage={location.pathname} // <-- NEW: Page Awareness / Context
        addTransaction={addTransaction}
      />
    </div>);

}