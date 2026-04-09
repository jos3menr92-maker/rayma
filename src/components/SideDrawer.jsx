import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Phone, Mail, Shield, LogOut, ChevronRight, Lock, FileText, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

export default function SideDrawer({ open, onClose }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (open) base44.auth.me().then(setUser);
  }, [open]);

  function handleLogout() {
    base44.auth.logout();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 h-full w-80 bg-card border-l border-border shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary/10 border-b border-border px-5 pt-12 pb-5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-3xl">
                  {user?.avatar_emoji || "😊"}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h2 className="text-lg font-bold font-heading text-foreground">
                {user?.preferred_name || user?.full_name || "My Account"}
              </h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {user?.role && (
                <span className="inline-block mt-2 text-[10px] uppercase tracking-wider bg-primary/15 text-primary font-semibold px-2 py-0.5 rounded-full">
                  {user.role}
                </span>
              )}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">

              {/* Account Section */}
              <Section title="Account">
                <DrawerRow icon={User} label="Full Name" value={user?.full_name} />
                <DrawerRow icon={Mail} label="Email" value={user?.email} />
                <DrawerRow
                  icon={User}
                  label="Profile Settings"
                  chevron
                  onClick={() => { onClose(); window.location.href = "/profile"; }}
                />
              </Section>

              {/* App Info */}
              <Section title="About This App">
                <DrawerRow icon={Info} label="App Name" value="Debt & Bills Tracker" />
                <DrawerRow icon={Info} label="Version" value="1.0.0" />
                <DrawerRow icon={FileText} label="Description" value="Manage loans, bills, income & your financial health all in one place." small />
              </Section>

              {/* Contact & Support */}
              <Section title="Contact & Support">
                <DrawerRow icon={Mail} label="Support Email" value="support@debttracker.app" />
                <DrawerRow icon={Phone} label="Support Phone" value="+1 (800) 123-4567" />
                <DrawerRow icon={Phone} label="Business Hours" value="Mon–Fri, 9am–5pm EST" />
              </Section>

              {/* Privacy & Legal */}
              <Section title="Privacy & Legal">
                <DrawerRow icon={Shield} label="Data Storage" value="Your data is private and only visible to you." small />
                <DrawerRow icon={Lock} label="Security" value="All data is encrypted at rest and in transit." small />
                <DrawerRow icon={FileText} label="Privacy Policy" value="We never sell or share your personal data with third parties." small />
                <DrawerRow icon={Shield} label="Data Deletion" value="You may delete your account and all associated data at any time." small />
              </Section>
            </div>

            {/* Footer */}
            <div className="border-t border-border p-4">
              <Button
                variant="outline"
                className="w-full rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
              <p className="text-[10px] text-muted-foreground text-center mt-3">
                Debt & Bills Tracker · All rights reserved
              </p>
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
      <div className="bg-background rounded-2xl border border-border overflow-hidden divide-y divide-border">
        {children}
      </div>
    </div>
  );
}

function DrawerRow({ icon: Icon, label, value, small, chevron, onClick }) {
  const content = (
    <div className={`flex items-start gap-3 px-4 py-3 ${onClick ? "hover:bg-muted/50 cursor-pointer transition-colors" : ""}`} onClick={onClick}>
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {value && <p className={`font-medium text-foreground ${small ? "text-xs mt-0.5 leading-relaxed" : "text-sm"} truncate`}>{value}</p>}
      </div>
      {chevron && <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />}
    </div>
  );
  return content;
}