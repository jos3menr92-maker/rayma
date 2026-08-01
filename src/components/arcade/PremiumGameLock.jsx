import { X, Lock } from 'lucide-react';
import { useT } from '@/lib/LanguageContext';

/**
 * PremiumGameLock — faded, locked preview shown when a non-sponsor user
 * selects a sponsor-only game. No payment redirect (checkout doesn't work
 * inside the unpublished mobile app yet) — just a dimmed preview with a
 * "Buy Membership to Access" message.
 */
export default function PremiumGameLock({ gameTitle }) {
  const T = useT();
  return (
    <div className="w-full aspect-video bg-slate-900 rounded-xl border-4 border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-8 text-center select-none">
      {/* Faded game-preview backdrop */}
      <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_50%_40%,hsl(var(--primary)/0.35),transparent_70%)]" />
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[3px]" />
      <h3 className="absolute inset-0 flex items-center justify-center text-5xl sm:text-7xl font-black text-slate-700/40 uppercase tracking-tighter pointer-events-none">{gameTitle}</h3>

      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Lock className="w-7 h-7 text-primary/80" />
        </div>
        <p className="text-lg sm:text-xl font-black text-white uppercase tracking-widest">{T('buyMembershipToAccess', 'Buy Membership to Access')}</p>
        <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
          {T('sponsorGameDesc', 'The arcade is free for everyone. These 3 bonus games are our thanks to Generator sponsors.')}
        </p>
      </div>

      <button
        onClick={() => window.history.back()}
        className="mt-6 text-slate-500 hover:text-slate-300 text-xs font-bold uppercase tracking-wide flex items-center gap-1 relative z-10"
      >
        <X className="w-4 h-4" /> {T('back', 'Back')}
      </button>
    </div>
  );
}