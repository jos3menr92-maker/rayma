import { Outlet, Link, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, Plus, List, Receipt, TrendingUp, Menu, MoreHorizontal, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import QuickAddMenu from "./QuickAddMenu";
import SideDrawer from "./SideDrawer";
import RaymaChat from "./RaymaChat";
import MoreMenu from "./MoreMenu";
import PushNotificationPrompt from "./PushNotificationPrompt";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { getInitialsColor } from "@/components/AvatarPicker";

const HUMAN_AVATARS = [
  { id: "face1", url: "https://i.pravatar.cc/150?img=11" }, { id: "face2", url: "https://i.pravatar.cc/150?img=12" },
  { id: "face3", url: "https://i.pravatar.cc/150?img=14" }, { id: "face4", url: "https://i.pravatar.cc/150?img=32" },
  { id: "face5", url: "https://i.pravatar.cc/150?img=33" }, { id: "face6", url: "https://i.pravatar.cc/150?img=37" },
  { id: "face7", url: "https://i.pravatar.cc/150?img=38" }, { id: "face8", url: "https://i.pravatar.cc/150?img=47" },
  { id: "face9", url: "https://i.pravatar.cc/150?img=49" }, { id: "face10", url: "https://i.pravatar.cc/150?img=50" },
  { id: "face11", url: "https://i.pravatar.cc/150?img=51" }, { id: "face12", url: "https://i.pravatar.cc/150?img=52" },
  { id: "face13", url: "https://i.pravatar.cc/150?img=56" }, { id: "face14", url: "https://i.pravatar.cc/150?img=59" },
  { id: "face15", url: "https://i.pravatar.cc/150?img=60" }
];

export default function Layout() {
  const location = useLocation();
  const { lang } = useLanguage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [raymaOpen, setRaymaOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const [raymaAutoOpen, setRaymaAutoOpen] = useState(false);

  // 🧠 SECURE: Pulling the ENTIRE vault for the God-View
  const { 
    loans, 
    bills, 
    incomes, 
    payments = [],     // Ready for the calendar/transactions
    assets = [],       // Ready for net worth
    savingsGoals = [], // Ready for the Savings Vault
    userProfile 
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
  
  useEffect(() => {
    setImageError(false);
  }, [userProfile?.avatar_photo_url, userProfile?.avatar_id]);

  const presetAvatar = HUMAN_AVATARS.find((a) => a.id === userProfile?.avatar_id);
  const imageToShow = userProfile?.avatar_photo_url || presetAvatar?.url;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <QuickAddMenu open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      <MoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} />
      
      <div className="sticky top-0 z-30 bg-card/80 backdrop-blur border-b border-border" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex items-center justify-between max-w-lg mx-auto px-4 h-14">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 border border-primary/10 shadow-sm"
              style={{ backgroundColor: userProfile?.avatar_id ? getInitialsColor(userProfile?.preferred_name || userProfile?.full_name, userProfile?.avatar_id) : "#9ca3af" }}>
              {imageToShow && !imageError ? (
                <img src={imageToShow} className="w-full h-full object-cover" alt="Profile" onError={() => setImageError(true)} /> 
              ) : (
                <span className="text-xs font-bold text-white">
                  {userProfile?.preferred_name?.charAt(0) || userProfile?.full_name?.charAt(0) || "R"}
                </span>
              )}
            </div>
            <span className="text-sm font-semibold font-heading text-foreground tracking-wide">RAYMA</span>
          </div>
          <div className="flex items-center">
            <button onClick={() => setDrawerOpen(true)} aria-label="Open Menu" className="w-12 h-12 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0">
              <Menu className="w-6 h-6 my-3" />
            </button>
          </div>
        </div>
      </div>
      
      <main className="flex-1 pb-safe overflow-y-auto">
        <Outlet />
      </main>

      <motion.button
        drag
        dragMomentum={false}
        dragElastic={0.1}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.08 }}
        whileDrag={{ scale: 1.12, boxShadow: "0 12px 40px rgba(0,0,0,0.3)" }}
        onDragStart={(_, info) => { dragStartPos.current = { x: info.point.x, y: info.point.y }; isDragging.current = false; }}
        onDrag={(_, info) => {
          const dx = Math.abs(info.point.x - dragStartPos.current.x);
          const dy = Math.abs(info.point.y - dragStartPos.current.y);
          if (dx > 5 || dy > 5) isDragging.current = true;
        }}
        onDragEnd={() => setTimeout(() => {isDragging.current = false;}, 100)}
        onClick={(e) => { if (isDragging.current) {e.preventDefault();return;} setQuickAddOpen(true); }}
        style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
        className="fixed left-4 z-40 w-14 h-14 rounded-full bg-primary shadow-xl shadow-primary/40 flex items-center justify-center cursor-grab active:cursor-grabbing"
        title="Quick Add (drag to move)">
        <Plus className="w-6 h-6 text-primary-foreground" />
      </motion.button>

      <PushNotificationPrompt />
      
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border backdrop-blur-xl bg-opacity-90 z-50" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-between max-w-lg mx-auto px-4 h-16 relative">
          <Link to="/" className={`flex flex-col items-center gap-0.5 w-12 ${location.pathname === "/" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-medium">{t(lang, "home")}</span>
          </Link>
          <Link to="/finance" className={`flex flex-col items-center gap-0.5 w-12 ${location.pathname === "/finance" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px] font-medium">{t(lang, "finance")}</span>
          </Link>

          <div className="relative -top-5 flex justify-center w-16">
            <button
              onClick={() => setRaymaOpen(true)}
              className="absolute flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 shadow-[0_4px_20px_rgba(34,211,238,0.4)] border-4 border-background hover:scale-105 active:scale-95 transition-all duration-300 z-50 group"
            >
              <Sparkles className="w-6 h-6 text-cyan-400 dark:text-cyan-600 group-hover:animate-pulse" />
              <div className="absolute inset-0 rounded-full border border-cyan-400/30 animate-[ping_3s_ease-in-out_infinite]" />
            </button>
          </div>

          <Link to="/bills" className={`flex flex-col items-center gap-0.5 w-12 ${location.pathname === "/bills" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <Receipt className="w-5 h-5" />
            <span className="text-[10px] font-medium">{t(lang, "bills")}</span>
          </Link>
          <button onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-0.5 w-12 text-muted-foreground hover:text-foreground">
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">{t(lang, "more")}</span>
          </button>
        </div>
      </nav>

      {/* ✨ THE BIG BRAIN CONNECTION — rendered after nav for z-index supremacy */}
      <RaymaChat
        autoOpen={raymaAutoOpen}
        forceOpen={raymaOpen}
        onClose={() => setRaymaOpen(false)}
        loans={loans}
        bills={bills}
        incomes={incomes}
        payments={payments}         // <-- NEW: Transaction History
        assets={assets}             // <-- NEW: Net Worth Tracking
        savingsGoals={savingsGoals} // <-- NEW: Savings Vault
        userProfile={userProfile} 
        currentPage={location.pathname} // <-- NEW: Page Awareness / Context
      />
    </div>
  );
}
