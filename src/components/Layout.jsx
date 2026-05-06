import { Outlet, Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { LayoutDashboard, Plus, List, Receipt, TrendingUp, Menu, Sparkles } from "lucide-react";
import QuickAddMenu from "./QuickAddMenu";
import SideDrawer from "./SideDrawer";
import RaymaChat from "./RaymaChat";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/loans", icon: List, label: "Loans" },
  { path: "/add-loan", icon: Plus, label: "Add" },
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
      <RaymaChat />

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border backdrop-blur-xl bg-opacity-90 z-50">
        <div className="flex items-center overflow-x-auto scrollbar-hide max-w-lg mx-auto py-2 px-2 gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            if (item.label === "Add") {
              return (
                <button
                  key={item.path}
                  onClick={() => setQuickAddOpen(true)}
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground flex-shrink-0"
                >
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center -mt-5 shadow-lg shadow-primary/30">
                    <Plus className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="text-[10px] font-medium">Add</span>
                </button>
              );
            }
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