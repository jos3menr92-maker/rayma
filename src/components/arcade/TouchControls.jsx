import React from "react";

/**
 * TouchControls — on-screen D-pad + Action button overlay for arcade games.
 *
 * Props:
 *   onDirection(direction) — called with 'up' | 'down' | 'left' | 'right'
 *   onDirectionRelease(direction) — called when button released (for games needing keyup)
 *   onAction() — called when the Action button is tapped
 *   onActionRelease() — called when the Action button is released
 *   actionLabel — optional label text inside the action button
 *   showUpDown — whether up/down buttons render (false = left/right only)
 *
 * HIT-TARGET DESIGN: each control's visible glyph is small, but the actual
 * tappable element is a large invisible pad (72px dpad / 96px action) that
 * wraps it — near-miss taps still register, which is the #1 complaint in
 * landscape mode. Buttons use POINTER EVENTS (not touch events) so they work
 * on every device, and pointer capture keeps the release event on the button
 * even when a finger slides off it (fixes the "stuck moving" bug).
 */
export default function TouchControls({
  onDirection,
  onDirectionRelease,
  onAction,
  onActionRelease,
  actionLabel = "FIRE",
  showUpDown = false,
}) {
  // Invisible pad = the real touch target; the visible glyph lives inside it.
  // 72px pads (up from 64) — near-miss taps register more reliably without
  // risking overlap between grid cells or overflow on narrow screens.
  const pad =
    "w-[72px] h-[72px] flex items-center justify-center active:scale-95 transition-transform select-none touch-none";
  // Visible button face — small, floating inside the bigger hit pad.
  const face =
    "w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border-2 border-white/20 text-white transition-colors";

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
    <div className="absolute bottom-0 left-0 right-0 z-[55] p-4 pb-10 flex items-end justify-between pointer-events-none">
      {/* D-Pad — wide gaps keep the big hit pads from overlapping each other */}
      <div className={`grid ${showUpDown ? "grid-cols-3 grid-rows-3" : "grid-cols-3"} gap-1 pointer-events-auto`}>
        {showUpDown && (
          <button
            className={`${pad} group col-start-2 row-start-1`}
            onPointerDown={(e) => handleDirStart(e, "up")}
            onPointerUp={(e) => handleDirEnd(e, "up")}
            onPointerCancel={(e) => handleDirEnd(e, "up")}
            aria-label="Up"
          >
            <span className={`${face} group-active:bg-primary/60 group-active:border-primary/60`}>
              <ChevronUp className="w-5 h-5" />
            </span>
          </button>
        )}
        <button
          className={`${pad} group ${showUpDown ? "col-start-1 row-start-2" : ""}`}
          onPointerDown={(e) => handleDirStart(e, "left")}
          onPointerUp={(e) => handleDirEnd(e, "left")}
          onPointerCancel={(e) => handleDirEnd(e, "left")}
          aria-label="Left"
        >
          <span className={`${face} group-active:bg-primary/60 group-active:border-primary/60`}>
            <ChevronLeft className="w-5 h-5" />
          </span>
        </button>
        {showUpDown && <div className="col-start-2 row-start-2" />}
        <button
          className={`${pad} group ${showUpDown ? "col-start-3 row-start-2" : ""}`}
          onPointerDown={(e) => handleDirStart(e, "right")}
          onPointerUp={(e) => handleDirEnd(e, "right")}
          onPointerCancel={(e) => handleDirEnd(e, "right")}
          aria-label="Right"
        >
          <span className={`${face} group-active:bg-primary/60 group-active:border-primary/60`}>
            <ChevronRight className="w-5 h-5" />
          </span>
        </button>
        {showUpDown && (
          <button
            className={`${pad} group col-start-2 row-start-3`}
            onPointerDown={(e) => handleDirStart(e, "down")}
            onPointerUp={(e) => handleDirEnd(e, "down")}
            onPointerCancel={(e) => handleDirEnd(e, "down")}
            aria-label="Down"
          >
            <span className={`${face} group-active:bg-primary/60 group-active:border-primary/60`}>
              <ChevronDown className="w-5 h-5" />
            </span>
          </button>
        )}
      </div>

      {/* Action Button — small visible face, 96px invisible hit pad */}
      {onAction && (
        <button
          className="group pointer-events-auto w-24 h-24 flex items-center justify-center active:scale-95 transition-transform select-none touch-none"
          onPointerDown={(e) => {
            e.preventDefault();
            try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) { /* older WebViews */ }
            onAction();
          }}
          onPointerUp={(e) => { e.preventDefault(); onActionRelease?.(); }}
          onPointerCancel={() => onActionRelease?.()}
          aria-label={actionLabel}
        >
          <span className="w-12 h-12 flex items-center justify-center rounded-full bg-primary/80 backdrop-blur-sm border-2 border-primary text-primary-foreground font-black text-[10px] tracking-widest shadow-lg shadow-primary/40 transition-colors group-active:bg-primary group-active:scale-90">
            {actionLabel}
          </span>
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