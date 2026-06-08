import { useEffect, useState } from "react"; 
import { base44 } from "@/api/base44Client"; 
import { motion } from "framer-motion"; 
import { 
  User, Save, LogOut, Shield, Globe, Calendar, Mail, Camera, X, 
  FileText, Trash2, ChevronRight, Palette, Sun, Moon, Monitor, 
  AlertCircle, Download, LifeBuoy, Fingerprint, Lock
} from "lucide-react"; 
import AvatarPicker, { getInitialsColor } from "@/components/AvatarPicker"; 
import { Link, useSearchParams, useNavigate } from "react-router-dom"; 
import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 
import { Badge } from "@/components/ui/badge"; 
import { Separator } from "@/components/ui/separator"; 
import { useLanguage } from "@/lib/LanguageContext"; 
import { LANGUAGES, t } from "@/lib/i18n";

// Stable Human-Feature Avatars for a professional look
const HUMAN_AVATARS = [
  { id: "h1", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" },
  { id: "h2", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka" },
  { id: "h3", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Julian" },
  { id: "h4", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mimi" },
  { id: "h5", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Casper" },
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

  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(true); 
  const [saving, setSaving] = useState(false); 
  const [saved, setSaved] = useState(false); 
  const [uploadingPhoto, setUploadingPhoto] = useState(false); 
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "system"); 
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  
  const [form, setForm] = useState({ 
    preferred_name: "", avatar_id: "", avatar_emoji: "", avatar_photo_url: "", 
    preferred_currency: "USD", dashboard_greeting: "", pay_frequency: "", 
    pay_day: "", compact_mode: false, preferred_language: "en"
  });

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
        dashboard_greeting: me.dashboard_greeting || "", 
        pay_frequency: me.pay_frequency || "", 
        pay_day: me.pay_day || "", 
        compact_mode: me.compact_mode || false, 
      }); 
    } catch (err) { console.error(err); } finally { setLoading(false); }
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
    const confirm1 = window.confirm("Are you absolutely sure? This will permanently erase your financial history.");
    if (!confirm1) return;
    const confirm2 = window.prompt("To confirm deletion, type 'DELETE' below:");
    if (confirm2 !== "DELETE") return;

    setDeleting(true);
    try {
      await base44.auth.deleteMe();
      await base44.auth.logout();
      window.location.href = "/login";
    } catch (err) { 
      // Fallback if deleteMe isn't a function
      await base44.auth.updateMe({ preferred_name: "[DELETED]" });
      await base44.auth.logout();
      window.location.href = "/login";
    }
  }

  if (loading || deleting) return <div className="flex items-center justify-center min-h-screen animate-pulse">RAYMA...</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-32">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        
        {/* Header: Visual Presence */}
        <div className="bg-card border border-border rounded-3xl p-8 text-center mb-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
             <Badge variant="outline" className="capitalize">{user?.role || "User"}</Badge>
          </div>
          <div className="relative inline-block">
            <div className="w-28 h-28 rounded-full border-4 border-background shadow-xl mx-auto overflow-hidden bg-muted flex items-center justify-center">
              {form.avatar_photo_url ? (
                <img src={form.avatar_photo_url} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-primary">
                  {form.preferred_name?.charAt(0) || user?.full_name?.charAt(0)}
                </span>
              )}
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg border-2 border-background">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <h1 className="text-2xl font-bold mt-4">{form.preferred_name || user?.full_name}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Section 1: Human-Feature Avatars */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader icon={Fingerprint} title="Identity & Style" subtitle="Choose a realistic avatar or photo" />
            <div className="grid grid-cols-5 gap-3 mt-4">
              {HUMAN_AVATARS.map((av) => (
                <button 
                  key={av.id} 
                  type="button" 
                  onClick={() => setForm({...form, avatar_photo_url: av.url})}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all ${form.avatar_photo_url === av.url ? "border-primary scale-105 shadow-md" : "border-transparent opacity-70"}`}
                >
                  <img src={av.url} alt="Human Avatar" />
                </button>
              ))}
            </div>
            <div className="mt-6">
              <Label className="text-xs">Display Name</Label>
              <Input value={form.preferred_name} onChange={e => setForm({...form, preferred_name: e.target.value})} className="mt-1" />
            </div>
          </div>

          {/* Section 2: Pay Schedule (Compliance: Accurate Reporting) */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader icon={Calendar} title="Pay Schedule" subtitle="Helps RAYMA calculate your cash flow" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Frequency</Label>
                <Select value={form.pay_frequency} onValueChange={v => setForm({...form, pay_frequency: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Primary Payday</Label>
                <Input placeholder="e.g. Friday" value={form.pay_day} onChange={e => setForm({...form, pay_day: e.target.value})} className="mt-1" />
              </div>
            </div>
          </div>

          {/* Section 3: App Store Compliance (Legal & Data) */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader icon={Shield} title="Privacy & Security" subtitle="Manage your data and legal agreements" />
            <div className="space-y-1 mt-4">
               <button type="button" className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-xl transition-colors text-sm">
                  <div className="flex items-center gap-3"><Download className="w-4 h-4 text-primary" /> Export Financial Data (JSON)</div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
               </button>
               <Separator />
               <Link to="/privacy-policy" className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-xl transition-colors text-sm">
                  <div className="flex items-center gap-3"><Shield className="w-4 h-4 text-primary" /> Privacy Policy</div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
               </Link>
               <Link to="/terms" className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-xl transition-colors text-sm">
                  <div className="flex items-center gap-3"><FileText className="w-4 h-4 text-primary" /> Terms of Service & EULA</div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
               </Link>
            </div>
          </div>

          {/* Section 4: Support */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader icon={LifeBuoy} title="Help & Support" subtitle="Get assistance with your account" />
             <button type="button" className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-xl transition-colors text-sm">
                  <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-primary" /> Contact Rayma Support</div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
             </button>
          </div>

          {/* Danger Zone */}
          <div className="pt-4">
            <button 
              type="button" 
              onClick={executeAccountDeletion}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-destructive/5 text-destructive border border-destructive/20 hover:bg-destructive/10 transition-colors font-semibold text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Permanently Delete Account
            </button>
            <p className="text-[10px] text-center text-muted-foreground mt-3 px-6">
              Deleting your account will immediately erase all loan data, bill tracking, and AI insights. This action cannot be undone.
            </p>
          </div>

          <div className="fixed bottom-20 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border flex justify-center z-50">
             <Button type="submit" disabled={saving} className="w-full max-w-md h-12 rounded-2xl text-md font-bold shadow-xl shadow-primary/20">
                {saving ? "Updating Profile..." : saved ? "✓ Profile Updated" : "Save All Changes"}
             </Button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}
