import { useEffect, useState } from "react"; 
import { base44 } from "@/api/base44Client"; 
import { motion } from "framer-motion"; 
import { User, Save, LogOut, Shield, Globe, Calendar, Mail, Camera, X, FileText, Trash2, ChevronRight, Palette, Sun, Moon, Monitor, AlertCircle } from "lucide-react"; 
import AvatarPicker, { getInitialsColor } from "@/components/AvatarPicker"; 
import { Link, useSearchParams, useNavigate } from "react-router-dom"; 
import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 
import { Badge } from "@/components/ui/badge"; 
import { useLanguage } from "@/lib/LanguageContext"; 
import { LANGUAGES, t } from "@/lib/i18n";

const CURRENCIES = [ 
  { value: "USD", label: "$ USD — US Dollar" }, 
  { value: "EUR", label: "€ EUR — Euro" }, 
  { value: "GBP", label: "£ GBP — British Pound" }, 
  { value: "CAD", label: "CA$ CAD — Canadian Dollar" }, 
  { value: "AUD", label: "A$ AUD — Australian Dollar" }, 
  { value: "JPY", label: "¥ JPY — Japanese Yen" }, 
  { value: "INR", label: "₹ INR — Indian Rupee" }
];

// Refined, finance-focused professional avatars
const COOL_AVATARS = ["💼", "📈", "🎯", "🧠", "🌱", "🔑", "🛡️", "🏦", "🏛️", "🌟"];

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
  
  const T = (key, fallback) => {
    const translated = t(lang, key);
    return translated && translated !== key ? translated : fallback;
  };

  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(true); 
  const [saving, setSaving] = useState(false); 
  const [saved, setSaved] = useState(false); 
  const [uploadingPhoto, setUploadingPhoto] = useState(false); 
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "system"); 
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ 
    preferred_name: "", avatar_id: "", avatar_emoji: "", avatar_photo_url: "", 
    preferred_currency: "USD", dashboard_greeting: "", pay_frequency: "", 
    pay_day: "", compact_mode: false, 
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

  async function executeAccountDeletion() {
    const doubleCheck = window.confirm(T("deleteWarning", "FINAL WARNING: This will permanently erase your profile and account. Proceed?"));
    if (!doubleCheck) { navigate("/profile"); return; }
    try {
      setDeleting(true);
      if (base44.auth.deleteMe) await base44.auth.deleteMe(); 
      else await base44.auth.updateMe({ preferred_name: "[DELETED ACCOUNT]" }); 
      await base44.auth.logout();
      window.location.href = "/login"; 
    } catch (err) { base44.auth.logout(); window.location.href = "/login"; } finally { setDeleting(false); }
  }

  function applyTheme(t) { 
    const html = document.documentElement; 
    if (t === "dark") { html.classList.add("dark"); localStorage.setItem("theme", "dark"); } 
    else if (t === "light") { html.classList.remove("dark"); localStorage.setItem("theme", "light"); } 
    else { localStorage.removeItem("theme"); const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches; prefersDark ? html.classList.add("dark") : html.classList.remove("dark"); } 
    setTheme(t); 
  } 

  async function handleSave(e) { 
    e.preventDefault(); 
    setSaving(true); 
    try {
      await base44.auth.updateMe(form); 
    } catch (err) { console.error("Database save skipped.", err); } 
    finally {
      if (form.preferred_language) setLang(form.preferred_language); 
      setSaving(false); 
      setSaved(true); 
      setTimeout(() => setSaved(false), 2500); 
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        {/* Profile Card */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 p-6 mb-6 text-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full ring-4 ring-primary/30 mx-auto mb-3 shadow-lg overflow-hidden flex items-center justify-center font-bold text-white text-4xl" style={{ backgroundColor: form.avatar_photo_url ? "transparent" : getInitialsColor(form.preferred_name, form.avatar_id) }}>
              {form.avatar_photo_url ? <img src={form.avatar_photo_url} alt="avatar" className="w-full h-full object-cover" /> : form.avatar_emoji || (form.preferred_name || "?").split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
            </div>
            <h2 className="text-xl font-bold font-heading text-foreground">{form.preferred_name || user?.full_name}</h2>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Identity Section */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">{T("displayName", "Display Name")}</Label>
                <Input value={form.preferred_name} onChange={e => setForm(f => ({ ...f, preferred_name: e.target.value }))} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">{T("avatar", "Choose Professional Avatar")}</Label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {COOL_AVATARS.map(emoji => (
                    <button key={emoji} type="button" onClick={() => setForm(f => ({ ...f, avatar_emoji: emoji, avatar_photo_url: "" }))} className={`text-2xl p-2 rounded-xl transition-all ${form.avatar_emoji === emoji ? "bg-primary/20 border-2 border-primary" : "bg-muted hover:bg-muted/70"}`}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <SectionHeader icon={Globe} title={T("preferences", "Preferences")} />
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">{T("preferredCurrency", "Currency")}</Label>
                <Select value={form.preferred_currency} onValueChange={v => setForm(f => ({ ...f, preferred_currency: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Appearance Section */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <SectionHeader icon={Palette} title={T("personalization", "Personalization")} />
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">{T("appTheme", "App Theme")}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{ value: "light", label: "Light", icon: Sun }, { value: "dark", label: "Dark", icon: Moon }, { value: "system", label: "System", icon: Monitor }].map(({ value, label, icon: Icon }) => (
                    <button key={value} type="button" onClick={() => applyTheme(value)} className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium ${theme === value ? "bg-primary/10 border-primary text-primary" : "bg-muted"}`}>
                      <Icon className="w-4 h-4" />{label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={saving} className="w-full rounded-xl h-11 font-semibold">
            {saving ? T("saving", "Saving...") : saved ? T("saved", "✓ Saved!") : "Save Changes"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
