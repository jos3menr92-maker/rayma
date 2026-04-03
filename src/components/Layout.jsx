import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Plus, List, Receipt, CalendarDays } from "lucide-react";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/loans", icon: List, label: "Loans" },
  { path: "/add-loan", icon: Plus, label: "Add" },
  { path: "/bills", icon: Receipt, label: "Bills" },
  { path: "/calendar", icon: CalendarDays, label: "Calendar" },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-20 overflow-y-auto">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border backdrop-blur-xl bg-opacity-90 z-50">
        <div className="flex items-center justify-around max-w-lg mx-auto py-2 px-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label === "Add" ? (
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center -mt-5 shadow-lg shadow-primary/30">
                    <Icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                ) : (
                  <Icon className="w-5 h-5" />
                )}
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}