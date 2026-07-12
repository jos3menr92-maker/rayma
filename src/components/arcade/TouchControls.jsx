import React from "react";

/**
 * TouchControls — on-screen D-pad + Action button overlay for mobile arcade games.
 *
 * Props:
 *   onDirection(direction) — called with 'up' | 'down' | 'left' | 'right'
 *   onDirectionRelease(direction) — called when button released (for games needing keyup)
 *   onAction() — called when the Action button is tapped
 *   actionLabel — optional label text inside the action button
 *   showUpDown — whether up/down buttons render (false = left/right only)
 *
 * All buttons use onTouchStart/onTouchEnd with preventDefault to avoid
 * synthetic mouse events and ghost clicks on mobile.
 */
export default function TouchControls({
  onDirection,
  onDirectionRelease,
  onAction,
  actionLabel = "FIRE",
  showUpDown = false,
}) {
  const dirBtn =
    "w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border-2 border-white/20 text-white active:bg-primary/60 active:scale-95 transition-all select-none touch-none";

  const handleDirStart = (e, dir) => {
    e.preventDefault();
    onDirection?.(dir);
  };
  const handleDirEnd = (e, dir) => {
    e.preventDefault();
    onDirectionRelease?.(dir);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[55] p-4 pb-8 flex items-end justify-between pointer-events-none">
      {/* D-Pad */}
      <div className={`grid ${showUpDown ? "grid-cols-3 grid-rows-3" : "grid-cols-3"} gap-1 pointer-events-auto`}>
        {showUpDown && (
          <button
            className={`${dirBtn} col-start-2 row-start-1`}
            onTouchStart={(e) => handleDirStart(e, "up")}
            onTouchEnd={(e) => handleDirEnd(e, "up")}
            aria-label="Up"
          >
            <ChevronUp className="w-7 h-7" />
          </button>
        )}
        <button
          className={`${dirBtn} ${showUpDown ? "col-start-1 row-start-2" : ""}`}
          onTouchStart={(e) => handleDirStart(e, "left")}
          onTouchEnd={(e) => handleDirEnd(e, "left")}
          aria-label="Left"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
        {showUpDown && <div className={showUpDown ? "col-start-2 row-start-2" : ""} />}
        <button
          className={`${dirBtn} ${showUpDown ? "col-start-3 row-start-2" : ""}`}
          onTouchStart={(e) => handleDirStart(e, "right")}
          onTouchEnd={(e) => handleDirEnd(e, "right")}
          aria-label="Right"
        >
          <ChevronRight className="w-7 h-7" />
        </button>
        {showUpDown && (
          <button
            className={`${dirBtn} col-start-2 row-start-3`}
            onTouchStart={(e) => handleDirStart(e, "down")}
            onTouchEnd={(e) => handleDirEnd(e, "down")}
            aria-label="Down"
          >
            <ChevronDown className="w-7 h-7" />
          </button>
        )}
      </div>

      {/* Action Button */}
      {onAction && (
        <button
          className="pointer-events-auto w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center rounded-full bg-primary/80 backdrop-blur-sm border-2 border-primary text-primary-foreground font-black text-xs tracking-widest active:scale-90 transition-all select-none touch-none shadow-lg shadow-primary/40"
          onTouchStart={(e) => { e.preventDefault(); onAction(); }}
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