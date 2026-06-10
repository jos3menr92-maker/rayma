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
                    </span>import React, { useState, useRef, useEffect } from 'react';
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
  const [isGameRunning, setIsGameRunning] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isGameRunning) return;

    let animationFrameId;
    let frame = 0;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      
      frame++;
      const planeY = 150 + Math.sin(frame * 0.05) * 50;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(50, planeY, 30, 30);

      animationFrameId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isGameRunning]);

  return (
    <div className="w-full aspect-video bg-black rounded-xl border-4 border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-8">
      {!isGameRunning ? (
        <>
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">
            {GAMES_REGISTRY[gameId].title}
          </h3>
          <div className="text-slate-400 font-mono mb-8 text-center max-w-md">
            {GAMES_REGISTRY[gameId].description}
          </div>
          <button 
            onClick={() => setIsGameRunning(true)}
            className="px-8 py-4 bg-white text-black font-black uppercase tracking-widest hover:bg-cyan-400 transition-colors"
          >
            Start Game
          </button>
        </>
      ) : (
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={450} 
          className="w-full h-full"
        />
      )}
    </div>
  );
};

const Arcade = () => {
  const { financialData } = useFinancialData();
  const [activeGame, setActiveGame] = useState('skyward_debt');
  const [highScores, setHighScores] = useState({
    skyward_debt: 1250,
    budget_jumper: 850,
    market_pong: 2100
  });

  const handleUpdateScore = (gameId, newScore) => {
    if (newScore > (highScores[gameId] || 0)) {
      setHighScores(prev => ({ ...prev, [gameId]: newScore }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-8 font-sans selection:bg-cyan-500/30">
      <header className="max-w-7xl mx-auto mb-12 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest text-cyan-500">System Online</span>
          </div>
          <h1 className="text-6xl font-black italic uppercase tracking-tighter leading-none">
            Financial <span className="text-cyan-500">Arcade</span>
          </h1>
        </div>
        
        <div className="text-right hidden md:block">
          <div className="text-xs font-bold text-slate-500 uppercase mb-1">Session Liquidity</div>
          <div className="text-3xl font-mono font-bold text-white">
            ${financialData?.cash_balance?.toLocaleString() || '0'}
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
              className={`w-full group relative p-4 transition-all duration-300 border-l-4 ${
                activeGame === game.id 
                  ? 'bg-slate-900 border-cyan-500' 
                  : 'bg-transparent border-slate-800 hover:bg-slate-900/50 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col items-start">
                <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
                  activeGame === game.id ? 'text-cyan-500' : 'text-slate-500'
                }`}>
                  Terminal {game.id === 'skyward_debt' ? '01' : game.id === 'budget_jumper' ? '02' : '03'}
                </span>
                <span className={`text-lg font-black uppercase tracking-tight ${
                  activeGame === game.id ? 'text-white' : 'text-slate-400'
                }`}>
                  {game.title}
                </span>
              </div>
            </button>
          ))}
        </nav>

        <section className="lg:col-span-2">
          <GameCanvas 
            gameId={activeGame} 
            onUpdateScore={handleUpdateScore}
            highScores={highScores}
          />
        </section>

        <aside className="space-y-8">
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
            <h2 className="text-xl font-black italic mb-6">TOP SCORES</h2>
            <div className="space-y-4">
              {Object.values(GAMES_REGISTRY).map((game) => (
                <div key={game.id} className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">
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
      </main>
    </div>
  );
};

export default Arcade;
