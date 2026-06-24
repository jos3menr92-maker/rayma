import { motion } from "framer-motion";
import { X, User, Mail, Shield, FileText, LayoutDashboard, TrendingUp, PiggyBank, BarChart2, Folder, Info, Download, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { getInitialsColor } from "@/lib/avatarColors";

function Section({ title, children }) {
  return (
    <div className="py-3 border-b border-border/70 last:border-b-0">
      <div className="px-4 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{title}</div>
      <div className="px-2">{children}</div>
    </div>
  );
}

function DrawerRow({ icon: Icon, label, value, chevron, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted transition-colors text-left">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"><Icon className="w-4 h-4 text-muted-foreground" /></div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-foreground font-medium truncate">{label}</div>
        {value && <div className="text-xs text-muted-foreground truncate">{value}</div>}
      </div>
      {chevron && <span className="text-muted-foreground">›</span>}
    </button>
  );
}

export default function SideDrawer({ open, onClose, user }) {
  const navigate = useNavigate();
  const { tokenDisplay } = useFinancialData();

  function go(path) {
    navigate(path);
    onClose();
  }

  const imageToShow = user?.avatar_url || user?.profile_image;

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />}

      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: open ? 0 : "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed top-0 right-0 h-full w-[86%] max-w-sm bg-card border-l border-border z-50 shadow-2xl flex flex-col"
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center font-bold text-white text-base" style={{ backgroundColor: user?.avatar_id ? getInitialsColor(user?.preferred_name || user?.full_name, user?.avatar_id) : "#ccc" }}>
                   {imageToShow ? <img src={imageToShow} alt="avatar" className="w-full h-full object-cover" /> : ((user?.preferred_name || user?.full_name || "?").split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase() || "?")}
                </div>
                <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <h2 className="text-lg font-bold font-heading text-foreground">{user?.preferred_name || user?.full_name || "My Account"}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {user?.role && <span className="inline-block mt-2 text-[10px] uppercase tracking-wider bg-primary/15 text-primary font-semibold px-2 py-0.5 rounded-full">{user.role}</span>}
            </div>

            <div className="flex-1 overflow-y-auto">
              <Section title="Account">
                <DrawerRow icon={User} label="Full Name" value={user?.full_name} />
                <DrawerRow icon={Mail} label="Email" value={user?.email} />
                <DrawerRow icon={User} label="Profile Settings" chevron onClick={() => go("/profile")} />
              </Section>

              {user && (
                <Section title="RAYMA AI">
                  <DrawerRow icon={Zap} label="AI Consultations" value={tokenDisplay()} chevron onClick={() => go("/store")} />
                </Section>
              )}

              <Section title="Navigate">
                <DrawerRow icon={LayoutDashboard} label="Dashboard" chevron onClick={() => go("/")} />
                <DrawerRow icon={TrendingUp} label="Income & Cash Flow" chevron onClick={() => go("/finance")} />
                <DrawerRow icon={PiggyBank} label="Savings Vault" chevron onClick={() => go("/budget-dashboard")} />
                <DrawerRow icon={BarChart2} label="Assets & Net Worth" chevron onClick={() => go("/assets")} />
                <DrawerRow icon={Folder} label="Document Vault" chevron onClick={() => go("/documents")} />
              </Section>

              <Section title="Tools">
                <DrawerRow icon={FileText} label="Tax Summary" value="Annual report" chevron onClick={() => go("/tax-summary")} />
                {/* 🛡️ ROUTED TO VAULT */}
                <DrawerRow icon={Download} label="Export My Data" value="Go to Security Vault" chevron onClick={() => go("/profile")} />
              </Section>

              <Section title="About RAYMA">
                <DrawerRow icon={Info} label="RAYMA" value="v2.0.0" />
                <DrawerRow icon={Mail} label="Support Email" value="rayma.app2026@gmail.com" />
              </Section>

              <Section title="Privacy & Legal">
                <DrawerRow icon={Shield} label="Privacy Policy" chevron onClick={() => go("/privacy")} />
                <DrawerRow icon={FileText} label="Terms of Service" chevron onClick={() => go("/terms")} />
              </Section>
            </div>
        </div>
      </motion.aside>
    </>
  );
}
