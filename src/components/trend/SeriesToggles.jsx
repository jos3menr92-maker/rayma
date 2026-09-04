import { SERIES } from "@/utils/trendMath";

export default function SeriesToggles({ active, onToggle, T }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SERIES.map((s) => {
        const isActive = active.has(s.key);
        return (
          <button
            key={s.key}
            onClick={() => onToggle(s.key)}
            aria-pressed={isActive}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              isActive
                ? "bg-card text-foreground border-border shadow-sm"
                : "bg-card/50 text-muted-foreground border-border/50 opacity-60"
            }`}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            {T(s.labelKey, s.fallback)}
          </button>
        );
      })}
    </div>
  );
}