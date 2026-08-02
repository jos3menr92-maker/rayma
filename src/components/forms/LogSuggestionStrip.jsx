import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

/**
 * Smart-keyboard preview strip: shows derived facts (lines) and tappable
 * suggestion chips that paste a value back into the parent form.
 *
 * Pure presentational — all math comes from `preview` computed by
 * src/utils/logPreviewMath.js. No AI, no API, no coins.
 */
export default function LogSuggestionStrip({ preview, onAccept }) {
  if (!preview) return null;
  const { lines = [], chips = [] } = preview;
  if (lines.length === 0 && chips.length === 0) return null;

  const toneClass = (tone) =>
    tone === "primary"
      ? "text-primary"
      : tone === "destructive"
        ? "text-destructive"
        : "text-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/20 bg-primary/5 p-3 space-y-2"
    >
      {lines.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {lines.map((line, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">{line.label}</span>
              <span className={`font-semibold ${toneClass(line.tone)}`}>{line.value}</span>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((chip, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onAccept?.(chip.field, chip.value)}
                className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-card px-2.5 py-1 text-[11px] font-semibold text-primary active:scale-95 transition-transform"
              >
                <Sparkles className="w-3 h-3" />
                {chip.label}
              </button>
            ))}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}