import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { CHIPS } from "@/lib/raymaClassifier";

/**
 * Horizontally scrollable quick-reply chips.
 * Green dot = free (no AI). Red dot = uses AI (credits).
 */
export default function QuickReplyChips({ onChip }) {
  const { lang } = useLanguage();
  const T = (key, fb) => {
    const r = t(lang, key);
    return r !== key ? r : fb;
  };
  return (
    <div className="shrink-0 px-3 pt-2 pb-1 overflow-x-auto scrollbar-hide">
      <div className="flex gap-1.5 w-max">
        {CHIPS.map((chip) => (
          <button
            key={chip.id}
            onClick={() => onChip?.(chip)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
              chip.tier === "free"
                ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                : "border-rose-500/40 bg-rose-500/5 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${chip.tier === "free" ? "bg-emerald-500" : "bg-rose-500"}`} />
            {T(chip.labelKey, chip.fallback)}
          </button>
        ))}
      </div>
    </div>
  );
}