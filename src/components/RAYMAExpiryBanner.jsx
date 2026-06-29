import { AlertTriangle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { useMemo } from "react";

function getEffectiveExpiry(user) {
  if (user?.annual_pass_expires_at) return new Date(user.annual_pass_expires_at + "T00:00:00");
  if (user?.rayma_expires_at) return new Date(user.rayma_expires_at + "T00:00:00");
  if (user?.created_date) {
    const trial = new Date(user.created_date);
    trial.setMonth(trial.getMonth() + 6);
    return trial;
  }
  return null;
}

export default function RAYMAExpiryBanner({ user }) {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);

  const expiry = getEffectiveExpiry(user);
  if (!expiry) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysLeft > 30) return null;

  const isExpired = daysLeft <= 0;
  const isDonated = !!(user?.annual_pass_expires_at || user?.rayma_expires_at);

  if (isExpired) {
    return (
      <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-2xl p-3 mb-3">
        <XCircle className="w-4 h-4 text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">{T("raymaStopped", "Rayma AI has stopped")}</p>
          <p className="text-[11px] text-muted-foreground">
            {isDonated ? T("annualPassExpired", "Your Annual Pass has expired.") : T("trialEnded", "Your free 6-month trial has ended.")} {T("getAnnualPassRestore", "Get an Annual Pass to restore AI features.")}
          </p>
        </div>
        <button
          onClick={() => navigate("/store")}
          className="shrink-0 text-[11px] font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground px-3 py-1.5 rounded-xl transition-colors"
        >
          {T("upgrade", "Upgrade")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-400/30 rounded-2xl p-3 mb-3">
      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">
          {T("raymaExpiresIn", "Rayma AI {type} in {n} day(s)").replace("{type}", isDonated ? T("raymaExpiresType", "expires") : T("raymaTrialType", "free trial ends")).replace("{n}", daysLeft)}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {T("getAnnualPassBefore", "Get the Annual Pass before it expires to keep AI features running.")}
        </p>
      </div>
      <button
        onClick={() => navigate("/store")}
        className="shrink-0 text-[11px] font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-xl transition-colors"
      >
        {T("upgrade", "Upgrade")}
      </button>
    </div>
  );
}