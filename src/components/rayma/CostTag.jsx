import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

/**
 * Small cost indicator shown under assistant messages.
 * Free messages stay SILENT (no tag) — we only notify when coins are spent.
 */
export default function CostTag({ free, cost = 3 }) {
  const { lang } = useLanguage();
  const T = (k, f) => {
    const r = t(lang, k);
    return r !== k ? r : f;
  };
  if (free) return null;
  const label = T("creditsUsed", "{n} credits used").replace("{n}", cost);
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-600 dark:text-rose-400 mt-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
      {label}
    </span>
  );
}