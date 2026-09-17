import { LayoutDashboard, TrendingUp, CreditCard, Receipt, MoreHorizontal, Sparkles } from "lucide-react";
import { useT } from "@/lib/LanguageContext";

/**
 * DesktopSidebar — the desktop (lg+) face of the adaptive shell.
 * Renders a fixed left rail with the same four primary tabs (and More) as the
 * phone's bottom nav, driven by the SAME useTabNavigation instance owned by
 * Layout (props in, so tab stacks stay perfectly in sync). Hidden below lg,
 * where the bottom nav takes over — phones and tablets are untouched.
 */
export default function DesktopSidebar({ activeTab, handleTabClick, onMore, onRayma }) {
  const T = useT();
  const items = [
    { id: "home", label: T("dashboard", "Home"), icon: LayoutDashboard },
    { id: "finance", label: T("finance", "Finance"), icon: TrendingUp },
    { id: "loans", label: T("loans", "Loans"), icon: CreditCard },
    { id: "bills", label: T("bills", "Bills"), icon: Receipt },
  ];

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 flex-col bg-card border-r border-border z-40 p-4" aria-label={T("mainNavigation", "Main navigation")}>
      <div className="flex items-center gap-2.5 px-2 h-12 mb-6">
        <img src="/icon-192.png" className="w-8 h-8 object-cover rounded-lg shadow-sm" alt={T("raymaAiLogo", "Rayma AI logo")} />
        <span className="text-sm font-semibold font-heading tracking-wide">Rayma AI</span>
      </div>
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-medium transition-colors ${
                activeTab === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              aria-current={activeTab === item.id ? "page" : undefined}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
        <button
          onClick={onMore}
          className="flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <MoreHorizontal className="w-5 h-5" />
          {T("more", "More")}
        </button>
      </nav>
      <button
        onClick={onRayma}
        className="mt-auto flex items-center gap-3 px-3 h-12 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 text-sm font-semibold text-white dark:text-slate-900 shadow-md hover:opacity-90 transition-opacity"
      >
        <Sparkles className="w-5 h-5 text-cyan-400 dark:text-cyan-600" />
        {T("askRayma", "Ask Rayma AI")}
      </button>
    </aside>
  );
}