import React, { useState, Suspense, lazy, useEffect } from 'react';
import { Crown, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFinancialData } from '@/lib/FinancialDataContext';
import { getAllHighScores } from '@/api/arcadeGamesApi';
import { useT } from '@/lib/LanguageContext';

const RetroSnake = lazy(() => import('./RetroSnake'));
const SpaceInvaders = lazy(() => import('./SpaceInvaders'));
const SkyStriker = lazy(() => import('./SkyStriker'));
const LunarLander = lazy(() => import('./LunarLander'));
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
  lunar_lander: {
    id: 'lunar_lander',
    title: 'Lunar Lander',
    description: 'Thrust, descend, stick the landing. Every pad is smaller.',
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
  <div className="w-full aspect-video bg-card rounded-2xl border relative overflow-hidden flex flex-col items-center justify-center p-8">
    <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin mb-4"></div>
    <div className="text-primary font-bold tracking-widest animate-pulse">DOWNLOADING GAME DATA...</div>
  </div>
);

const Arcade = () => {
  const T = useT();
  const navigate = useNavigate();
  const { userProfile, reload } = useFinancialData();
  const [activeGame, setActiveGame] = useState(null);
  // ▶ Start-button launcher: which game was launched from its tile (auto-launch into play)
  const [pendingAutoStart, setPendingAutoStart] = useState(null);
  // Last score per game — shown on each game tile, persisted locally
  const [lastScores, setLastScores] = useState({});

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

  // Restore last scores from previous sessions
  useEffect(() => {
    try {
      setLastScores(JSON.parse(localStorage.getItem('arcadeLastScores') || '{}'));
    } catch (_) { /* corrupted cache — ignore */ }
  }, []);

  const handleUpdateScore = (gameId, newScore) => {
    if (newScore > (highScores[gameId] || 0)) {
      setHighScores(prev => ({ ...prev, [gameId]: newScore }));
    }
    setLastScores(prev => {
      const next = { ...prev, [gameId]: newScore };
      try { localStorage.setItem('arcadeLastScores', JSON.stringify(next)); } catch (_) { /* storage full — ignore */ }
      return next;
    });
  };

  // ⚠️ TEMPORARY TEST MODE — bypasses the sponsor-game lock so all games can be
  // tested. Set to false (or delete) to restore the PremiumGameLock gating.
  const TEMP_UNLOCK_SPONSOR_GAMES = true;

  const hasGameAccess = TEMP_UNLOCK_SPONSOR_GAMES
    || userProfile?.subscription_tier === 'power_generator'
    || userProfile?.subscription_tier === 'power_unlimited'
    || userProfile?.subscription_type === 'power_generator'
    || userProfile?.subscription_type === 'power_unlimited'
    || (userProfile?.game_access_expires_at && new Date(userProfile.game_access_expires_at) > new Date());

  const renderActiveGame = () => {
    if (!activeGame) {
      return (
        <div className="w-full aspect-video bg-card rounded-2xl border relative overflow-hidden flex flex-col items-center justify-center p-8 text-center">
          <h3 className="text-2xl font-heading font-bold text-foreground tracking-tight mb-2">{T('arcadeSelectGame', 'Select a Game')}</h3>
          <p className="text-muted-foreground text-center max-w-md">{T('arcadeSelectPrompt', 'Choose a terminal from the left to start playing.')}</p>
        </div>
      );
    }
    const game = GAMES_REGISTRY[activeGame];
    if (game?.premium && !hasGameAccess) {
      return <PremiumGameLock gameTitle={game.title} />;
    }
    switch(activeGame) {
      case 'retro_snake': return <RetroSnake autoStart={pendingAutoStart === 'retro_snake'} onUpdateScore={handleUpdateScore} onRewardEarned={reload} />;
      case 'space_invaders': return <SpaceInvaders autoStart={pendingAutoStart === 'space_invaders'} onUpdateScore={handleUpdateScore} onRewardEarned={reload} />;
      case 'sky_striker': return <SkyStriker autoStart={pendingAutoStart === 'sky_striker'} onUpdateScore={handleUpdateScore} onRewardEarned={reload} />;
      case 'lunar_lander': return <LunarLander autoStart={pendingAutoStart === 'lunar_lander'} onUpdateScore={handleUpdateScore} onRewardEarned={reload} />;
      case 'crystal_crusher': return <CrystalCrusher autoStart={pendingAutoStart === 'crystal_crusher'} onUpdateScore={handleUpdateScore} onRewardEarned={reload} />;
      case 'meteor_storm': return <MeteorStorm autoStart={pendingAutoStart === 'meteor_storm'} onUpdateScore={handleUpdateScore} onRewardEarned={reload} />;
      default: return <PlaceholderGame title="Unknown Terminal" description="Signal lost." />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 font-body selection:bg-primary/30">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 max-w-7xl mx-auto">
        <ChevronLeft className="w-4 h-4" /> {T('back', 'Back')}
      </button>
      <header className="max-w-7xl mx-auto mb-6 sm:mb-8 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary">{T('systemOnline', 'System Online')}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight leading-none">
            Rayma AI <span className="text-primary">Arcade</span>
          </h1>
        </div>
        <div className="text-right hidden md:block">
          <div className="text-xs font-bold text-muted-foreground uppercase mb-1">{T('player', 'Player')}</div>
          <div className="text-3xl font-mono font-bold text-foreground">{userProfile?.preferred_name || 'Guest'}</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        <nav className="lg:col-span-1 space-y-4">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 px-4">{T('freeGames', 'Free Games')}</div>
          {Object.values(GAMES_REGISTRY).filter(g => !g.premium).map((game, idx) => {
            const borderActive = {
              'text-purple-500': 'border-purple-500',
              'text-lime-500': 'border-lime-500',
              'text-cyan-400': 'border-cyan-400',
            }[game.accentColor] || 'border-slate-600';
            return (
              <div
                key={game.id}
                role="button"
                tabIndex={0}
                onClick={() => { setActiveGame(game.id); setPendingAutoStart(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { setActiveGame(game.id); setPendingAutoStart(null); } }}
                className={`w-full group relative p-4 cursor-pointer transition-all duration-300 border-l-4 text-left ${
                  activeGame === game.id ? `bg-card ${borderActive}` : 'bg-transparent border-border hover:bg-card'
                }`}
              >
                <div className="flex flex-col items-start">
                  <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${activeGame === game.id ? game.accentColor : 'text-muted-foreground'}`}>
                    Terminal {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className={`text-lg font-black uppercase tracking-tight ${activeGame === game.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {game.title}
                  </span>
                  <div className="w-full flex items-center justify-between mt-2 gap-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                      {T('lastScore', 'Last')}: <span className={game.accentColor}>{(lastScores[game.id] || 0).toString().padStart(4, '0')}</span>
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveGame(game.id); setPendingAutoStart(game.id); }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                        activeGame === game.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/70'
                      }`}
                    >
                      ▶ {T('startGame', 'Start')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="text-xs font-bold text-primary/70 uppercase tracking-widest mb-4 px-4 pt-4 flex items-center gap-1.5">
            <Crown className="w-3 h-3" /> {T('sponsorGames', 'Sponsor Games')}
          </div>
          {Object.values(GAMES_REGISTRY).filter(g => g.premium).map((game, idx) => {
            const borderActive = {
              'text-cyan-400': 'border-cyan-400',
              'text-pink-400': 'border-pink-400',
            }[game.accentColor] || 'border-primary';
            return (
              <div
                key={game.id}
                role="button"
                tabIndex={0}
                onClick={() => { setActiveGame(game.id); setPendingAutoStart(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { setActiveGame(game.id); setPendingAutoStart(null); } }}
                className={`w-full group relative p-4 cursor-pointer transition-all duration-300 border-l-4 text-left ${
                  activeGame === game.id ? `bg-card ${borderActive}` : 'bg-transparent border-border hover:bg-card'
                }`}
              >
                <div className="flex flex-col items-start">
                  <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1 ${activeGame === game.id ? game.accentColor : 'text-muted-foreground'}`}>
                    Terminal {String(idx + 4).padStart(2, '0')}
                    <Crown className="w-2.5 h-2.5" />
                  </span>
                  <span className={`text-lg font-black uppercase tracking-tight ${activeGame === game.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {game.title}
                  </span>
                  {!hasGameAccess && (
                    <span className="text-[9px] font-bold text-primary/60 uppercase tracking-widest mt-0.5">{T('locked', 'Locked')}</span>
                  )}
                  <div className="w-full flex items-center justify-between mt-2 gap-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                      {T('lastScore', 'Last')}: <span className={game.accentColor}>{(lastScores[game.id] || 0).toString().padStart(4, '0')}</span>
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveGame(game.id); setPendingAutoStart(game.id); }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                        activeGame === game.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/70'
                      }`}
                    >
                      ▶ {T('startGame', 'Start')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <section className="lg:col-span-2">
          <Suspense fallback={<LoadingScreen />}>
            {renderActiveGame()}
          </Suspense>
        </section>

        <aside className="space-y-8">
          <div className="bg-card p-6 sm:p-8 rounded-2xl border relative overflow-hidden">
            <h2 className="text-lg font-heading font-bold mb-6">{T('topScores', 'Top Scores')}</h2>
            <div className="space-y-4">
              {Object.values(GAMES_REGISTRY).map((game) => (
                <div key={game.id} className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase">{game.title}</span>
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