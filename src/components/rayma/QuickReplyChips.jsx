import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { CHIPS } from "@/lib/raymaClassifier";

/**
 * Quick-reply chips in TWO horizontally-scrollable rows (6 chips each).
 * Green dot = free (no AI). Red dot = uses AI (credits).
 */
export default function QuickReplyChips({ onChip }) {
  const { lang } = useLanguage();
  const T = (key, fb) => {
    const r = t(lang, key);
    return r !== key ? r : fb;
  };
  const row1 = CHIPS.slice(0, 6);
  const row2 = CHIPS.slice(6);
  const renderRow = (row) => (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide w-max">
      {row.map((chip) => (
        <button
          key={chip.id}
          onClick={() => onChip?.(chip)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors shrink-0 ${
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
  );
  return (
    <div className="shrink-0 px-3 pt-2 pb-1 space-y-1">
      {renderRow(row1)}
      {renderRow(row2)}
    </div>
  );
}