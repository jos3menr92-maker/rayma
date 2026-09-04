import { RANGES } from "@/utils/trendMath";

export default function RangeSelector({ value, onChange, T }) {
  return (
    <div className="flex gap-1.5">
      {RANGES.map((r) => {
        const active = value === r.key;
        return (
          <button
            key={r.key}
            onClick={() => onChange(r.key)}
            aria-pressed={active}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border"
            }`}
          >
            {T(r.labelKey, r.fallback)}
          </button>
        );
      })}
    </div>
  );
}