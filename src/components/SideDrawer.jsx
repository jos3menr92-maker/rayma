import { motion, AnimatePresence } from "framer-motion";
import { X, User, Mail, Shield, LogOut, ChevronRight, Lock, FileText, Info, Trash2, Download, Zap, TrendingUp, LayoutDashboard, PiggyBank, Folder, BarChart2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient"; 
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getInitialsColor } from "@/components/AvatarPicker";
import { useFinancialData } from "@/lib/FinancialDataContext"; 

const HUMAN_AVATARS = [
  { id: "face1", url: "https://i.pravatar.cc/150?img=11" }, { id: "face2", url: "https://i.pravatar.cc/150?img=12" },
  { id: "face3", url: "https://i.pravatar.cc/150?img=14" }, { id: "face4", url: "https://i.pravatar.cc/150?img=32" },
  { id: "face5", url: "https://i.pravatar.cc/150?img=33" }, { id: "face6", url: "https://i.pravatar.cc/150?img=37" },
  { id: "face7", url: "https://i.pravatar.cc/150?img=38" }, { id: "face8", url: "https://i.pravatar.cc/150?img=47" },
  { id: "face9", url: "https://i.pravatar.cc/150?img=49" }, { id: "face10", url: "https://i.pravatar.cc/150?img=50" },
  { id: "face11", url: "https://i.pravatar.cc/150?img=51" }, { id: "face12", url: "https://i.pravatar.cc/150?img=52" },
  { id: "face13", url: "https://i.pravatar.cc/150?img=56" }, { id: "face14", url: "https://i.pravatar.cc/150?img=59" },
  { id: "face15", url: "https://i.pravatar.cc/150?img=60" },
];

export default function SideDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const { userProfile: user } = useFinancialData(); 

  function go(path) { onClose(); navigate(path); }

  const tokenDisplay = () => {
    if (!user) return null;
    if (user.annual_pass_expires_at && new Date(user.annual_pass_expires_at) > new Date()) return "∞ Annual Pass";
    const tokens = user.ai_tokens_remaining ?? 5;
    return `${tokens} AI token${tokens !== 1 ? "s" : ""} left`;
  };

  async function handleLogout() {
    await supabase.auth.signOut(); 
    window.location.href = "/auth";
  }

  const presetAvatar = HUMAN_AVATARS.find(a => a.id === user?.avatar_id);
  const imageToShow = user?.avatar_photo_url || presetAvatar?.url;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 280 }} className="fixed top-0 right-0 h-full w-80 bg-card border-l border-border shadow-2xl z-50 flex flex-col overflow-hidden">
            <div className="bg-primary/10 border-b border-border px-5 pb-5" style={{ paddingTop: "max(3rem, calc(1.25rem + env(safe-area-inset-top)))" }}>
              <div className="flex items-start justify-between mb-4">
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
                  <DrawerRow icon={Zap} label="AI Consultations" value={tokenDisplay()} chevron onClick={() => go("/support")} />
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
                <DrawerRow icon={Lock} label="Security" value="All data encrypted" small />
                {/* 🛡️ ROUTED TO VAULT */}
                <DrawerRow icon={Trash2} label="Delete Account" value="Go to Security Vault" chevron onClick={() => go("/profile")} destructive />
              </Section>
            </div>

            {/* ✨ ADDED pb-28 HERE: Lifts the button above the bottom navigation bar */}
            <div className="border-t border-border p-4 pb-28">
              <Button variant="outline" className="w-full rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }) {
  return (
    <div className="px-4 pt-5 pb-1">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-1">{title}</p>
      <div className="bg-background rounded-2xl border border-border overflow-hidden divide-y divide-border">{children}</div>
    </div>
  );
}

function DrawerRow({ icon: Icon, label, value, small, chevron, onClick, destructive }) {
  return (
    <div className={`flex items-start gap-3 px-4 py-3 ${onClick ? "hover:bg-muted/50 cursor-pointer transition-colors active:bg-muted" : ""}`} onClick={onClick}>
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${destructive ? "text-destructive" : "text-muted-foreground"}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs ${destructive ? "text-destructive font-medium" : "text-muted-foreground"}`}>{label}</p>
        {value && <p className={`font-medium text-foreground ${small ? "text-xs mt-0.5 leading-relaxed" : "text-sm"} truncate`}>{value}</p>}
      </div>
      {chevron && <ChevronRight className={`w-4 h-4 mt-0.5 shrink-0 ${destructive ? "text-destructive/60" : "text-muted-foreground"}`} />}
    </div>
  );
}
