import React, { useState, useRef, useEffect } from 'react';

export default function RetroSnake({ onUpdateScore }) {
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isGameRunning || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId;
    const gridSize = 25; 
    let snake = [{ x: 10, y: 10 }];
    let food = { x: 20, y: 10 };
    let dx = 1;
    let dy = 0;
    let currentScore = score; 
    
    let frameCount = 0;

    const handleKeyDown = (e) => {
      if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].indexOf(e.key) > -1) {
          e.preventDefault();
      }
      if (e.key === 'ArrowUp' && dy === 0) { dx = 0; dy = -1; }
      if (e.key === 'ArrowDown' && dy === 0) { dx = 0; dy = 1; }
      if (e.key === 'ArrowLeft' && dx === 0) { dx = -1; dy = 0; }
      if (e.key === 'ArrowRight' && dx === 0) { dx = 1; dy = 0; }
    };
    window.addEventListener('keydown', handleKeyDown);

    const attachControls = (id, handler) => {
      const el = document.getElementById(id);
      if (!el) return () => {};
      const trigger = (e) => { e.preventDefault(); handler(); };
      el.addEventListener('touchstart', trigger, { passive: false });
      el.addEventListener('mousedown', trigger);
      return () => {
        el.removeEventListener('touchstart', trigger);
        el.removeEventListener('mousedown', trigger);
      };
    };

    const cleanupUp = attachControls('btn-up', () => { if (dy === 0) { dx = 0; dy = -1; } });
    const cleanupDown = attachControls('btn-down', () => { if (dy === 0) { dx = 0; dy = 1; } });
    const cleanupLeft = attachControls('btn-left', () => { if (dx === 0) { dx = -1; dy = 0; } });
    const cleanupRight = attachControls('btn-right', () => { if (dx === 0) { dx = 1; dy = 0; } });

    const endGame = (finalScore) => {
      setGameOver(true);
      onUpdateScore('retro_snake', finalScore);
      window.cancelAnimationFrame(animationFrameId);
    };

    const render = () => {
      animationFrameId = window.requestAnimationFrame(render);
      
      const currentLevel = Math.floor(currentScore / 50) + 1;
      const dynamicSpeed = Math.max(3, 14 - (currentLevel * 2));
      
      frameCount++;
      if (frameCount < dynamicSpeed) return;
      frameCount = 0;

      const head = { x: snake[0].x + dx, y: snake[0].y + dy };

      if (head.x < 0 || head.x >= canvas.width / gridSize || head.y < 0 || head.y >= canvas.height / gridSize) {
        endGame(currentScore);
        return;
      }

      for (let i = 0; i < snake.length; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) {
          endGame(currentScore);
          return;
        }
      }

      snake.unshift(head);

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

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ef4444'; 
      ctx.fillRect(food.x * gridSize + 2, food.y * gridSize + 2, gridSize - 4, gridSize - 4);

      snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#bef264' : '#84cc16'; 
        ctx.fillRect(segment.x * gridSize + 1, segment.y * gridSize + 1, gridSize - 2, gridSize - 2);
      });
    };

    render();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cleanupUp(); cleanupDown(); cleanupLeft(); cleanupRight();
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isGameRunning, gameOver, onUpdateScore]); 

  useEffect(() => {
    return () => { setIsGameRunning(false); };
  }, []);

  const currentLevel = Math.floor(score / 50) + 1;

  return (
    <div className="w-full aspect-video bg-slate-900 rounded-xl border-4 border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-8">
      {!isGameRunning ? (
        <>
          <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Retro Snake</h3>
          <div className="text-slate-400 font-mono mb-8 text-center max-w-md h-12">Eat the profits, grow the snake. Don't crash!</div>
          <button
            onClick={() => { setGameOver(false); setScore(0); setIsGameRunning(true); }}
            className="px-8 py-4 bg-lime-500 text-black font-black uppercase tracking-widest hover:bg-lime-400 transition-colors rounded shadow-[0_0_15px_rgba(132,204,22,0.5)]"
          >
            Insert Coin
          </button>
        </>
      ) : (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center overscroll-none touch-none">
          <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex justify-between items-start z-50 pointer-events-none">
             <div className="bg-black/60 backdrop-blur-sm border border-slate-800 text-lime-400 font-mono text-xl md:text-3xl font-black px-6 py-3 rounded-2xl pointer-events-auto shadow-lg flex items-center gap-3 sm:gap-4">
               <span className="text-lime-500/60 text-sm md:text-xl">LVL {currentLevel}</span>
               <span className="opacity-30">|</span>
               <span>{score.toString().padStart(4, '0')}</span>
             </div>
             <button
               onClick={() => { setIsGameRunning(false); setGameOver(false); setScore(0); }}
               className="bg-black/60 backdrop-blur-sm border border-slate-800 text-slate-400 hover:text-white hover:bg-red-500/80 hover:border-red-500 font-black px-6 py-3 rounded-2xl pointer-events-auto transition-all shadow-lg flex items-center gap-2"
             >
               <span className="hidden sm:inline">EXIT</span> ✖
             </button>
          </div>

          <canvas ref={canvasRef} width={800} height={450} className="w-full h-[100dvh] max-w-7xl object-contain bg-slate-900 border-y-4 sm:border-4 border-slate-800 z-10 shadow-2xl" />
          
          <div className="absolute bottom-8 left-4 right-4 sm:left-12 sm:right-12 flex justify-between items-end z-50 pointer-events-none">
             <div className="flex flex-col items-center gap-1 pointer-events-auto opacity-60 hover:opacity-100 transition-opacity">
                <button id="btn-up" className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-800/90 backdrop-blur border-b-4 border-slate-900 rounded-2xl text-white text-3xl active:bg-lime-500 active:border-lime-700 active:text-black active:translate-y-1 transition-all flex items-center justify-center select-none">↑</button>
                <div className="flex gap-1">
                  <button id="btn-left" className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-800/90 backdrop-blur border-b-4 border-slate-900 rounded-2xl text-white text-3xl active:bg-lime-500 active:border-lime-700 active:text-black active:translate-y-1 transition-all flex items-center justify-center select-none">←</button>
                  <button id="btn-down" className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-800/90 backdrop-blur border-b-4 border-slate-900 rounded-2xl text-white text-3xl active:bg-lime-500 active:border-lime-700 active:text-black active:translate-y-1 transition-all flex items-center justify-center select-none">↓</button>
                  <button id="btn-right" className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-800/90 backdrop-blur border-b-4 border-slate-900 rounded-2xl text-white text-3xl active:bg-lime-500 active:border-lime-700 active:text-black active:translate-y-1 transition-all flex items-center justify-center select-none">→</button>
                </div>
             </div>
          </div>

          {gameOver && (
             <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto">
                <div className="text-red-500 font-black text-6xl sm:text-8xl mb-2 tracking-widest text-center animate-pulse drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]">GAME OVER</div>
                <div className="text-white font-mono text-2xl sm:text-3xl mb-12 bg-black/50 px-8 py-4 rounded-xl border border-slate-800 flex items-center gap-4">
                  <span className="text-slate-400">REACHED LVL {currentLevel}</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-lime-400">{score} PTS</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-6">
                  <button onClick={() => { setGameOver(false); setScore(0); }} className="px-10 py-5 bg-lime-500 text-black font-black text-xl uppercase tracking-widest hover:bg-lime-400 rounded-xl shadow-[0_0_30px_rgba(132,204,22,0.4)] border-b-4 border-lime-700 active:translate-y-1 active:border-b-0 transition-all">Play Again</button>
                  <button onClick={() => { setIsGameRunning(false); setGameOver(false); setScore(0); }} className="px-10 py-5 bg-slate-800 text-white font-black text-xl uppercase tracking-widest hover:bg-slate-700 rounded-xl border-b-4 border-slate-900 active:translate-y-1 active:border-b-0 transition-all">Main Menu</button>
                </div>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
