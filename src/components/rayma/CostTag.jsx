import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

/**
 * Small cost indicator shown under assistant messages.
 * free=true → green "Free — no credits used"
 * else      → red "{n} credits used"
 */
export default function CostTag({ free, cost = 3 }) {
  const { lang } = useLanguage();
  const T = (k, f) => {
    const r = t(lang, k);
    return r !== k ? r : f;
  };
  if (free) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        {T("freeTag", "Free — no credits used")}
      </span>
    );
  }
  const label = T("creditsUsed", "{n} credits used").replace("{n}", cost);
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-600 dark:text-rose-400 mt-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
      {label}
    </span>
  );
}