import { useEffect, useState, useRef } from "react"; 
import { base44 } from "@/api/base44Client"; 
import { motion } from "framer-motion"; 
import { 
  User, Save, LogOut, Shield, Globe, Calendar, Mail, Camera, X, 
  FileText, Trash2, ChevronRight, Palette, Sun, Moon, Monitor, 
  AlertCircle, Download, LifeBuoy, Fingerprint, Lock, Loader2
} from "lucide-react"; 
import { Link, useNavigate } from "react-router-dom"; 
import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 
import { useLanguage } from "@/lib/LanguageContext"; 
import { t } from "@/lib/i18n";

// CSS Sprite grid for professional avatars.
// Assumes the provided avatar grid image is a 4x4 layout (16 faces total).
const AVATAR_SPRITE_URL = "/avatar-grid.jpg"; // Update this with your actual image file name in the public folder
const GRID_SIZE = "400% 400%"; 

const HUMAN_AVATARS = [
  { id: "face1", bgPos: "0% 0%" },
  { id: "face2", bgPos: "33.33% 0%" },
  { id: "face3", bgPos: "66.66% 0%" },
  { id: "face4", bgPos: "100% 0%" },
  { id: "face5", bgPos: "0% 33.33%" },
  { id: "face6", bgPos: "33.33% 33.33%" },
  { id: "face7", bgPos: "66.66% 33.33%" },
  { id: "face8", bgPos: "100% 33.33%" },
  { id: "face9", bgPos: "0% 66.66%" },
  { id: "face10", bgPos: "33.33% 66.66%" },
  { id: "face11", bgPos: "66.66% 66.66%" },
  { id: "face12", bgPos: "100% 66.66%" },
  { id: "face13", bgPos: "0% 100%" },
  { id: "face14", bgPos: "33.33% 100%" },
  { id: "face15", bgPos: "66.66% 100%" },
  { id: "face16", bgPos: "100% 100%" },
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
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "system"); 
  const [deleting, setDeleting] = useState(false);
  
  const [form, setForm] = useState({ 
    preferred_name: "", avatar_id: "", avatar_emoji: "", avatar_photo_url: "", 
    preferred_currency: "USD", preferred_language: "en", dashboard_greeting: "", 
    pay_frequency: "", pay_day: "", compact_mode: false 
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
    if (!window.confirm("Permanent account deletion? This cannot be undone.")) return;
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
                 <div 
                   className="w-full h-full"
                   style={{
                     backgroundImage: `url(${AVATAR_SPRITE_URL})`,
                     backgroundPosition: HUMAN_AVATARS.find(a => a.id === form.avatar_id)?.bgPos || "0% 0%",
                     backgroundSize: GRID_SIZE
                   }}
                 />
               ) : <span className="font-bold text-primary">{form.preferred_name?.charAt(0) || "U"}</span>}
            </div>
            <button onClick={() => fileInputRef.current.click()} className="absolute bottom-0 right-0 p-3 bg-primary text-white rounded-full shadow-lg border-2 border-background hover:scale-105 transition-transform">
              <Camera className="w-5 h-5" />
            </button>
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
          <h1 className="text-2xl font-bold mt-4">{form.preferred_name || "User"}</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Identity & Style */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader icon={Fingerprint} title="Identity & Style" subtitle="Upload a selfie or choose a professional avatar" />
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 mt-4">
              {HUMAN_AVATARS.map((av) => (
                <button 
                  key={av.id} 
                  type="button" 
                  onClick={() => setForm({...form, avatar_id: av.id, avatar_photo_url: ""})} 
                  className={`relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-all ${form.avatar_id === av.id ? "border-primary scale-105" : "border-transparent opacity-70 hover:opacity-100"}`}
                  style={{
                    backgroundImage: `url(${AVATAR_SPRITE_URL})`,
                    backgroundPosition: av.bgPos,
                    backgroundSize: GRID_SIZE
                  }}
                  aria-label={`Select Avatar ${av.id}`}
                />
              ))}
            </div>
            <Input value={form.preferred_name} onChange={e => setForm({...form, preferred_name: e.target.value})} className="mt-6 rounded-xl" placeholder="Display Name" />
          </div>

          {/* Compliance & Settings */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader icon={Calendar} title="Pay Schedule" subtitle="Helps RAYMA calculate your cash flow" />
            <div className="grid grid-cols-2 gap-4">
              <Select value={form.pay_frequency} onValueChange={v => setForm({...form, pay_frequency: v})}>
                <SelectTrigger><SelectValue placeholder="Frequency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Primary Payday" value={form.pay_day} onChange={e => setForm({...form, pay_day: e.target.value})} />
            </div>
          </div>

          {/* Privacy & Legal - App Store Required */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader icon={Shield} title="Privacy & Legal" />
            <div className="space-y-1">
               <Link to="/privacy-policy" className="flex items-center justify-between p-3 hover:bg-muted rounded-xl text-sm">
                  Privacy Policy <ChevronRight className="w-4 h-4" />
               </Link>
               <Link to="/terms" className="flex items-center justify-between p-3 hover:bg-muted rounded-xl text-sm">
                  Terms of Service & EULA <ChevronRight className="w-4 h-4" />
               </Link>
            </div>
          </div>

          <Button type="submit" className="w-full h-12 rounded-2xl font-bold">
            {saving ? "Saving..." : saved ? "✓ Saved!" : "Save All Changes"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}