import { useState, useRef, useEffect } from 'react';
import { X, Lock, Crown } from 'lucide-react';
import { useT } from '@/lib/LanguageContext';

/**
 * PremiumGameLock — shown when a non-Generator user selects a sponsor-only game.
 * Reassures them the arcade is still free; only these 3 bonus games are sponsor perks.
 */
export default function PremiumGameLock({ gameTitle, onUpgrade }) {
  const T = useT();
  return (
    <div className="w-full aspect-video bg-slate-900 rounded-xl border-4 border-primary/40 relative overflow-hidden flex flex-col items-center justify-center p-8 text-center">
      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(135deg,transparent_40%,hsl(var(--primary)/0.3)_100%)]" />
      <Crown className="w-12 h-12 text-primary mb-4 relative z-10" />
      <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 relative z-10">{gameTitle}</h3>
      <div className="bg-primary/15 border border-primary/40 rounded-2xl px-6 py-4 mb-6 relative z-10 max-w-sm">
        <p className="text-sm text-primary font-bold mb-1">{T('sponsorOnlyGame', 'Sponsor-Only Game')}</p>
        <p className="text-xs text-slate-400 leading-relaxed">
          {T('sponsorGameDesc', 'The arcade is free for everyone. These 3 bonus games are our thanks to Generator sponsors.')}
        </p>
      </div>
      <button
        onClick={onUpgrade}
        className="px-8 py-4 bg-primary text-primary-foreground font-black uppercase tracking-widest hover:opacity-90 rounded-xl shadow-[0_0_20px_hsl(var(--primary)/0.4)] relative z-10"
      >
        {T('becomeSponsor', 'Become a Sponsor')}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); window.history.back(); }}
        className="mt-3 text-slate-500 hover:text-slate-300 text-xs font-bold uppercase tracking-wide flex items-center gap-1 relative z-10"
      >
        <X className="w-4 h-4" /> {T('back', 'Back')}
      </button>
      <Lock className="absolute top-4 right-4 w-5 h-5 text-primary/60" />
    </div>
  );
}