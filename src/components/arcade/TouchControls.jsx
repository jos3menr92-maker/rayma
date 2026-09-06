import React from "react";

/**
 * TouchControls — on-screen D-pad + Action button overlay for arcade games.
 *
 * Props:
 *   onDirection(direction) — called with 'up' | 'down' | 'left' | 'right'
 *   onDirectionRelease(direction) — called when button released (for games needing keyup)
 *   onAction() — called when the Action button is tapped
 *   actionLabel — optional label text inside the action button
 *   showUpDown — whether up/down buttons render (false = left/right only)
 *
 * Buttons use POINTER EVENTS (not touch events) so they work on every
 * device — phone, tablet, and desktop preview alike. Pointer capture keeps
 * the release event on the button even when a finger slides off it, which
 * fixes the classic "stuck moving" mobile bug.
 */
export default function TouchControls({
  onDirection,
  onDirectionRelease,
  onAction,
  onActionRelease,
  actionLabel = "FIRE",
  showUpDown = false,
}) {
  // The ::before pseudo-element silently extends the tappable area ~8px past
  // the visual edge, so near-miss taps still register instead of "failing".
  const dirBtn =
    "relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border-2 border-white/20 text-white active:bg-primary/60 active:scale-95 transition-all select-none touch-none before:content-[''] before:absolute before:-inset-2";

  const handleDirStart = (e, dir) => {
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) { /* older WebViews */ }
    onDirection?.(dir);
  };
  const handleDirEnd = (e, dir) => {
    e.preventDefault();
    onDirectionRelease?.(dir);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[55] p-4 pb-8 flex items-end justify-between pointer-events-none">
      {/* D-Pad */}
      <div className={`grid ${showUpDown ? "grid-cols-3 grid-rows-3" : "grid-cols-3"} gap-2 pointer-events-auto`}>
        {showUpDown && (
          <button
            className={`${dirBtn} col-start-2 row-start-1`}
            onPointerDown={(e) => handleDirStart(e, "up")}
            onPointerUp={(e) => handleDirEnd(e, "up")}
            onPointerCancel={(e) => handleDirEnd(e, "up")}
            aria-label="Up"
          >
            <ChevronUp className="w-7 h-7" />
          </button>
        )}
        <button
          className={`${dirBtn} ${showUpDown ? "col-start-1 row-start-2" : ""}`}
          onPointerDown={(e) => handleDirStart(e, "left")}
          onPointerUp={(e) => handleDirEnd(e, "left")}
          onPointerCancel={(e) => handleDirEnd(e, "left")}
          aria-label="Left"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
        {showUpDown && <div className={showUpDown ? "col-start-2 row-start-2" : ""} />}
        <button
          className={`${dirBtn} ${showUpDown ? "col-start-3 row-start-2" : ""}`}
          onPointerDown={(e) => handleDirStart(e, "right")}
          onPointerUp={(e) => handleDirEnd(e, "right")}
          onPointerCancel={(e) => handleDirEnd(e, "right")}
          aria-label="Right"
        >
          <ChevronRight className="w-7 h-7" />
        </button>
        {showUpDown && (
          <button
            className={`${dirBtn} col-start-2 row-start-3`}
            onPointerDown={(e) => handleDirStart(e, "down")}
            onPointerUp={(e) => handleDirEnd(e, "down")}
            onPointerCancel={(e) => handleDirEnd(e, "down")}
            aria-label="Down"
          >
            <ChevronDown className="w-7 h-7" />
          </button>
        )}
      </div>

      {/* Action Button */}
      {onAction && (
        <button
          className="relative pointer-events-auto w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center rounded-full bg-primary/80 backdrop-blur-sm border-2 border-primary text-primary-foreground font-black text-xs tracking-widest active:scale-90 transition-all select-none touch-none shadow-lg shadow-primary/40 before:content-[''] before:absolute before:-inset-2 before:rounded-full"
          onPointerDown={(e) => {
            e.preventDefault();
            try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) { /* older WebViews */ }
            onAction();
          }}
          onPointerUp={(e) => { e.preventDefault(); onActionRelease?.(); }}
          onPointerCancel={() => onActionRelease?.()}
          aria-label={actionLabel}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function ChevronUp({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
  );
}
function ChevronDown({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
  );
}
function ChevronLeft({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
  );
}
function ChevronRight({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
  );
}