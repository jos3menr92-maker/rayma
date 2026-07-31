import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import BatteryIndicator from "@/components/BatteryIndicator";

/**
 * Global, always-visible AI energy battery for the app's top bar.
 * Shows the SAME balance the Rayma AI chat gates on (ai_tokens), so what the
 * user sees always matches what the chat will allow. Tapping it opens the Store.
 */
export default function GlobalBatteryBar() {
  const { userProfile } = useFinancialData();
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const tr = t(lang, key); return tr !== key ? tr : fallback; }, [lang]);

  const isPremium = useMemo(() => {
    const exp = userProfile?.annual_pass_expires_at;
    if (!exp) return false;
    const d = String(exp).includes("T") ? exp : `${exp}T23:59:59Z`;
    return new Date(d) > new Date();
  }, [userProfile?.annual_pass_expires_at]);

  const tokens = userProfile?.ai_tokens ?? 0;
  const max = userProfile?.ai_tokens_daily_limit || 10;
  const isLow = !isPremium && tokens <= 2;

  return (
    <Link
      to="/store"
      aria-label={T("aiEnergy", "AI Energy")}
      title={T("aiEnergy", "AI Energy")}
      className={`flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-full border transition-colors ${
        isLow ? "border-destructive/40 bg-destructive/10 animate-pulse" : "border-border bg-muted/30 hover:bg-muted/60"
      }`}
    >
      <BatteryIndicator tokens={tokens} max={max} isInf={isPremium} size="xl" showLabel={false} />
      <span className={`text-[11px] font-bold font-mono leading-none ${isPremium ? "text-amber-400" : isLow ? "text-destructive" : "text-foreground"}`}>
        {isPremium ? "∞" : tokens}
      </span>
    </Link>
  );
}