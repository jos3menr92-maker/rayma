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
        pay_frequency: userProfile.pay_frequency ||
