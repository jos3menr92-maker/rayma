import { cn } from "@/lib/utils";

const SIZE_CONFIG = {
  sm: { battery: "w-10 h-5", nub: "w-[3px] h-2", text: "text-[10px]" },
  md: { battery: "w-12 h-6", nub: "w-[3px] h-2.5", text: "text-xs" },
  lg: { battery: "w-14 h-7", nub: "w-[3px] h-3", text: "text-sm" },
};

const SEGMENT_COUNT = 5;

export default function BatteryIndicator({ tokens, max, isInf = false, size = "sm", showLabel = true, className }) {
  const pct = isInf ? 100 : Math.max(0, Math.min(100, (tokens / (max || 10)) * 100));
  const fillColor = isInf
    ? "bg-amber-400"
    : pct > 50 ? "bg-emerald-500"
    : pct > 20 ? "bg-yellow-500"
    : "bg-destructive";

  const s = SIZE_CONFIG[size] || SIZE_CONFIG.sm;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="relative flex items-center">
        <div className={cn("relative border-2 border-muted-foreground/40 rounded-sm overflow-hidden", s.battery)}>
          {/* Segment lines — visible on empty portion, covered by fill where charged */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: SEGMENT_COUNT - 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-r border-muted-foreground/30"
                style={{ left: `${((i + 1) / SEGMENT_COUNT) * 100}%` }}
              />
            ))}
          </div>
          {/* Fill bar — sits above segment lines so empty cells stay visible */}
          <div className={cn("absolute top-0 left-0 bottom-0 transition-all", fillColor)} style={{ width: `${pct}%` }} />
        </div>
        {/* Terminal nub */}
        <div className={cn("bg-muted-foreground/40 rounded-r-sm ml-[1px]", s.nub)} />
      </div>
      {showLabel && (
        <span className={cn("font-bold font-mono text-foreground", s.text)}>{isInf ? "∞" : tokens}</span>
      )}
    </div>
  );
}