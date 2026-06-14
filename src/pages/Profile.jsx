import { useEffect, useState, useRef } from "react"; 
import { supabase } from "@/lib/supabaseClient"; // 🔌 SECURE VAULT
import { useFinancialData } from "@/lib/FinancialDataContext"; // 🧠 SECURE BRAIN
import { motion } from "framer-motion"; 
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
  const T = (key, fallback) => t(lang, key) !== key ? t(lang, key) : fallback;
  const fileInputRef = useRef(null);
  
  // 🧠 SECURE: Read and reload from the Brain directly
  const { userProfile, reload, loading: contextLoading } = useFinancialData();
  
  const [saving, setSaving] = useState(false); 
  const [saved, setSaved] = useState(false); 
  const [uploadingPhoto, setUploadingPhoto] = useState(false); 
  const [deleting, setDeleting] = useState(false);
  
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
        preferred_language: userProfile.preferred_language || "en", 
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
      const fileName = `${userProfile.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setForm(f => ({ ...f, avatar_photo_url: publicUrl, avatar_emoji: "", avatar_id: "" }));
    } catch (err) { 
      console.error(err); 
      alert("Failed to upload photo. Make sure your 'avatars' bucket is public in Supabase!");
    } finally { 
      setUploadingPhoto(false); 
    }
  }

  async function handleSave(e) { 
    e.preventDefault(); 
    if (!userProfile) return;
    setSaving(true); 
    
    try {
      await supabase.auth.updateUser({ data: form });
      await supabase.from('profiles').update(form).eq('id', userProfile.id);
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

  // 🚀 UPGRADED: 30-Day Soft Deletion Strategy
  async function executeAccountDeletion() {
    if (!window.confirm("Your account will be deactivated and permanently deleted in 30 days. Proceed?")) return;
    setDeleting(true);
    try {
      // Tags the profile for deletion instead of wiping it immediately
      await supabase.from('profiles').update({ 
        deleted_at: new Date().toISOString() 
      }).eq('id', userProfile.id);
      
      await supabase.auth.signOut();
      window.location.href = "/auth";
    } catch (err) { 
      console.error(err);
      setDeleting(false);
    }
  }

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

            {/* ✨ NEW: The Erase Picture Button */}
            {form.avatar_photo_url && (
              <button 
                onClick={() => setForm(f => ({ ...f, avatar_photo_url: "" }))} 
                type="button" 
                className="absolute top-0 right-0 p-2 bg-destructive text-white rounded-full shadow-lg border-2 border-background hover:scale-105 transition-transform"
                title="Remove Photo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
          <h1 className="text-2xl font-bold mt-4">{form.preferred_name || "User"}</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Identity & Style */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader icon={Fingerprint} title="Identity & Style" subtitle="Choose a professional avatar to represent you" />
            
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
              <Label className="text-xs text-muted-foreground ml-1 mb-1 block">Display Name</Label>
              <Input value={form.preferred_name} onChange={e => setForm({...form, preferred_name: e.target.value})} className="rounded-xl" placeholder="How should we call you?" />
            </div>
          </div>

          {/* Theme & Focus */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader icon={Monitor} title="Theme & Focus" subtitle="Customize your dashboard experience" />
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-1 bg-muted/50 rounded-xl border border-border/50">
                <button type="button" onClick={() => setTheme("light")} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${theme === "light" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <Sun className="w-4 h-4" /> Light Mode
                </button>
                <button type="button" onClick={() => setTheme("dark")} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${theme === "dark" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <Moon className="w-4 h-4" /> Dark Mode
                </button>
              </div>

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
               <Link to="/privacy" className="flex items-center justify-between p-3 hover:bg-muted rounded-xl text-sm transition-colors">
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
              onClick={() => navigate("/arcade")}
              className="text-muted-foreground/30 hover:text-primary/60 transition-colors flex items-center gap-2 text-xs font-mono"
            >
              <Gamepad2 className="w-4 h-4" />
              INSERT COIN
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
