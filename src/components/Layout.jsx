import { Outlet, Link, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, Plus, List, Receipt, TrendingUp, Menu, MoreHorizontal } from "lucide-react";
import QuickAddMenu from "./QuickAddMenu";
import SideDrawer from "./SideDrawer";
import RaymaChat from "./RaymaChat";

import MoreMenu from "./MoreMenu";
import FeedbackButton from "./FeedbackButton";
import PushNotificationPrompt from "./PushNotificationPrompt";
import { useFinancialData } from "@/lib/FinancialDataContext";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/loans", icon: List, label: "Loans" },
  { path: "/bills", icon: Receipt, label: "Bills" },
  { path: "/finance", icon: TrendingUp, label: "Finance" },
];

export default function Layout() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const [raymaAutoOpen, setRaymaAutoOpen] = useState(false);

  const { loans, bills, incomes, userProfile } = useFinancialData();

  useEffect(() => {
    try {
      const flag = sessionStorage.getItem("rayma_auto_open");
      if (flag === "true") {
        setRaymaAutoOpen(true);
        sessionStorage.removeItem("rayma_auto_open");
      }
    } catch (e) {
      // ignore storage errors
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <QuickAddMenu open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      <MoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} />
      
      {/* Top bar with menu button */}
      <div className="sticky top-0 z-30 bg-card/80 backdrop-blur border-b border-border" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex items-center justify-between max-w-lg mx-auto px-4 h-12">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center">
              {userProfile?.avatar_photo_url ? (
                <img 
                  src={`${userProfile.avatar_photo_url}?t=${Date.now()}`} 
                  className="w-full h-full object-cover" 
                  alt="Profile" 
                />
              ) : (
                <span className="text-[10px] font-bold text-primary">
                  {userProfile?.preferred_name?.charAt(0) || "R"}
                </span>
              )}
            </div>
            <span className="text-sm font-semibold font-heading text-foreground">RAYMA</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => setDrawerOpen(true)} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      <main className="flex-1 pb-safe overflow-y-auto">
        <Outlet />
      </main>

      {/* Floating Draggable Add Button */}
      <motion.button
        drag
        dragMomentum={false}
        dragElastic={0.1}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.08 }}
        whileDrag={{ scale: 1.12, boxShadow: "0 12px 40px rgba(0,0,0,0.3)" }}
        onDragStart={(_, info) => {
          dragStartPos.current = { x: info.point.x, y: info.point.y };
          isDragging.current = false;
        }}
        onDrag={(_, info) => {
          const dx = Math.abs(info.point.x - dragStartPos.current.x);
          const dy = Math.abs(info.point.y - dragStartPos.current.y);
          if (dx > 5 || dy > 5) isDragging.current = true;
        }}
        onClick={(e) => {
          if (isDragging.current) { e.preventDefault(); return; }
          setQuickAddOpen(true);
        }}
        style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
        className="fixed left-4 z-40 w-14 h-14 rounded-full bg-primary shadow-xl shadow-primary/40 flex items-center justify-center cursor-grab active:cursor-grabbing"
        title="Quick Add (drag to move)"
      >
        <Plus className="w-6 h-6 text-primary-foreground" />
      </motion.button>

      <FeedbackButton />
      <PushNotificationPrompt />
      <RaymaChat
        autoOpen={raymaAutoOpen}
        loans={loans}
        bills={bills}
        incomes={incomes}
        userProfile={userProfile}
      />

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border backdrop-blur-xl bg-opacity-90 z-50" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-around max-w-lg mx-auto py-2 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all duration-200 ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
