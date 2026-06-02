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
import { Separator } from "@/components/ui/separator"; 
import { useLanguage } from "@/lib/LanguageContext"; 
import { LANGUAGES, t } from "@/lib/i18n";

const CURRENCIES = [ 
  { value: "USD", label: "$ USD — US Dollar" }, { value: "EUR", label: "€ EUR — Euro" }, 
  { value: "GBP", label: "£ GBP — British Pound" }, { value: "CAD", label: "CA$ CAD — Canadian Dollar" },
  { value: "AUD", label: "A$ AUD — Australian Dollar" }, { value: "JPY", label: "¥ JPY — Japanese Yen" },
  { value: "INR", label: "₹ INR — Indian Rupee" }, { value: "MXN", label: "$ MXN — Mexican Peso" }
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
  const T = (key) => t(lang, key); 
  const [set] = useState(null); 
  const [loading, setLoading] = useState(true); 
  const [saving, setSaving] = useState(false); 
  const [saved, setSaved] = useState(false); 
  const [uploadingsetUploading] = useState(false); 
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "system"); 
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({ 
    preferred_name: "", avatar_id: "", avatar_emoji: "", avatar_photo_url: "", 
    preferred_currency: "USD", dashboard_greeting: "", pay_frequency: "", 
    pay_day: "", accent_color: "", compact_mode: false, 
  }); 

  useEffect(() => { loadUser(); },); 

  useEffect(() => {
    if (!loading && searchParams.get("action") === "delete") {
      executeAccountDeletion();
    }
  }, [searchParams, loading]);

  async function loadUser() { 
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
      accent_color: me.accent_color || "", 
      compact_mode: me.compact_mode || false, 
    }); 
    setLoading(false); 
  } 

  async function executeAccountDeletion() {
    const doubleCheck = window.confirm("FINAL WARNING: This will permanently erase your data and profile. Proceed?");
    if (!doubleCheck) { navigate("/profile"); return; }
    try {
      setDeleting(true);
      if (base44.auth.deleteMe) { await base44.auth.deleteMe(); } 
      else { await base44.auth.updateMe({ preferred_name: "[DELETED]" }); }
      await base44.auth.logout();
      window.location.href = "/login"; 
    } catch (err) { 
      base44.auth.logout();
      window.location.href = "/login";
    } finally { setDeleting(false); }
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
    await base44.auth.updateMe(form); 
    setLang(form.preferred_language); 
    setSaving(false); setSaved(true); 
    setTimeout(() => setSaved(false), 2500); 
  } 

  function handleLogout() { base44.auth.logout(); } 

  if (loading || deleting) { 
    return ( 
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4"> 
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /> 
        {deleting && <p className="text-sm font-medium text-destructive animate-pulse">Deleting Account...</p>}
      </div> 
    ); 
  }

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Identity Section */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-5">
          
          <Label className="text-xs font-medium text-muted-foreground">Display Name</Label>
          <Input value={form.preferred_name} onChange={e => setForm(f => ({ ...f, preferred_name: e.target.value }))} className="mt-1 mb-4 rounded-xl" />
          <AvatarPicker userName={form.preferred_name || user?.full_name} value={form.avatar_id} onChange={(id) => setForm(f => ({ ...f, avatar_id: id, avatar_photo_url: "" }))} />
        </div>

        {/* Legal & Compliance Section */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-5">
          <SectionHeader icon={Shield} title="Privacy & Legal" subtitle="Required for App Store compliance" />
          <div className="space-y-2">
            <Link to="/privacy" className="flex items-center justify-between p-3 bg-muted rounded-xl">
              <span className="text-sm font-medium">Privacy Policy</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
            <button type="button" onClick={executeAccountDeletion} className="w-full flex items-center justify-between p-3 bg-destructive/5 text-destructive rounded-xl">
              <span className="text-sm font-medium">Delete Account</span>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl h-11 font-semibold mb-4">
          {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Changes"}
        </Button>
        <Button variant="outline" onClick={handleLogout} className="w-full rounded-xl h-11 text-destructive">
          Sign Out
        </Button>
      </motion.div>
    </div>
  );
}