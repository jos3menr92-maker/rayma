import React, { useState, useRef, useEffect } from 'react';
import { useFinancialData } from './lib/FinancialDataContext';

const GAMES_REGISTRY = {
  space_invaders: { id: 'space_invaders', title: 'Space Invaders', description: 'Defend your portfolio from descending aliens!', accentColor: 'text-purple-500' },
  retro_snake: { id: 'retro_snake', title: 'Retro Snake', description: 'Eat the profits, grow the snake. Don\'t crash!', accentColor: 'text-lime-500' },
  neon_pong: { id: 'neon_pong', title: 'Neon Pong', description: 'Classic bounce action. Deflect the bear market!', accentColor: 'text-cyan-400' }
};

const GameCanvas = ({ gameId, onUpdateScore }) => {
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isGameRunning || gameId !== 'retro_snake') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId;
    const gridSize = 25; // 800/25 = 32 cols, 450/25 = 18 rows
    let snake = [{ x: 10, y: 10 }];
    let food = { x: 20, y: 10 };
    let dx = 1;
    let dy = 0;
    let currentScore = 0;
    
    let frameCount = 0;
    const speed = 6; // Lower is faster

    const handleKeyDown = (e) => {
      // Prevent screen scrolling when using arrows
      if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].indexOf(e.key) > -1) {
          e.preventDefault();
      }
      if (e.key === 'ArrowUp' && dy === 0) { dx = 0; dy = -1; }
      if (e.key === 'ArrowDown' && dy === 0) { dx = 0; dy = 1; }
      if (e.key === 'ArrowLeft' && dx === 0) { dx = -1; dy = 0; }
      if (e.key === 'ArrowRight' && dx === 0) { dx = 1; dy = 0; }
    };

    window.addEventListener('keydown', handleKeyDown);

    const render = () => {
      animationFrameId = window.requestAnimationFrame(render);
      
      frameCount++;
      if (frameCount < speed) return;
      frameCount = 0;

      const head = { x: snake[0].x + dx, y: snake[0].y + dy };

      // Wall Collision
      if (head.x < 0 || head.x >= canvas.width / gridSize || head.y < 0 || head.y >= canvas.height / gridSize) {
        endGame(currentScore);
        return;
      }

      // Self Collision
      for (let i = 0; i < snake.length; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) {
          endGame(currentScore);
          return;
        }
      }

      snake.unshift(head);

      // Food Collision
      if (head.x === food.x && head.y === food.y) {
        currentScore += 10;
        setScore(currentScore);
        food = {
          x: Math.floor(Math.random() * (canvas.width / gridSize)),
          y: Math.floor(Math.random() * (canvas.height / gridSize))
        };
      } else {
        snake.pop();
      }

      // Draw Background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Food
      ctx.fillStyle = '#ef4444'; // Red food
      ctx.fillRect(food.x * gridSize + 2, food.y * gridSize + 2, gridSize - 4, gridSize - 4);

      // Draw Snake
      ctx.fillStyle = '#84cc16'; // Lime green snake
      snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#bef264' : '#84cc16'; // Lighter head
        ctx.fillRect(segment.x * gridSize + 1, segment.y * gridSize + 1, gridSize - 2, gridSize - 2);
      });
    };

    const endGame = (finalScore) => {
      setIsGameRunning(false);
      setGameOver(true);
      onUpdateScore(gameId, finalScore);
      window.cancelAnimationFrame(animationFrameId);
    };

    render();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isGameRunning, gameId]);

  // Reset states when switching games
  useEffect(() => {
    setIsGameRunning(false);
    setGameOver(false);
    setScore(0);
  }, [gameId]);

  return (
    <div className="w-full aspect-video bg-slate-900 rounded-xl border-4 border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-8">
      {!isGameRunning ? (
        <>
          {gameOver && <div className="text-red-500 font-black text-4xl mb-4 tracking-widest">GAME OVER</div>}
          <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">
            {GAMES_REGISTRY[gameId].title}
          </h3>
          <div className="text-slate-400 font-mono mb-8 text-center max-w-md h-12">
            {gameOver ? `FINAL SCORE: ${score}` : GAMES_REGISTRY[gameId].description}
          </div>
          
          {gameId === 'retro_snake' ? (
             <button
               onClick={() => { setGameOver(false); setScore(0); setIsGameRunning(true); }}
               className="px-8 py-4 bg-lime-500 text-black font-black uppercase tracking-widest hover:bg-lime-400 transition-colors rounded shadow-[0_0_15px_rgba(132,204,22,0.5)]"
             >
               {gameOver ? 'Try Again' : 'Insert Coin'}
             </button>
          ) : (
             <div className="px-8 py-4 bg-slate-800 text-slate-500 font-black uppercase tracking-widest border border-slate-700">
               Module Loading...
             </div>
          )}
        </>
      ) : (
        <>
          <div className="absolute top-4 right-6 text-white font-mono font-bold text-xl opacity-50 z-10">
            {score.toString().padStart(4, '0')}
          </div>
          <canvas ref={canvasRef} width={800} height={450} className="w-full h-full bg-slate-900" />
        </>
      )}
    </div>
  );
};

const Arcade = () => {
  const { financialData } = useFinancialData();
  const [activeGame, setActiveGame] = useState('retro_snake');
  
  const [highScores, setHighScores] = useState({
    space_invaders: 0,
    retro_snake: 0,
    neon_pong: 0
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
            <div className="w-3 h-3 bg-lime-500 rounded-full animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest text-lime-500">System Online</span>
          </div>
          <h1 className="text-6xl font-black italic uppercase tracking-tighter leading-none">
            RAYMA <span className="text-lime-500">Arcade</span>
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
              className={`w-full group relative p-4 transition-all duration-300 border-l-4 text-left ${
                activeGame === game.id
                  ? 'bg-slate-900 border-lime-500'
                  : 'bg-transparent border-slate-800 hover:bg-slate-900/50 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col items-start">
                <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${activeGame === game.id ? 'text-lime-500' : 'text-slate-500'}`}>
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
          <GameCanvas gameId={activeGame} onUpdateScore={handleUpdateScore} />
        </section>

        <aside className="space-y-8">
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-lime-500/5 blur-3xl rounded-full" />
            <h2 className="text-xl font-black italic mb-6">TOP SCORES</h2>
            <div className="space-y-4">
              {Object.values(GAMES_REGISTRY).map((game) => (
                <div key={game.id} className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    {game.title}
                  </span>
                  <span className="font-mono text-lg font-bold text-lime-400">
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
