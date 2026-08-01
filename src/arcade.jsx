import React, { useState, Suspense, lazy, useEffect } from 'react';
import { Crown, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFinancialData } from '@/lib/FinancialDataContext';
import { getAllHighScores } from '@/api/arcadeGamesApi';
import { useT } from '@/lib/LanguageContext';

const RetroSnake = lazy(() => import('./RetroSnake'));
const SpaceInvaders = lazy(() => import('./SpaceInvaders'));
const SkyStriker = lazy(() => import('./SkyStriker'));
const NeonDrift = lazy(() => import('./NeonDrift'));
const CrystalCrusher = lazy(() => import('./CrystalCrusher'));
const MeteorStorm = lazy(() => import('./MeteorStorm'));
const PremiumGameLock = lazy(() => import('@/components/arcade/PremiumGameLock'));

const GAMES_REGISTRY = {
  space_invaders: {
    id: 'space_invaders',
    title: 'Space Invaders',
    description: 'Defend your portfolio from descending aliens!',
    accentColor: 'text-purple-500'
  },
  retro_snake: {
    id: 'retro_snake',
    title: 'Retro Snake',
    description: 'Eat the profits, grow the snake. Don\'t crash!',
    accentColor: 'text-lime-500'
  },
  sky_striker: {
    id: 'sky_striker',
    title: 'Sky Striker',
    description: 'Take to the skies! Dogfight through market volatility.',
    accentColor: 'text-cyan-400'
  },
  neon_drift: {
    id: 'neon_drift',
    title: 'Neon Drift',
    description: 'Synthwave highway. Dodge, collect, survive.',
    accentColor: 'text-cyan-400',
    premium: true,
  },
  crystal_crusher: {
    id: 'crystal_crusher',
    title: 'Crystal Crusher',
    description: 'Shatter every crystal. Power-ups await.',
    accentColor: 'text-pink-400',
    premium: true,
  },
  meteor_storm: {
    id: 'meteor_storm',
    title: 'Meteor Storm',
    description: 'Blast the meteors before they hit you.',
    accentColor: 'text-pink-400',
    premium: true,
  }
};

const PlaceholderGame = ({ title, description }) => (
  <div className="w-full aspect-video bg-slate-900 rounded-xl border-4 border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-8">
    <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">{title}</h3>
    <div className="text-slate-400 font-mono mb-8 text-center max-w-md h-12">{description}</div>
    <div className="px-8 py-4 bg-slate-800 text-slate-500 font-black uppercase tracking-widest border border-slate-700">Module Loading...</div>
  </div>
);

const LoadingScreen = () => (
  <div className="w-full aspect-video bg-slate-900 rounded-xl border-4 border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-8">
    <div className="w-12 h-12 border-4 border-slate-700 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
    <div className="text-cyan-500 font-mono font-bold tracking-widest animate-pulse">DOWNLOADING GAME DATA...</div>
  </div>
);

const Arcade = () => {
  const T = useT();
  const navigate = useNavigate();
  const { userProfile, reload } = useFinancialData();
  const [activeGame, setActiveGame] = useState('space_invaders');

  // Track high scores
  const [highScores, setHighScores] = useState({
    space_invaders: 0,
    retro_snake: 0,
    sky_striker: 0
  });

  // ✨ NEW: Fetch actual high scores from the database when the Arcade loads!
  useEffect(() => {
    const fetchScores = async () => {
      const dbScores = await getAllHighScores();
      if (dbScores && Object.keys(dbScores).length > 0) {
        setHighScores(prev => ({ ...prev, ...dbScores }));
      }
    };
    fetchScores();
  }, []);

  const handleUpdateScore = (gameId, newScore) => {
    if (newScore > (highScores[gameId] || 0)) {
      setHighScores(prev => ({ ...prev, [gameId]: newScore }));
    }
  };

  const hasGameAccess = userProfile?.subscription_tier === 'power_generator'
    || userProfile?.subscription_tier === 'power_unlimited'
    || userProfile?.subscription_type === 'power_generator'
    || userProfile?.subscription_type === 'power_unlimited'
    || (userProfile?.game_access_expires_at && new Date(userProfile.game_access_expires_at) > new Date());

  const renderActiveGame = () => {
    const game = GAMES_REGISTRY[activeGame];
    if (game?.premium && !hasGameAccess) {
      return <PremiumGameLock gameTitle={game.title} />;
    }
    switch(activeGame) {
      case 'retro_snake': return <RetroSnake onUpdateScore={handleUpdateScore} onRewardEarned={reload} />;
      case 'space_invaders': return <SpaceInvaders onUpdateScore={handleUpdateScore} onRewardEarned={reload} />;
      case 'sky_striker': return <SkyStriker onUpdateScore={handleUpdateScore} onRewardEarned={reload} />;
      case 'neon_drift': return <NeonDrift onUpdateScore={handleUpdateScore} onRewardEarned={reload} />;
      case 'crystal_crusher': return <CrystalCrusher onUpdateScore={handleUpdateScore} onRewardEarned={reload} />;
      case 'meteor_storm': return <MeteorStorm onUpdateScore={handleUpdateScore} onRewardEarned={reload} />;
      default: return <PlaceholderGame title="Unknown Terminal" description="Signal lost." />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-8 font-sans selection:bg-cyan-500/30">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors mb-4 max-w-7xl mx-auto">
        <ChevronLeft className="w-4 h-4" /> {T('back', 'Back')}
      </button>
      <header className="max-w-7xl mx-auto mb-12 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest text-purple-500">System Online</span>
          </div>
          <h1 className="text-6xl font-black italic uppercase tracking-tighter leading-none">
            Rayma AI <span className="text-purple-500">Arcade</span>
          </h1>
        </div>
        <div className="text-right hidden md:block">
          <div className="text-xs font-bold text-slate-500 uppercase mb-1">Player</div>
          <div className="text-3xl font-mono font-bold text-white">{userProfile?.preferred_name || 'Guest'}</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        <nav className="lg:col-span-1 space-y-4">
          <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 px-4">{T('freeGames', 'Free Games')}</div>
          {Object.values(GAMES_REGISTRY).filter(g => !g.premium).map((game, idx) => {
            const borderActive = {
              'text-purple-500': 'border-purple-500',
              'text-lime-500': 'border-lime-500',
              'text-cyan-400': 'border-cyan-400',
            }[game.accentColor] || 'border-slate-600';
            return (
              <button
                key={game.id}
                onClick={() => setActiveGame(game.id)}
                className={`w-full group relative p-4 transition-all duration-300 border-l-4 text-left ${
                  activeGame === game.id ? `bg-slate-900 ${borderActive}` : 'bg-transparent border-slate-800 hover:bg-slate-900/50 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col items-start">
                  <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${activeGame === game.id ? game.accentColor : 'text-slate-500'}`}>
                    Terminal {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className={`text-lg font-black uppercase tracking-tight ${activeGame === game.id ? 'text-white' : 'text-slate-400'}`}>
                    {game.title}
                  </span>
                </div>
              </button>
            );
          })}
          <div className="text-xs font-black text-primary/70 uppercase tracking-widest mb-4 px-4 pt-4 flex items-center gap-1.5">
            <Crown className="w-3 h-3" /> {T('sponsorGames', 'Sponsor Games')}
          </div>
          {Object.values(GAMES_REGISTRY).filter(g => g.premium).map((game, idx) => {
            const borderActive = {
              'text-cyan-400': 'border-cyan-400',
              'text-pink-400': 'border-pink-400',
            }[game.accentColor] || 'border-primary';
            return (
              <button
                key={game.id}
                onClick={() => setActiveGame(game.id)}
                className={`w-full group relative p-4 transition-all duration-300 border-l-4 text-left ${
                  activeGame === game.id ? `bg-slate-900 ${borderActive}` : 'bg-transparent border-slate-800 hover:bg-slate-900/50 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col items-start">
                  <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1 ${activeGame === game.id ? game.accentColor : 'text-slate-500'}`}>
                    Terminal {String(idx + 4).padStart(2, '0')}
                    <Crown className="w-2.5 h-2.5" />
                  </span>
                  <span className={`text-lg font-black uppercase tracking-tight ${activeGame === game.id ? 'text-white' : 'text-slate-400'}`}>
                    {game.title}
                  </span>
                  {!hasGameAccess && (
                    <span className="text-[9px] font-bold text-primary/60 uppercase tracking-widest mt-0.5">{T('locked', 'Locked')}</span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        <section className="lg:col-span-2">
          <Suspense fallback={<LoadingScreen />}>
            {renderActiveGame()}
          </Suspense>
        </section>

        <aside className="space-y-8">
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 relative overflow-hidden">
            <h2 className="text-xl font-black italic mb-6">TOP SCORES</h2>
            <div className="space-y-4">
              {Object.values(GAMES_REGISTRY).map((game) => (
                <div key={game.id} className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">{game.title}</span>
                  <span className={`font-mono text-lg font-bold ${game.accentColor.replace('text-', 'text-').replace('500', '400')}`}>
                    {(highScores[game.id] || 0).toString().padStart(4, '0')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default Arcade;