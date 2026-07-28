import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useNavigate } from 'react-router-dom';
import { Coins, Store, X } from 'lucide-react';

const GOLD_COLORS = ['#FFD700', '#FFA500', '#FBBF24', '#F59E0B', '#FFE066'];

export default function ArcadeRewardCelebration({ amount, onDismiss }) {
  const navigate = useNavigate();

  useEffect(() => {
    // Initial center burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: GOLD_COLORS,
    });

    // Side bursts
    const t1 = setTimeout(() => confetti({
      particleCount: 50, angle: 60, spread: 55, origin: { x: 0 }, colors: GOLD_COLORS,
    }), 200);
    const t2 = setTimeout(() => confetti({
      particleCount: 50, angle: 120, spread: 55, origin: { x: 1 }, colors: GOLD_COLORS,
    }), 400);

    // Golden rain for 3 seconds
    const end = Date.now() + 3000;
    const frame = () => {
      confetti({
        particleCount: 2,
        startVelocity: 0,
        ticks: 120,
        origin: { x: Math.random(), y: 0 },
        colors: GOLD_COLORS,
        shapes: ['circle'],
        scalar: 0.8,
        gravity: 0.6,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="absolute inset-0 z-[80] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center px-6 pointer-events-auto">
      <button onClick={onDismiss} className="absolute top-4 right-4 text-white/60 hover:text-white" aria-label="Dismiss">
        <X className="w-6 h-6" />
      </button>

      <div className="text-6xl mb-3 animate-bounce">🏆</div>
      <h2 className="text-4xl font-black text-amber-400 uppercase tracking-tight mb-2">You Win!</h2>
      <div className="flex items-center gap-2 text-amber-300 mb-1">
        <Coins className="w-7 h-7" />
        <span className="text-3xl font-black">+{amount} Energy Bars</span>
      </div>
      <p className="text-slate-400 text-sm mb-8">Added to your Rayma AI account</p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => navigate('/store')}
          className="px-8 py-4 bg-amber-500 text-black font-black uppercase tracking-widest rounded-xl hover:bg-amber-400 flex items-center justify-center gap-2 shadow-lg"
        >
          <Store className="w-5 h-5" /> Visit Store
        </button>
        <button
          onClick={onDismiss}
          className="px-8 py-3 bg-slate-800 text-white font-bold uppercase tracking-widest rounded-xl border border-slate-700 hover:bg-slate-700"
        >
          Continue Playing
        </button>
      </div>
    </div>
  );
}