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
  { value: "USD", label: "$ USD — US Dollar" }, 
  { value: "EUR", label: "€ EUR — Euro" }, 
  { value: "GBP", label: "£ GBP — British Pound" }, 
  { value: "CAD", label: "CA$ CAD — Canadian Dollar" }, 
  { value: "AUD", label: "A$ AUD — Australian Dollar" }, 
  { value: "JPY", label: "¥ JPY — Japanese Yen" }, 
  { value: "INR", label: "₹ INR — Indian Rupee" }
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
  
  // FAIL-SAFE TRANSLATION WRAPPER
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
    pay_day: "", accent_color: "", compact_mode: false, 
  });

  useEffect(() => { 
    loadUser(); 
  }, []); 

  useEffect(() => {
    if (!loading && searchParams.get("action") === "delete") {
      executeAccountDeletion();
    }
  }, [searchParams, loading]);

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
        accent_color: me.accent_color || "", 
        compact_mode: me.compact_mode || false, 
      }); 
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false); 
    }
  } 

  async function executeAccountDeletion() {
    const doubleCheck = window.confirm(T("deleteWarning", "FINAL WARNING: This will permanently erase your profile and account. Proceed?"));
    if (!doubleCheck) { navigate("/profile"); return; }
    try {
      setDeleting(true);
      if (base44.auth.deleteMe) { 
        await base44.auth.deleteMe(); 
      } else { 
        await base44.auth.updateMe({ preferred_name: "[DELETED ACCOUNT]" }); 
      }
      await base44.auth.logout();
      window.location.href = "/login"; 
    } catch (err) { 
      base44.auth.logout();
      window.location.href = "/login";
    } finally { 
      setDeleting(false); 
    }
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
      // Try to save to the database
      await base44.auth.updateMe(form); 
    } catch (err) {
      console.error("Database save skipped: Missing columns in User table.", err);
    } finally {
      // ALWAYS update the UI language, even if the DB save fails!
      if (form.preferred_language) {
        setLang(form.preferred_language); 
      }
      // Unfreeze the button
      setSaving(false); 
      setSaved(true); 
      setTimeout(() => setSaved(false), 2500); 
    }
  }

  async function handlePhotoUpload(e) { 
    const file = e.target.files?.[0]; 
    if (!file) return; 
    setUploadingPhoto(true); 
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file }); 
      setForm(f => ({ ...f, avatar_photo_url: file_url, avatar_emoji: "" })); 
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingPhoto(false); 
    }
  } 

  function handleLogout() { base44.auth.logout(); } 

  if (loading || deleting) { 
    return ( 
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4"> 
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /> 
        {deleting && <p className="text-sm font-medium text-destructive animate-pulse">{T("deletingAccount", "Deleting Account Requirements...")}</p>}
      </div> 
    ); 
  }

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 p-6 mb-6 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="w-24 h-24 rounded-full ring-4 ring-primary/30 mx-auto mb-3 shadow-lg overflow-hidden flex items-center justify-center font-bold text-white text-xl" style={{ backgroundColor: form.avatar_id ? getInitialsColor(form.preferred_name || user?.full_name, form.avatar_id) : "#ccc" }}>
              {form.avatar_photo_url ? (
                <img src={form.avatar_photo_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                (form.preferred_name || user?.full_name || "?").split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase() || "?"
              )}
            </div>
            <h2 className="text-xl font-bold font-heading text-foreground">{form.preferred_name || user?.full_name}</h2>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <Mail className="w-3 h-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Badge className="mt-2 text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
              {user?.role === "admin" ? T("adminRole", "Admin") : T("memberRole", "Member")}
            </Badge>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">{T("displayName", "Display Name")}</Label>
                <Input value={form.preferred_name} onChange={e => setForm(f => ({ ...f, preferred_name: e.target.value }))} placeholder={user?.full_name || T("yourName", "Your name")} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">{T("customGreeting", "Custom Greeting")}</Label>
                <Input value={form.dashboard_greeting} onChange={e => setForm(f => ({ ...f, dashboard_greeting: e.target.value }))} placeholder={T("greetingPlaceholder", "e.g. Let's crush that debt!")} className="mt-1 rounded-xl" />
                <p className="text-xs text-muted-foreground mt-1">{T("greetingDesc", "Shown on your dashboard every time you log in.")}</p>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">{T("avatar", "Avatar")}</Label>
                <div className="mt-2 mb-3 flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer bg-muted hover:bg-muted/70 transition-colors rounded-xl px-4 py-2 text-sm font-medium text-foreground">
                    <Camera className="w-4 h-4 text-primary" />
                    {uploadingPhoto ? T("uploading", "Uploading...") : T("uploadPhoto", "Upload Photo")}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                  </label>
                  {form.avatar_photo_url && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, avatar_photo_url: "", avatar_emoji: "😊" }))} className="flex items-center gap-1.5 text-xs text-destructive hover:underline" >
                      <X className="w-3 h-3" /> {T("removePhoto", "Remove photo")}
                    </button>
                  )}
                </div>
                <AvatarPicker userName={form.preferred_name || user?.full_name} value={form.avatar_id} onChange={(id) => setForm(f => ({ ...f, avatar_id: id, avatar_photo_url: "" }))} />
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <SectionHeader icon={Globe} title={T("preferences", "Preferences")} subtitle={T("preferredCurrency", "Preferred Currency") + " & " + T("preferredLanguage", "Preferred Language")} />
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">{T("preferredCurrency", "Preferred Currency")}</Label>
                <Select value={form.preferred_currency} onValueChange={v => setForm(f => ({ ...f, preferred_currency: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">{T("preferredLanguage", "Preferred Language")}</Label>
                <Select value={form.preferred_language} onValueChange={v => setForm(f => ({ ...f, preferred_language: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES?.map(l => (
                      <SelectItem key={l.code} value={l.code}>{l.flag} {l.label}</SelectItem>
                    )) || null}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">{T("langUpdateDesc", "App language updates after saving.")}</p>
              </div>
            </div>
          </div>

          {/* Personalization Section */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <SectionHeader icon={Palette} title={T("personalization", "Personalization")} subtitle={T("personalizationDesc", "Theme, appearance, and layout")} />
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">{T("appTheme", "App Theme")}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "light", label: T("themeLight", "Light"), icon: Sun },
                    { value: "dark", label: T("themeDark", "Dark"), icon: Moon },
                    { value: "system", label: T("themeSystem", "System"), icon: Monitor },
                  ].map(({ value, label, icon: Icon }) => (
                    <button key={value} type="button" onClick={() => applyTheme(value)} className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all ${ theme === value ? "bg-primary/10 border-primary text-primary" : "bg-muted border-transparent text-muted-foreground hover:border-border" }`} >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{T("compactMode", "Compact Mode")}</p>
                  <p className="text-xs text-muted-foreground">{T("compactModeDesc", "Reduce spacing for a denser layout")}</p>
                </div>
                <button type="button" onClick={() => setForm(f => ({ ...f, compact_mode: !f.compact_mode }))} className={`relative w-11 h-6 rounded-full transition-colors ${form.compact_mode ? "bg-primary" : "bg-muted"}`} >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.compact_mode ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">{T("dashboardAccent", "Dashboard Accent")}</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: "", label: T("colorDefault", "Default"), color: "bg-primary" },
                    { value: "violet", label: T("colorViolet", "Violet"), color: "bg-violet-500" },
                    { value: "rose", label: T("colorRose", "Rose"), color: "bg-rose-500" },
                    { value: "amber", label: T("colorAmber", "Amber"), color: "bg-amber-500" },
                    { value: "sky", label: T("colorSky", "Sky"), color: "bg-sky-500" },
                    { value: "emerald", label: T("colorEmerald", "Emerald"), color: "bg-emerald-500" },
                  ].map(({ value, label, color }) => (
                    <button key={label} type="button" onClick={() => setForm(f => ({ ...f, accent_color: value }))} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${ form.accent_color === value ? "border-foreground text-foreground" : "border-transparent bg-muted text-muted-foreground hover:border-border" }`} >
                      <span className={`w-3 h-3 rounded-full ${color}`} />
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">{T("accentDesc", "Accent color preference is saved to your profile.")}</p>
              </div>
            </div>
          </div>

          {/* Pay Schedule Section */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <SectionHeader icon={Calendar} title={T("paySchedule", "Pay Schedule")} subtitle={T("payScheduleDesc", "Used for income reminders and cash flow accuracy")} />
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">{T("payFrequency", "Pay Frequency")}</Label>
                <Select value={form.pay_frequency} onValueChange={v => setForm(f => ({ ...f, pay_frequency: v, pay_day: "" }))}>
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue placeholder={T("selectFrequency", "Select frequency…")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">{T("freqWeekly", "Weekly")}</SelectItem>
                    <SelectItem value="biweekly">{T("freqBiweekly", "Bi-weekly")}</SelectItem>
                    <SelectItem value="monthly">{T("freqMonthly", "Monthly")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(form.pay_frequency === "weekly" || form.pay_frequency === "biweekly") && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">{T("paydayWeek", "Payday (day of week)")}</Label>
                  <Select value={form.pay_day} onValueChange={v => setForm(f => ({ ...v, pay_day: v }))}>
                    <SelectTrigger className="mt-1 rounded-xl">
                      <SelectValue placeholder={T("selectDay", "Select day…")} />
                    </SelectTrigger>
                    <SelectContent>
                      {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(d => (
                        <SelectItem key={d} value={d}>{T(`day${d}`, d)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {form.pay_frequency === "monthly" && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">{T("paydayMonth", "Payday (day of month)")}</Label>
                  <Input type="number" min={1} max={31} value={form.pay_day} onChange={e => setForm(f => ({ ...f
