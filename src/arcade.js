import React, { useState } from 'react';
import { useFinancialData } from './lib/FinancialDataContext';

const GAMES_REGISTRY = {
  skyward_debt: {
    id: 'skyward_debt',
    title: 'Skyward Debt',
    description: 'Jump through platforms while managing inflation!',
    accentColor: 'text-pink-500'
  },
  budget_jumper: {
    id: 'budget_jumper',
    title: 'Budget Jumper',
    description: 'Keep your expenses low and your savings high!',
    accentColor: 'text-cyan-400'
  },
  market_pong: {
    id: 'market_pong',
    title: 'Market Pong',
    description: 'Deflect the bear market to stay in the bull zone!',
    accentColor: 'text-yellow-400'
  }
};

const GameCanvas = ({ gameId, onUpdateScore, highScores }) => {
  return (
    <div className="w-full aspect-video bg-black rounded-xl border-4 border-slate-800 flex flex-col items-center justify-center p-8 relative overflow-hidden group">
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900 via-transparent to-transparent"></div>
      
      <h3 className="text-4xl font-black mb-4 text-white uppercase tracking-tighter">
        {GAMES_REGISTRY[gameId].title}
      </h3>
      
      <div className="text-slate-400 font-mono mb-8 text-center max-w-md">
        {GAMES_REGISTRY[gameId].description}
      </div>

      <div className="flex gap-8 mb-8">
        <div className="text-center">
          <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Session Score</div>
          <div className="text-3xl font-black text-white font-mono">00000</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">High Score</div>
          <div className="text-3xl font-black text-white font-mono">
            {highScores[gameId]?.toString().padStart(5, '0') || '00000'}
          </div>
        </div>
      </div>

      <button 
        onClick={() => onUpdateScore(gameId, Math.floor(Math.random() * 1000))}
        className="px-8 py-4 bg-white text-black font-black uppercase tracking-tighter hover:bg-slate-200 transition-colors rounded-sm"
      >
        Start Game
      </button>

      <div className="absolute bottom-4 left-4 right-4 flex justify-between text-[10px] text-slate-600 font-mono uppercase tracking-[0.2em]">
        <span>System: RetroOS v1.0.8</span>
        <span>Status: Ready</span>
      </div>
    </div>
  );
};

const Arcade = () => {
  const { userProfile, refreshUserProfile } = useFinancialData();
  const [activeGameId, setActiveGameId] = useState('skyward_debt');

  const highScores = userProfile?.game_stats?.highScores || {};

  const handleUpdateScore = async (gameId, newScore) => {
    console.log(`Updating score for ${gameId} to ${newScore}`);
    // In a real app, this would trigger an API call. For this demo, we just refresh the profile.
    await refreshUserProfile();
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-6xl font-black tracking-tighter mb-4 italic bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            FIN-ARCADE
          </h1>
          <p className="text-slate-400 font-medium">Player: <span className="text-blue-400">{userProfile?.name || 'Guest'}</span></p>
        </header>

        <div className="grid lg:grid-cols-[1fr_350px] gap-12">
          <section className="space-y-8">
            <GameCanvas 
              gameId={activeGameId} 
              onUpdateScore={handleUpdateScore} 
              highScores={highScores}
            />
            
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] mb-6">Game Selection</h2>
              <div className="grid grid-cols-3 gap-4">
                {Object.values(GAMES_REGISTRY).map((game) => (
                  <button
                    key={game.id}
                    onClick={() => setActiveGameId(game.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      activeGameId === game.id 
                        ? 'bg-slate-800 border-white' 
                        : 'bg-transparent border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className={`text-sm font-black uppercase mb-1 ${game.accentColor}`}>
                      {game.title}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase leading-tight">
                      Select Mode
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-8">
            <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl -mr-16 -mt-16"></div>
              <h2 className="text-xl font-black italic mb-6">TOP SCORES</h2>
              <div className="space-y-4">
                {Object.values(GAMES_REGISTRY).map((game) => (
                  <div key={game.id} className="flex items-center justify-between group">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">
                      {game.title}
                    </span>
                    <span className="font-mono text-lg font-bold text-blue-400">
                      {(highScores[game.id] || 0).toString().padStart(5, '0')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Arcade;
