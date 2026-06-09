import { useEffect, useState, useRef } from "react"; 
import { base44 } from "@/api/base44Client"; 
import { motion, AnimatePresence } from "framer-motion"; 
import { 
  User, Save, LogOut, Shield, Globe, Calendar, Mail, Camera, X, 
  FileText, Trash2, ChevronRight, Palette, Sun, Moon, Monitor, 
  AlertCircle, Download, LifeBuoy, Fingerprint, Lock, Loader2,
  Bell, Sparkles, Gamepad2
} from "lucide-react"; 
import { Link, useNavigate } from "react-router-dom"; 
import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 
import { useLanguage } from "@/lib/LanguageContext"; 
import { t } from "@/lib/i18n";

// Live, photorealistic avatars - Zero image uploading required
const HUMAN_AVATARS = [
  { id: "face1", url: "https://i.pravatar.cc/150?u=a042581f4e29026024d" },
  { id: "face2", url: "https://i.pravatar.cc/150?u=a042581f4e29026704d" },
  { id: "face3", url: "https://i.pravatar.cc/150?u=a04258114e29026702d" },
  { id: "face4", url: "https://i.pravatar.cc/150?u=a048581f4e29026701d" },
  { id: "face5", url: "https://i.pravatar.cc/150?u=a04258a2462d826712d" },
  { id: "face6", url: "https://i.pravatar.cc/150?u=a042581f4e29026703d" },
  { id: "face7", url: "https://i.pravatar.cc/150?u=a042581f4e29026705d" },
  { id: "face8", url: "https://i.pravatar.cc/150?u=a042581f4e29026706d" },
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
  const T = (key, fallback) => t(lang, key) !== key ? t(lang, key) : fallback;
  const fileInputRef = useRef(null);
  
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(true); 
  const [saving, setSaving] = useState(false); 
  const [saved, setSaved] = useState(false); 
  const [uploadingPhoto, setUploadingPhoto] = useState(false); 
  const [deleting, setDeleting] = useState(false);
  const [showArcade, setShowArcade] = useState(false);
  
  // Set Dark Mode as the absolute default
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark"); 
  
  const [form, setForm] = useState({ 
    preferred_name: "", avatar_id: "", avatar_emoji: "", avatar_photo_url: "", 
    preferred_currency: "USD", preferred_language: "en", 
    pay_frequency: "", pay_day: "", compact_mode: false,
    smart_alerts: true, auto_insights: true
  });

  // Apply theme to document automatically
  useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => { loadUser(); }, []); 

  async function loadUser() { 
    try {
      const me = await base44.auth.me(); 
      setUser(me); 
      setForm({ 
        preferred_name: me.preferred_name || me.full_name || "", 
        avatar_id: me.avatar_id || "", 
        avatar_emoji: me.avatar_emoji || "", 
        avatar_photo_url: me.avatar_photo_url || "", 
        preferred_currency: me.preferred_currency || "USD", 
        preferred_language: me.preferred_language || "en", 
        pay_frequency: me.pay_frequency || "", 
        pay_day: me.pay_day || "", 
        compact_mode: me.compact_mode || false, 
        smart_alerts: me.smart_alerts !== false,
        auto_insights: me.auto_insights !== false,
      }); 
    } catch (err) { console.error(err); } finally { setLoading(false); }
  } 

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, avatar_photo_url: file_url, avatar_emoji: "", avatar_id: "" }));
    } catch (err) { console.error(err); } finally { setUploadingPhoto(false); }
  }

  async function handleSave(e) { 
    e.preventDefault(); 
    setSaving(true); 
    try {
      await base44.auth.updateMe(form); 
      if (form.preferred_language) setLang(form.preferred_language); 
      setSaved(true); 
      setTimeout(() => setSaved(false), 2500); 
    } catch (err) { console.error(err); } finally { setSaving(false); }
  }

  async function executeAccountDeletion() {
    if (!window.confirm("FINAL WARNING: Permanent account deletion? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await base44.auth.deleteMe();
      await base44.auth.logout();
      window.location.href = "/login";
    } catch (err) { 
      await base44.auth.updateMe({ preferred_name: "[DELETED]" });
      await base44.auth.logout();
      window.location.href = "/login";
    }
  }

  if (loading || deleting) return <div className="flex items-center justify-center min-h-screen">RAYMA...</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-32">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        
        {/* Profile Card Header */}
        <div className="bg-card border border-border rounded-3xl p-8 text-center mb-6 shadow-sm">
          <div className="relative inline-block">
            <div className="w-28 h-28 rounded-full border-4 border-background shadow-xl overflow-hidden bg-muted flex items-center justify-center text-4xl">
              {uploadingPhoto ? <Loader2 className="animate-spin" /> : 
               form.avatar_photo_url ? <img src={form.avatar_photo_url} className="w-full h-full object-cover" /> : 
               form.avatar_id ? (
                 <img src={HUMAN_AVATARS.find(a => a.id === form.avatar_id)?.url} className="w-full h-full object-cover" alt="Profile" />
               ) : <span className="font-bold text-primary">{form.preferred_name?.charAt(0) || "U"}</span>}
            </div>
            <button onClick={() => fileInputRef.current.click()} type="button" className="absolute bottom-0 right-0 p-3 bg-primary text-white rounded-full shadow-lg border-2 border-background hover:scale-105 transition-transform">
              <Camera className="w-5 h-5" />
            </button>
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
          <h1 className="text-2xl font-bold mt-4">{form.preferred_name || "User"}</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Identity & Style */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader icon={Fingerprint} title="Identity & Style" subtitle="Choose a professional avatar to represent you" />
            
            <div className="flex flex-wrap gap-3 mt-4">
              {HUMAN_AVATARS.map((av) => (
                <button 
                  key={av.id} 
                  type="button" 
                  onClick={() => setForm({...form, avatar_id: av.id, avatar_photo_url: ""})} 
                  className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${form.avatar_id === av.id ? "border-primary scale-105 shadow-md" : "border-transparent opacity-70 hover:opacity-100"}`}
                >
                  <img src={av.url} alt={`Avatar option`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            
            <div className="mt-6">
              <Label className="text-xs text-muted-foreground ml-1 mb-1 block">Display Name</Label>
              <Input value={form.preferred_name} onChange={e => setForm({...form, preferred_name: e.target.value})} className="rounded-xl" placeholder="How should we call you?" />
            </div>
          </div>

          {/* Theme & Focus */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader icon={Monitor} title="Theme & Focus" subtitle="Customize your dashboard experience" />
            
            <div className="space-y-4">
              {/* Theme Selector */}
              <div className="grid grid-cols-2 gap-3 p-1 bg-muted/50 rounded-xl border border-border/50">
                <button type="button" onClick={() => setTheme("light")} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${theme === "light" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <Sun className="w-4 h-4" /> Light Mode
                </button>
                <button type="button" onClick={() => setTheme("dark")} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${theme === "dark" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <Moon className="w-4 h-4" /> Dark Mode
                </button>
              </div>

              {/* Focus Mode Toggle */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                <div>
                  <p className="text-sm font-medium">Focus Mode</p>
                  <p className="text-xs text-muted-foreground">Hides dashboard accent colors for a distraction-free view</p>
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
            <SectionHeader icon={Bell} title="Smart Notifications" subtitle="Let RAYMA handle the heavy lifting" />
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3">
                <div className="flex gap-3">
                  <div className="mt-0.5"><Sparkles className="w-4 h-4 text-primary" /></div>
                  <div>
                    <p className="text-sm font-medium">Automated Cash Flow Insights</p>
                    <p className="text-xs text-muted-foreground">RAYMA analyzes your weekly spending automatically</p>
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
                    <p className="text-sm font-medium">Smart Bill Alerts</p>
                    <p className="text-xs text-muted-foreground">Get notified only when upcoming obligations need attention</p>
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
            <SectionHeader icon={Globe} title="Localization & Region" subtitle="Set your primary language and currency" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground ml-1 mb-1 block">Language</Label>
                <Select value={form.preferred_language} onValueChange={v => setForm({...form, preferred_language: v})}>
                  <SelectTrigger><SelectValue placeholder="Select Language" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground ml-1 mb-1 block">Currency</Label>
                <Select value={form.preferred_currency} onValueChange={v => setForm({...form, preferred_currency: v})}>
                  <SelectTrigger><SelectValue placeholder="Select Currency" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="MXN">MXN ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Pay Schedule */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader icon={Calendar} title="Pay Schedule" subtitle="Helps RAYMA calculate your cash flow" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground ml-1 mb-1 block">Frequency</Label>
                <Select value={form.pay_frequency} onValueChange={v => setForm({...form, pay_frequency: v})}>
                  <SelectTrigger><SelectValue placeholder="Frequency" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground ml-1 mb-1 block">Primary Payday</Label>
                <Input placeholder="e.g., 1st & 15th" value={form.pay_day} onChange={e => setForm({...form, pay_day: e.target.value})} className="rounded-xl" />
              </div>
            </div>
          </div>

          {/* Privacy & Legal - App Store Required */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader icon={Shield} title="Privacy & Legal" />
            <div className="space-y-1">
               <Link to="/privacy-policy" className="flex items-center justify-between p-3 hover:bg-muted rounded-xl text-sm transition-colors">
                  Privacy Policy <ChevronRight className="w-4 h-4 text-muted-foreground" />
               </Link>
               <Link to="/terms" className="flex items-center justify-between p-3 hover:bg-muted rounded-xl text-sm transition-colors">
                  Terms of Service & EULA <ChevronRight className="w-4 h-4 text-muted-foreground" />
               </Link>
               <button type="button" onClick={executeAccountDeletion} className="w-full flex items-center justify-between p-3 hover:bg-red-500/10 text-red-500 rounded-xl text-sm transition-colors">
                  <span className="flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete Account & Data</span>
                  <ChevronRight className="w-4 h-4 opacity-50" />
               </button>
            </div>
          </div>

          <Button type="submit" className="w-full h-12 rounded-2xl font-bold shadow-sm hover:shadow-md transition-all">
            {saving ? "Saving..." : saved ? "✓ Preferences Saved" : "Save All Changes"}
          </Button>

          {/* The 80s Easter Egg Trigger */}
          <div className="flex justify-center pt-8 pb-4">
            <button 
              type="button" 
              onClick={() => setShowArcade(true)}
              className="text-muted-foreground/30 hover:text-primary/60 transition-colors flex items-center gap-2 text-xs font-mono"
            >
              <Gamepad2 className="w-4 h-4" />
              INSERT COIN
            </button>
          </div>
        </form>
      </motion.div>

      {/* 80s Arcade Modal (Easter Egg) */}
      <AnimatePresence>
        {showArcade && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-[#0c0c0c] border-2 border-green-500/50 p-6 rounded-xl max-w-sm w-full shadow-[0_0_30px_rgba(34,197,94,0.2)]"
            >
              <div className="flex justify-between items-center mb-6 border-b border-green-500/30 pb-2">
                <h3 className="text-green-400 font-mono text-lg tracking-widest uppercase">Terminal.exe</h3>
                <button onClick={() => setShowArcade(false)} className="text-green-500 hover:text-green-300"><X className="w-5 h-5" /></button>
              </div>
              <div className="h-48 border border-green-500/30 bg-black rounded flex flex-col items-center justify-center gap-4">
                 <Gamepad2 className="w-12 h-12 text-green-500 animate-pulse" />
                 <p className="text-green-400 font-mono text-sm text-center px-4">
                   RAYMA ARCADE v1.0 <br/><br/>
                   <span className="text-xs opacity-70">Coming soon. Take a deep breath. Your finances are automated.</span>
                 </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
