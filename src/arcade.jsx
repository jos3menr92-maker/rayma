import React, { useState, useRef, useEffect } from 'react';
import { useFinancialData } from './lib/FinancialDataContext';

const GAMES_REGISTRY = {
  skyward_debt: { id: 'skyward_debt', title: 'Skyward Debt', description: 'Jump through platforms while managing inflation!', accentColor: 'text-pink-500' },
  budget_jumper: { id: 'budget_jumper', title: 'Budget Jumper', description: 'Keep your expenses low and your savings high!', accentColor: 'text-cyan-400' },
  market_pong: { id: 'market_pong', title: 'Market Pong', description: 'Deflect the bear market to stay in the bull zone!', accentColor: 'text-yellow-400' }
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
      // Simple 80s bobbing plane math
      const planeY = 150 + Math.sin(frame * 0.05) * 50;
      
      // Clear previous frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw Plane (Cyan Square)
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
        <canvas ref={canvasRef} width={800} height={450} className="w-full h-full" />
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
                <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${activeGame === game.id ? 'text-cyan-500' : 'text-slate-500'}`}>
                  Terminal {game.id === 'skyward_debt' ? '01' : game.id === 'budget_jumper' ? '02' : '03'}
                </span>
                <span className={`text-lg font-black uppercase tracking-tight ${activeGame === game.id ? 'text-white' : 'text-slate-400'}`}>
                  {game.title}
                </span>
              </div>
            </button>
          ))}
        </nav>

        <section className="lg:col-span-2">
          <GameCanvas gameId={activeGame} onUpdateScore={handleUpdateScore} highScores={highScores} />
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
