import { Outlet, Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, Plus, List, Receipt, TrendingUp, Menu, Sparkles } from "lucide-react";
import QuickAddMenu from "./QuickAddMenu";
import SideDrawer from "./SideDrawer";
import RaymaChat from "./RaymaChat";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/loans", icon: List, label: "Loans" },
  { path: "/bills", icon: Receipt, label: "Bills" },
  { path: "/finance", icon: TrendingUp, label: "Finance" },
  { path: "/simulator", icon: Sparkles, label: "Simulate" },
];

export default function Layout() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <QuickAddMenu open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      {/* Top bar with menu button */}
      <div className="sticky top-0 z-30 bg-card/80 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between max-w-lg mx-auto px-4 h-12">
          <span className="text-sm font-semibold font-heading text-foreground">Debt & Bills</span>
          <button onClick={() => setDrawerOpen(true)} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
      <main className="flex-1 pb-20 overflow-y-auto">
        <Outlet />
      </main>

      {/* Floating Add Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.08 }}
        onClick={() => setQuickAddOpen(true)}
        className="fixed bottom-24 left-4 z-40 w-14 h-14 rounded-full bg-primary shadow-xl shadow-primary/40 flex items-center justify-center"
        title="Quick Add"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <Plus className="w-6 h-6 text-primary-foreground" />
      </motion.button>

      <RaymaChat />

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border backdrop-blur-xl bg-opacity-90 z-50">
        <div className="flex items-center overflow-x-auto scrollbar-hide max-w-lg mx-auto py-2 px-2 gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 flex-shrink-0 ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}