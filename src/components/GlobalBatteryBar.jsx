import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import MembershipBattery, { getEnergyState, TIER } from "@/components/MembershipBattery";

/**
 * Global, always-visible AI energy battery for the app's top bar.
 * Wraps the shared MembershipBattery in a Store link, with a low-energy pulse.
 */
export default function GlobalBatteryBar() {
  const { userProfile } = useFinancialData();
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const tr = t(lang, key); return tr !== key ? tr : fallback; }, [lang]);
  const { sub, isLow } = getEnergyState(userProfile);
  const tier = TIER[sub] || TIER.free;

  return (
    <Link
      to="/store"
      aria-label={T("aiEnergy", "AI Energy")}
      title={T("aiEnergy", "AI Energy")}
      className={`flex items-center pl-2 pr-2.5 py-1.5 rounded-full border transition-colors ${tier.chip} ${isLow ? "animate-pulse" : ""}`}
    >
      <MembershipBattery userProfile={userProfile} size="md" />
    </Link>
  );
}