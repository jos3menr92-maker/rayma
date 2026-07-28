import { Pause, Play, RotateCcw } from 'lucide-react';

/**
 * GameTopBar — shared HUD overlay for arcade games.
 * Renders score, a labeled pause/resume button, and a landscape-rotate toggle.
 *
 * Props:
 *   score          — current score (number)
 *   bestScore      — best score (number)
 *   accentColor    — tailwind text color class for the score (e.g. 'text-cyan-400')
 *   isPaused       — whether the game is currently paused
 *   onTogglePause  — callback to toggle pause state
 *   onToggleRotate — callback to toggle landscape rotation
 *   isRotated      — whether the game is currently in landscape mode
 */
export default function GameTopBar({ score, bestScore, accentColor, isPaused, onTogglePause, onToggleRotate, isRotated }) {
  return (
    <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 flex justify-between items-start z-50 gap-2">
      <div className="bg-black/70 backdrop-blur-sm border border-slate-800 font-mono text-lg sm:text-xl font-black px-4 sm:px-6 py-2 sm:py-3 rounded-2xl flex items-center gap-3 sm:gap-4">
        <span className={accentColor}>{(score || 0).toString().padStart(4, '0')}</span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400 text-sm">BEST: {bestScore}</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onTogglePause}
          className="bg-black/70 backdrop-blur-sm border border-slate-800 text-white px-4 sm:px-5 py-3 sm:py-4 rounded-2xl hover:bg-slate-800 flex items-center gap-2 font-bold text-xs sm:text-sm uppercase tracking-wide"
          aria-label={isPaused ? 'Resume game' : 'Pause game'}
        >
          {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
        </button>
        <button
          onClick={onToggleRotate}
          className={`px-4 sm:px-5 py-3 sm:py-4 rounded-2xl border flex items-center gap-2 font-bold text-xs sm:text-sm uppercase tracking-wide transition-colors ${
            isRotated
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-black/70 backdrop-blur-sm border-slate-800 text-white hover:bg-slate-800'
          }`}
          aria-label="Toggle landscape mode"
        >
          <RotateCcw className="w-5 h-5" />
          <span className="hidden sm:inline">{isRotated ? 'Exit' : 'Rotate'}</span>
        </button>
      </div>
    </div>
  );
}