import { AlertTriangle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { useMemo } from "react";

/**
 * RAYMAExpiryBanner — warns ONLY when a real AI pass
 * (annual_pass_expires_at, granted via promo codes) is ending within 30 days,
 * or has just ended (shown for 7 days after expiry). Free users are free
 * forever (15 coins / week) and never see a trial banner. Paid subscribers
 * keep their own subscription benefits, so they never see this either.
 */

function getPassExpiry(user) {
  if (!user?.annual_pass_expires_at) return null;
  const raw = String(user.annual_pass_expires_at);
  return new Date(raw.includes("T") ? raw : `${raw}T23:59:59Z`);
}

export default function RAYMAExpiryBanner({ user }) {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);

  const expiry = getPassExpiry(user);
  const hasPaidSub = user?.subscription_type && user.subscription_type !== "free";
  if (!expiry || hasPaidSub) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysLeft > 30 || daysLeft < -7) return null;

  const isExpired = daysLeft <= 0;

  if (isExpired) {
    return (
      <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-2xl p-3 mb-3">
        <XCircle className="w-4 h-4 text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">{T("passEnded", "Your AI pass has ended")}</p>
          <p className="text-[11px] text-muted-foreground">
            {T("passEndedBody", "You're back on the free plan — 15 coins (5 questions) per week. Upgrade for unlimited AI.")}
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
          {T("passEndsIn", "Your AI pass ends in {n} day(s)").replace("{n}", daysLeft)}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {T("passEndsInBody", "After it ends you'll return to the free plan — 15 coins (5 questions) per week. Upgrade to keep unlimited AI.")}
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