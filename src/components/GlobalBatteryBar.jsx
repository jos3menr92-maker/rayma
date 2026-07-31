import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

/**
 * Global, always-visible AI energy battery for the app's top bar.
 * Colored and labeled by membership tier, and reflects the SAME balance the
 * Rayma AI chat gates on (ai_tokens) so the user always sees the truth.
 * Tapping it opens the Store.
 */
const TIER = {
  free: {
    wordKey: "batteryWord",
    wordFallback: "Battery",
    fill: "bg-emerald-500",
    body: "border-emerald-500/60",
    chip: "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10",
  },
  power_lithium: {
    wordKey: "tierLithium",
    wordFallback: "Lithium",
    fill: "bg-blue-500",
    body: "border-blue-500",
    chip: "border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10",
  },
  power_generator: {
    wordKey: "tierGenerator",
    wordFallback: "Generator",
    fill: "bg-primary",
    body: "border-primary",
    chip: "border-primary/40 bg-primary/5 hover:bg-primary/10",
  },
};

export default function GlobalBatteryBar() {
  const { userProfile } = useFinancialData();
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const tr = t(lang, key); return tr !== key ? tr : fallback; }, [lang]);

  const sub = userProfile?.subscription_type || "free";
  const tier = TIER[sub] || TIER.free;

  const isPremiumPass = useMemo(() => {
    const exp = userProfile?.annual_pass_expires_at;
    if (!exp) return false;
    const d = String(exp).includes("T") ? exp : `${exp}T23:59:59Z`;
    return new Date(d) > new Date();
  }, [userProfile?.annual_pass_expires_at]);

  const isUnlimited = sub === "power_generator" || isPremiumPass;
  const tokens = userProfile?.ai_tokens ?? 0;
  const max = userProfile?.ai_tokens_daily_limit || 10;
  const pct = isUnlimited ? 100 : Math.max(0, Math.min(100, (tokens / max) * 100));
  const isLow = !isUnlimited && tokens <= 2;

  return (
    <Link
      to="/store"
      aria-label={T("aiEnergy", "AI Energy")}
      title={T("aiEnergy", "AI Energy")}
      className={`flex items-center pl-2 pr-2.5 py-1.5 rounded-full border transition-colors ${tier.chip} ${isLow ? "animate-pulse" : ""}`}
    >
      <div className="relative flex items-center">
        {/* Battery body — wide enough to fit "Generator" (longest tier word) */}
        <div className={`relative w-24 h-7 border-2 ${tier.body} rounded-[5px] overflow-hidden bg-muted/50`}>
          <div className="absolute inset-0 pointer-events-none">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="absolute top-0 bottom-0 border-r border-muted-foreground/20" style={{ left: `${(i / 5) * 100}%` }} />
            ))}
          </div>
          <div className={`absolute top-0 left-0 bottom-0 transition-all ${tier.fill}`} style={{ width: `${pct}%` }} />
          <span
            className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tracking-tight text-white"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.55)" }}
          >
            {T(tier.wordKey, tier.wordFallback)}
          </span>
        </div>
        {/* Terminal nub */}
        <div className={`w-[3px] h-4 ${tier.fill} rounded-r-sm ml-[1px]`} />
      </div>
    </Link>
  );
}