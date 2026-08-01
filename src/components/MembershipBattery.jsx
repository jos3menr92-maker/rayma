import { useMemo } from "react";
import { Zap } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

/**
 * MembershipBattery — the single "energy idea" battery used across the app.
 * Colored + labeled by membership tier (Battery / Lithium / Generator),
 * reflects the same ai_tokens balance the Rayma AI chat gates on, and shows
 * the tier word inside with a friendly ⚡ bolt + juicy gradient fill.
 */

export const TIER = {
  free: {
    wordKey: "batteryWord",
    wordFallback: "Battery",
    fill: "bg-gradient-to-r from-emerald-400 to-emerald-600",
    body: "border-emerald-500/60",
    nub: "bg-emerald-500",
    chip: "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10",
  },
  power_lithium: {
    wordKey: "tierLithium",
    wordFallback: "Lithium",
    fill: "bg-gradient-to-r from-blue-400 to-blue-600",
    body: "border-blue-500",
    nub: "bg-blue-500",
    chip: "border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10",
  },
  power_generator: {
    wordKey: "tierGenerator",
    wordFallback: "Generator",
    fill: "bg-gradient-to-r from-primary to-primary/60",
    body: "border-primary",
    nub: "bg-primary",
    chip: "border-primary/40 bg-primary/5 hover:bg-primary/10",
  },
  power_unlimited: {
    wordKey: "tierUnlimited",
    wordFallback: "Unlimited",
    fill: "bg-gradient-to-r from-amber-400 to-primary",
    body: "border-amber-500",
    nub: "bg-amber-500",
    chip: "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10",
  },
};

const SIZE = {
  sm: { body: "w-20 h-6", text: "text-[9px]", icon: "w-2.5 h-2.5", nub: "w-[3px] h-3.5", gap: "gap-1", round: "rounded-[5px]" },
  md: { body: "w-24 h-7", text: "text-[10px]", icon: "w-3 h-3", nub: "w-[3px] h-4", gap: "gap-1", round: "rounded-[6px]" },
  lg: { body: "w-32 h-9", text: "text-xs", icon: "w-3.5 h-3.5", nub: "w-[3px] h-5", gap: "gap-1.5", round: "rounded-[7px]" },
};

export function getEnergyState(userProfile) {
  const sub = userProfile?.subscription_type || "free";
  let isPremiumPass = false;
  const exp = userProfile?.annual_pass_expires_at;
  if (exp) {
    const d = String(exp).includes("T") ? exp : `${exp}T23:59:59Z`;
    isPremiumPass = new Date(d) > new Date();
  }
  const isUnlimited = sub === "power_unlimited" || isPremiumPass;
  const tokens = userProfile?.ai_tokens ?? 0;
  const pct = isUnlimited ? 100 : Math.min(100, (tokens / 15) * 100);
  const isLow = !isUnlimited && tokens <= 3;
  return { sub, isUnlimited, tokens, pct, isLow };
}

export default function MembershipBattery({ userProfile, size = "md" }) {
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const tr = t(lang, key); return tr !== key ? tr : fallback; }, [lang]);
  const { sub, pct } = getEnergyState(userProfile);
  const tier = TIER[sub] || TIER.free;
  const s = SIZE[size] || SIZE.md;

  return (
    <div className="relative flex items-center">
      <div className={`relative ${s.body} border-2 ${tier.body} ${s.round} overflow-hidden bg-muted/50`}>
        <div className="absolute inset-0 pointer-events-none">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="absolute top-0 bottom-0 border-r border-muted-foreground/20" style={{ left: `${(i / 5) * 100}%` }} />
          ))}
        </div>
        <div className={`absolute top-0 left-0 bottom-0 transition-all ${tier.fill}`} style={{ width: `${pct}%` }} />
        <span className={`absolute inset-0 flex items-center justify-center ${s.gap} text-white font-bold font-heading`} style={{ textShadow: "0 1px 2px rgba(0,0,0,0.55)" }}>
          <Zap className={`${s.icon} fill-white`} />
          <span className={s.text}>{T(tier.wordKey, tier.wordFallback)}</span>
        </span>
      </div>
      <div className={`${s.nub} ${tier.nub} rounded-r-sm ml-[1px]`} />
    </div>
  );
}