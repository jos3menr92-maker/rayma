import React, { useState, Suspense, lazy } from 'react';
import { useFinancialData } from '@/lib/FinancialDataContext';

// 1. We dynamically import the games ONLY when the user clicks them!
const RetroSnake = lazy(() => import('./RetroSnake'));
const SpaceInvaders = lazy(() => import('./SpaceInvaders'));

const GAMES_REGISTRY = {
  space_invaders: { id: 'space_invaders', title: 'Space Invaders', description: 'Defend your portfolio from descending aliens!', accentColor: 'text-purple-500' },
  retro_snake: { id: 'retro_snake', title: 'Retro Snake', description: 'Eat the profits, grow the snake. Don\'t crash!', accentColor: 'text-lime-500' },
  neon_pong: { id: 'neon_pong', title: 'Neon Pong', description: 'Classic bounce action. Deflect the bear market!', accentColor: 'text-cyan-400' }
};

const PlaceholderGame = ({ title, description }) => (
  <div className="w-full aspect-video bg-slate-900 rounded-xl border-4 border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-8">
    <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">{title}</h3>
    <div className="text-slate-400 font-mono mb-8 text-center max-w-md h-12">{description}</div>
    <div className="px-8 py-4 bg-slate-800 text-slate-500 font-black uppercase tracking-widest border border-slate-700">Module Loading...</div>
  </div>
);

// We need a loading screen for the half-second it takes to download the game file
const LoadingScreen = () => (
  <div className="w-full aspect-video bg-slate-900 rounded-xl border-4 border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-8">
    <div className="w-12 h-12 border-4 border-slate-700 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
    <div className="text-cyan-500 font-mono font-bold tracking-widest animate-pulse">DOWNLOADING GAME DATA...</div>
  </div>
);

const Arcade = () => {
  const { financialData, userProfile } = useFinancialData();
  const [activeGame, setActiveGame] = useState('space_invaders'); 
  
  const [highScores, setHighScores] = useState({
    space_invaders: 0, retro_snake: 0, neon_pong: 0
  });

  const handleUpdateScore = (gameId, newScore) => {
    if (newScore > (highScores[gameId] || 0)) {
      setHighScores(prev => ({ ...prev, [gameId]: newScore }));
    }
  };

  const renderActiveGame = () => {
    switch(activeGame) {
      case 'retro_snake': 
        return <RetroSnake onUpdateScore={handleUpdateScore} />;
      case 'space_invaders': 
        return <SpaceInvaders onUpdateScore={handleUpdateScore} />;
      case 'neon_pong': 
        return <PlaceholderGame title={GAMES_REGISTRY.neon_pong.title} description={GAMES_REGISTRY.neon_pong.description} />;
      default: 
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-8 font-sans selection:bg-cyan-500/30">
      <header className="max-w-7xl mx-auto mb-12 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest text-purple-500">System Online</span>
          </div>
          <h1 className="text-6xl font-black italic uppercase tracking-tighter leading-none">
            RAYMA <span className="text-purple-500">Arcade</span>
          </h1>
        </div>
        <div className="text-right hidden md:block">
          <div className="text-xs font-bold text-slate-500 uppercase mb-1">Player</div>
          <div className="text-3xl font-mono font-bold text-white">
            {userProfile?.preferred_name || 'Guest'}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        <nav className="lg:col-span-1 space-y-4">
          <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 px-4">Select Terminal</div>
          {Object.values(GAMES_REGISTRY).map((game) => (
            <button
              key={game.id}
              onClick={() => setActiveGame(game.id)}
              className={`w-full group relative p-4 transition-all duration-300 border-l-4 text-left ${
                activeGame === game.id ? `bg-slate-900 border-${game.accentColor.split('-')[1]}-500` : 'bg-transparent border-slate-800 hover:bg-slate-900/50 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col items-start">
                <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${activeGame === game.id ? game.accentColor : 'text-slate-500'}`}>
                  Terminal {game.id === 'space_invaders' ? '01' : game.id === 'retro_snake' ? '02' : '03'}
                </span>
                <span className={`text-lg font-black uppercase tracking-tight ${activeGame === game.id ? 'text-white' : 'text-slate-400'}`}>
                  {game.title}
                </span>
              </div>
            </button>
          ))}
        </nav>

        <section className="lg:col-span-2">
          {/* 2. Wrap the active game in a Suspense fallback so it can show a loading screen while downloading the file! */}
          <Suspense fallback={<LoadingScreen />}>
            {renderActiveGame()}
          </Suspense>
        </section>

        <aside className="space-y-8">
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl rounded-full" />
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
