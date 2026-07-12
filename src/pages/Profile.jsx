import { useEffect, useState, useRef } from "react"; 
import { supabase } from "@/lib/supabaseClient"; 
import { useFinancialData } from "@/lib/FinancialDataContext"; 
import { motion } from "framer-motion"; 
import { 
  Shield, Globe, Calendar, Camera, 
  Trash2, ChevronRight, Sun, Moon, Monitor, 
  AlertCircle, Download, Fingerprint, Lock, Loader2,
  Bell, Sparkles, Gamepad2, ShieldAlert
} from "lucide-react"; 
import { Link, useNavigate } from "react-router-dom"; 
import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 
import { useLanguage, useT } from "@/lib/LanguageContext"; 
import { LANGUAGES } from "@/lib/i18n";
import { base44 } from "@/api/base44Client";

const HUMAN_AVATARS = [
  { id: "face1", url: "https://i.pravatar.cc/150?img=11" },
  { id: "face2", url: "https://i.pravatar.cc/150?img=12" },
  { id: "face3", url: "https://i.pravatar.cc/150?img=14" },
  { id: "face4", url: "https://i.pravatar.cc/150?img=32" },
  { id: "face5", url: "https://i.pravatar.cc/150?img=33" },
  { id: "face6", url: "https://i.pravatar.cc/150?img=37" },
  { id: "face7", url: "https://i.pravatar.cc/150?img=38" },
  { id: "face8", url: "https://i.pravatar.cc/150?img=47" },
  { id: "face9", url: "https://i.pravatar.cc/150?img=49" },
  { id: "face10", url: "https://i.pravatar.cc/150?img=50" },
  { id: "face11", url: "https://i.pravatar.cc/150?img=51" },
  { id: "face12", url: "https://i.pravatar.cc/150?img=52" },
  { id: "face13", url: "https://i.pravatar.cc/150?img=56" },
  { id: "face14", url: "https://i.pravatar.cc/150?img=59" },
  { id: "face15", url: "https://i.pravatar.cc/150?img=60" },
];

function SectionHeader({ icon: Icon, title, subtitle }) { 
  return ( 
    <div className="flex items-center gap-3 mb-4"> 
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"> 
        <Icon className="w-4 h-4 text-primary" /> 
      </div> 
      <div> 
        <p className="text-sm font-semibold text-foreground">{title}</p> 
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>} 
      </div> 
    </div> 
  ); 
} 

export default function Profile() { 
  const { lang, setLang } = useLanguage(); 
  const navigate = useNavigate();
  const T = useT();
  const fileInputRef = useRef(null);
  
  const { userProfile, supaUser, incomes, bills, loans, reload, loading: contextLoading } = useFinancialData();
  
  const [saving, setSaving] = useState(false); 
  const [saved, setSaved] = useState(false); 
  const [uploadingPhoto, setUploadingPhoto] = useState(false); 
  const [deleting, setDeleting] = useState(false);
  
  // 🔒 Security Vault State - NOW FULLY WIRED
  const [showPasswordLock, setShowPasswordLock] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); 
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark"); 
  
  const [form, setForm] = useState({ 
    preferred_name: "", avatar_id: "", avatar_emoji: "", avatar_photo_url: "", 
    preferred_currency: "USD", preferred_language: "en", 
    pay_frequency: "", pay_day: "", compact_mode: false,
    smart_alerts: true, auto_insights: true
  });

  useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => { 
    if (userProfile) {
      setForm({ 
        preferred_name: userProfile.preferred_name || userProfile.full_name || "", 
        avatar_id: userProfile.avatar_id || "", 
        avatar_emoji: userProfile.avatar_emoji || "", 
        avatar_photo_url: userProfile.avatar_photo_url || "", 
        preferred_currency: userProfile.preferred_currency || "USD", 
        preferred_language: userProfile.preferred_language || lang || "en", 
        pay_frequency: userProfile.pay_frequency || "", 
        pay_day: userProfile.pay_day || "", 
        compact_mode: userProfile.compact_mode || false, 
        smart_alerts: userProfile.smart_alerts !== false,
        auto_insights: userProfile.auto_insights !== false,
      });
    }
  }, [userProfile]);

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;
    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${supaUser.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setForm(f => ({ ...f, avatar_photo_url: publicUrl, avatar_emoji: "", avatar_id: "" }));
    } catch (err) { 
      console.error(err); 
      alert("Failed to upload photo.");
    } finally { 
      setUploadingPhoto(false); 
    }
  }

  async function handleSave(e) { 
    e.preventDefault(); 
    if (!userProfile) return;
    setSaving(true); 
    
    try {
      const { error: authError } = await supabase.auth.updateUser({ data: form });
      if (authError) throw authError;

      const { error: profileError } = await supabase.from('profiles').update(form).eq('id', supaUser.id);
      if (profileError) throw profileError;
      await reload();
      
      if (form.preferred_language) setLang(form.preferred_language); 
      setSaved(true); 
      setTimeout(() => setSaved(false), 2500); 
    } catch (err) { 
      console.error(err); 
    } finally { 
      setSaving(false); 
    }
  }

  function handleLanguageChange(value) {
    setForm({ ...form, preferred_language: value });
    setLang(value);
  }

  // ---------------------------------------------------------
  // 🛡️ SECURE ACTION HANDLERS
  // ---------------------------------------------------------

  const triggerSecurityCheck = (action) => {
    setPendingAction(action);
    setPassword("");
    setAuthError("");
    setShowPasswordLock(true);
  };

  const verifyAndExecute = async () => {
    setAuthError("");
    setIsVerifying(true);

    try {
      // 1. Get current user's email securely from session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Could not verify user identity.");

      // 2. Actually re-authenticate against Supabase using the provided password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (signInError) throw signInError;

      // 3. Password is valid! Close modal and route to correct hardened handler
      setShowPasswordLock(false);
      
      if (pendingAction === 'export') {
        await handleExport();
      } else if (pendingAction === 'delete') {
        await handleDelete();
      }
      
    } catch (err) {
      setAuthError(err.message || "Invalid password. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExport = async () => {
    const exportData = {
      profile: userProfile,
      incomes,
      bills,
      loans,
      exported_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rayma-data-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    alert("✅ Data Exported! Check your downloads folder.");
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const uid = supaUser?.id;
      if (!uid) throw new Error("User ID missing. Cannot delete account.");

      // 1. Hard wipe all financial data from Supabase (sequential to prevent partial wipes)
      const tables = ['transactions', 'bank_accounts', 'payments', 'loan_adjustments', 'loans', 'bills', 'incomes', 'assets', 'savings_goals', 'profiles'];
      for (const table of tables) {
        const { error } = await supabase.from(table).delete().eq(table === 'profiles' ? 'id' : 'user_id', uid);
        if (error) throw new Error(`Failed to delete from ${table}: ${error.message}`);
      }

      // 2. Delete Supabase Auth user (frees up the email permanently — Apple Guideline 5.1.1)
      try {
        await base44.functions.invoke('deleteUserAccount', { supabaseUserId: uid });
      } catch (e) {
        console.error('Supabase auth user deletion failed:', e.message);
      }

      // 3. Delete Base44 Account (if SDK supports it, otherwise logout)
      if (base44?.auth?.deleteAccount) {
        await base44.auth.deleteAccount();
      }

      // 4. Terminate Supabase session and redirect
      await supabase.auth.signOut();
      window.location.href = "/auth";
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  };

  if (contextLoading || deleting) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-32">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        
        {/* Profile Card Header */}
        <div className="bg-card border border-border rounded-3xl p-8 text-center mb-6 shadow-sm">
          <div className="relative inline-block">
            <div className="w-28 h-28 rounded-full border-4 border-background shadow-xl overflow-hidden bg-muted flex items-center justify-center text-4xl">
              {uploadingPhoto ? <Loader2 className="animate-spin" /> : 
               form.avatar_photo_url ? <img src={`${form.avatar_photo_url}?t=${Date.now()}`} className="w-full h-full object-cover" /> : 
               form.avatar_id ? (
                 <img src={HUMAN_AVATARS.find(a => a.id === form.avatar_id)?.url} className="w-full h-full object-cover" alt="Profile" />
               ) : <span className="font-bold text-primary">{form.preferred_name?.charAt(0) || "U"}</span>}
            </div>
            
            <button onClick={() => fileInputRef.current.click()} type="button" className="absolute bottom-0 right-0 p-3 bg-primary text-white rounded-full shadow-lg border-2 border-background hover:scale-105 transition-transform">
              <Camera className="w-5 h-5" />
            </button>

            {form.avatar_photo_url && (
              <button 
                onClick={() => setForm(f => ({ ...f, avatar_photo_url: "" }))} 
                type="button" 
                className="absolute top-0 right-0 p-2 bg-destructive text-white rounded-full shadow-lg border-2 border-background hover:scale-105 transition-transform"
                title={T("removePhoto", "Remove Photo")}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
          <h1 className="text-2xl font-bold mt-4">{form.preferred_name || T("user", "User")}</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Identity & Style */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader icon={Fingerprint} title={T("identityStyle", "Identity & Style")} subtitle={T("chooseAvatar", "Choose a professional avatar to represent you")} />
            
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
              {HUMAN_AVATARS.map((av) => (
                <button 
                  key={av.id} 
                  type="button" 
                  onClick={() => setForm({...form, avatar_id: av.id, avatar_photo_url: ""})} 
                  className={`relative aspect-square w-full rounded-xl overflow-hidden border-2 transition-all ${form.avatar_id === av.id ? "border-primary scale-105 shadow-md" : "border-transparent opacity-70 hover:opacity-100"}`}
                >
                  <img src={av.url} alt={`Avatar option`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            
            <div className="mt-6">
              <Label className="text-xs text-muted-foreground ml-1 mb-1 block">{T("displayName", "Display Name")}</Label>
              <Input value={form.preferred_name} onChange={e => setForm({...form, preferred_name: e.target.value})} className="rounded-xl" placeholder={T("howShouldWeCallYou", "How should we call you?")} />
            </div>
          </div>

          {/* Theme & Focus */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader icon={Monitor} title={T("themeFocus", "Theme & Focus")} subtitle={T("customizeDashboard", "Customize your dashboard experience")} />
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-1 bg-muted/50 rounded-xl border border-border/50">
                <button type="button" onClick={() => setTheme("light")} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${theme === "light" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <Sun className="w-4 h-4" /> {T("lightMode", "Light Mode")}
                </button>
                <button type="button" onClick={() => setTheme("dark")} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${theme === "dark" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <Moon className="w-4 h-4" /> {T("darkMode", "Dark Mode")}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                <div>
                  <p className="text-sm font-medium">{T("focusMode", "Focus Mode")}</p>
                  <p className="text-xs text-muted-foreground">{T("focusModeDesc", "Hides dashboard accent colors for a distraction-free view")}</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setForm({...form, compact_mode: !form.compact_mode})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${form.compact_mode ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${form.compact_mode ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* AI Smart Notifications */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader icon={Bell} title={T("smartNotifications", "Smart Notifications")} subtitle={T("raymaHeavyLifting", "Let Rayma AI handle the heavy lifting")} />
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3">
                <div className="flex gap-3">
                  <div className="mt-0.5"><Sparkles className="w-4 h-4 text-primary" /></div>
                  <div>
                    <p className="text-sm font-medium">{T("automatedCashFlowInsights", "Automated Cash Flow Insights")}</p>
                    <p className="text-xs text-muted-foreground">{T("raymaAnalyzesWeekly", "Rayma AI analyzes your weekly spending automatically")}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setForm({...form, auto_insights: !form.auto_insights})} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${form.auto_insights ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${form.auto_insights ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 border-t border-border/40">
                <div className="flex gap-3">
                  <div className="mt-0.5"><AlertCircle className="w-4 h-4 text-muted-foreground" /></div>
                  <div>
                    <p className="text-sm font-medium">{T("smartBillAlerts", "Smart Bill Alerts")}</p>
                    <p className="text-xs text-muted-foreground">{T("notifiedObligations", "Get notified only when upcoming obligations need attention")}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setForm({...form, smart_alerts: !form.smart_alerts})} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${form.smart_alerts ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${form.smart_alerts ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Localization & Region */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader icon={Globe} title={T("localizationRegion", "Localization & Region")} subtitle={T("setLanguageCurrency", "Set your primary language and currency")} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground ml-1 mb-1 block">{T("language", "Language")}</Label>
                <Select value={form.preferred_language || lang || "en"} onValueChange={handleLanguageChange}>
                  <SelectTrigger><SelectValue placeholder={T("selectLanguage", "Select Language")} /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(({ code, flag, label }) => (
                      <SelectItem key={code} value={code}>{`${flag} ${label}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground ml-1 mb-1 block">{T("preferredCurrency", "Currency")}</Label>
                <Select value={form.preferred_currency} onValueChange={v => setForm({...form, preferred_currency: v})}>
                  <SelectTrigger><SelectValue placeholder={T("selectCurrency", "Select Currency")} /></SelectTrigger>
                   <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="MXN">MXN ($)</SelectItem>
                      {/* 👇 New South American Currencies 👇 */}
                      <SelectItem value="COP">COP ($)</SelectItem>
                      <SelectItem value="ARS">ARS ($)</SelectItem>
                      <SelectItem value="BRL">BRL (R$)</SelectItem>
                      <SelectItem value="CLP">CLP ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Pay Schedule */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader icon={Calendar} title={T("paySchedule", "Pay Schedule")} subtitle={T("helpsRaymaCashFlow", "Helps Rayma AI calculate your cash flow")} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground ml-1 mb-1 block">{T("frequency", "Frequency")}</Label>
                <Select value={form.pay_frequency} onValueChange={v => setForm({...form, pay_frequency: v})}>
                  <SelectTrigger><SelectValue placeholder={T("frequency", "Frequency")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">{T("weekly", "Weekly")}</SelectItem>
                    <SelectItem value="biweekly">{T("biweekly", "Bi-weekly")}</SelectItem>
                    <SelectItem value="monthly">{T("monthly", "Monthly")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground ml-1 mb-1 block">{T("primaryPayday", "Primary Payday")}</Label>
                <Input placeholder={T("paydayPlaceholder", "e.g., 1st & 15th")} value={form.pay_day} onChange={e => setForm({...form, pay_day: e.target.value})} className="rounded-xl" />
              </div>
            </div>
          </div>

          {/* 🛡️ THE SECURITY VAULT */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader icon={Shield} title={T("privacyLegal", "Privacy & Legal")} subtitle={T("manageDataSecurity", "Manage your data and account security.")} />
            
            <div className="space-y-3 mt-4">
               <Link to="/privacy" className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted rounded-xl text-sm transition-colors border border-border/50">
                 {T("privacyPolicy", "Privacy Policy")} <ChevronRight className="w-4 h-4 text-muted-foreground" />
               </Link>
               <Link to="/terms" className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted rounded-xl text-sm transition-colors border border-border/50">
                 {T("termsOfService", "Terms of Service")} <ChevronRight className="w-4 h-4 text-muted-foreground" />
               </Link>
               
               <button type="button" onClick={() => triggerSecurityCheck('export')} className="w-full flex items-center justify-between p-3 bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm transition-colors">
                 <span className="flex items-center gap-2"><Download className="w-4 h-4" /> {T("exportMyData", "Export Data")}</span>
                  <ChevronRight className="w-4 h-4 opacity-50" />
               </button>

               <button type="button" onClick={() => triggerSecurityCheck('delete')} className="w-full flex items-center justify-between p-3 bg-destructive/5 hover:bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-sm transition-colors">
                 <span className="flex items-center gap-2"><Trash2 className="w-4 h-4" /> {T("deleteAccountLabel", "Delete Account")} & {T("deleteData", "Data")}</span>
                  <ChevronRight className="w-4 h-4 opacity-50" />
               </button>
            </div>
          </div>

          <Button type="submit" className="w-full h-12 rounded-2xl font-bold shadow-sm hover:shadow-md transition-all">
            {saving ? T("saving", "Saving...") : saved ? `✓ ${T("saved", "Preferences Saved")}` : T("saveAllChanges", "Save All Changes")}
          </Button>

          {/* The 80s Easter Egg Trigger */}
          <div className="flex justify-center pt-8 pb-4">
            <button 
              type="button" 
              onClick={() => navigate("/arcade")}
              className="text-muted-foreground/30 hover:text-primary/60 transition-colors flex items-center gap-2 text-xs font-mono"
            >
              <Gamepad2 className="w-4 h-4" />
              {T("insertCoinText", "INSERT COIN")}
            </button>
          </div>
        </form>
      </motion.div>

      {/* 🔐 THE PASSWORD MODAL - NOW FULLY FUNCTIONAL */}
      {showPasswordLock && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-background border rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-500">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-bold text-lg text-foreground">{T("securityVerification", "Security Verification")}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {T("enterPasswordConfirm", "Please enter your password to confirm you want to {action}.").replace("{action}", pendingAction === 'export' ? T("exportYourData", "export your data") : T("permanentlyDeleteAccount", "permanently delete your account"))}
            </p>
            
            <div className="space-y-1">
              <Input 
                type="password" 
                placeholder={T("enterPassword", "Enter password...")}
                className="w-full bg-muted border rounded-xl p-3 text-sm focus:outline-primary"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isVerifying}
              />
              {authError && (
                <p className="text-xs text-destructive ml-1">{authError}</p>
              )}
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowPasswordLock(false)} disabled={isVerifying}>
                {T("cancel", "Cancel")}
              </Button>
              <Button 
                type="button" 
                variant={pendingAction === 'delete' ? 'destructive' : 'default'} 
                className="flex-1" 
                onClick={verifyAndExecute}
                disabled={!password || isVerifying}
              >
                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                {T("confirm", "Confirm")}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}