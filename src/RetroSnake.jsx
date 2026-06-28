import React, { useState, useRef, useEffect } from 'react';
import { Pause, Play } from 'lucide-react';
import { deductArcadeTokens, saveArcadeScore } from '@/api/arcadeGamesApi';

const GAME_ID = 'retro_snake';
const TOKENS_REQUIRED = 10;

export default function RetroSnake({ onUpdateScore }) {
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isDeducting, setIsDeducting] = useState(false);
  const [tokenError, setTokenError] = useState(null);
  const [playTimestamp, setPlayTimestamp] = useState(null);
  const canvasRef = useRef(null);

  // Load best score on mount (from localStorage as fallback, but preferred source is server)
  useEffect(() => {
    const saved = localStorage.getItem('snakeBestScore');
    if (saved) setBestScore(parseInt(saved, 10));
  }, []);

  const latestScoreUpdate = useRef(onUpdateScore);
  useEffect(() => { latestScoreUpdate.current = onUpdateScore; }, [onUpdateScore]);

  const handleStartGame = async () => {
    setTokenError(null);
    setIsDeducting(true);

    // Atomically deduct tokens server-side
    const deductResult = await deductArcadeTokens(GAME_ID, TOKENS_REQUIRED);

    if (!deductResult.success) {
      setTokenError(deductResult.message || 'Failed to deduct tokens');
      setIsDeducting(false);
      return;
    }

    // Store server timestamp for score save
    setPlayTimestamp(deductResult.deductedAt);

    // Game is safe to start now
    setGameOver(false);
    setScore(0);
    setIsPaused(false);
    setIsGameRunning(true);
    setIsDeducting(false);
  };

  useEffect(() => {
    if (!isGameRunning || gameOver || isPaused) return; // ✨ Respect pause

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
      if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].indexOf(e.key) > -1) e.preventDefault();
      if (e.key === 'ArrowUp' && dy === 0) { dx = 0; dy = -1; }
      if (e.key === 'ArrowDown' && dy === 0) { dx = 0; dy = 1; }
      if (e.key === 'ArrowLeft' && dx === 0) { dx = -1; dy = 0; }
      if (e.key === 'ArrowRight' && dx === 0) { dx = 1; dy = 0; }
    };
    window.addEventListener('keydown', handleKeyDown);

    const endGame = async (finalScore) => {
      setGameOver(true);
      // Update best score locally
      if (finalScore > bestScore) {
        setBestScore(finalScore);
        localStorage.setItem('snakeBestScore', finalScore.toString());
      }

      // Save score to server (only if tokens were successfully deducted)
      if (playTimestamp) {
        const saveResult = await saveArcadeScore(GAME_ID, finalScore, playTimestamp);
        if (!saveResult.saved) {
          console.warn('[RetroSnake] Score not saved:', saveResult.message);
        }
      }

      latestScoreUpdate.current && latestScoreUpdate.current(GAME_ID, finalScore);
      window.cancelAnimationFrame(animationFrameId);
    };

    const render = () => {
      animationFrameId = window.requestAnimationFrame(render);
      if (isPaused) return; // ✨ Skip logic if paused

      const currentLevel = Math.floor(currentScore / 50) + 1;
      const dynamicSpeed = Math.max(3, 14 - (currentLevel * 2));
      
      frameCount++;
      if (frameCount < dynamicSpeed) return;
      frameCount = 0;

      const head = { x: snake[0].x + dx, y: snake[0].y + dy };
      if (head.x < 0 || head.x >= canvas.width / gridSize || head.y < 0 || head.y >= canvas.height / gridSize) { endGame(currentScore); return; }
      for (let i = 0; i < snake.length; i++) { if (snake[i].x === head.x && snake[i].y === head.y) { endGame(currentScore); return; } }

      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        currentScore += 10;
        setScore(currentScore);
        food = { x: Math.floor(Math.random() * (canvas.width / gridSize)), y: Math.floor(Math.random() * (canvas.height / gridSize)) };
      } else { snake.pop(); }

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 8;
      ctx.strokeStyle = '#84cc16';
      ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
      
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
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isGameRunning, gameOver, isPaused]); // ✨ Add isPaused to dependencies

  return (
    <div className="w-full aspect-video bg-slate-900 rounded-xl border-4 border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-8">
      {!isGameRunning ? (
        <>
          <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Retro Snake</h3>
          <div className="text-slate-400 font-mono mb-2">High Score: {bestScore}</div>
          {tokenError && (
            <div className="text-red-400 text-sm mb-4 text-center max-w-xs">{tokenError}</div>
          )}
          <div className="text-slate-500 text-xs mb-4">Costs {TOKENS_REQUIRED} tokens to play</div>
          <button
            onClick={handleStartGame}
            disabled={isDeducting}
            className="px-8 py-4 bg-lime-500 text-black font-black uppercase disabled:opacity-50 disabled:cursor-not-allowed rounded shadow-[0_0_15px_rgba(132,204,22,0.5)]"
          >
            {isDeducting ? 'Deducting Tokens...' : 'Insert Coin'}
          </button>
        </>
      ) : (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center overscroll-none touch-none">
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-50">
             <div className="bg-black/60 border border-slate-800 text-lime-400 font-mono text-xl font-black px-6 py-3 rounded-2xl flex items-center gap-4">
               <span>{score.toString().padStart(4, '0')}</span>
               <span className="text-slate-600">|</span>
               <span className="text-slate-400">BEST: {bestScore}</span>
             </div>
             {/* ✨ NEW: Pause Button */}
             <button onClick={() => setIsPaused(!isPaused)} className="bg-black/60 border border-slate-800 text-white p-4 rounded-2xl hover:bg-slate-800">
               {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
             </button>
          </div>

          <canvas ref={canvasRef} width={800} height={450} className="w-full h-[100dvh] max-w-7xl object-contain bg-slate-900" />
          
          {isPaused && !gameOver && (
            <div className="absolute inset-0 z-40 bg-black/50 flex items-center justify-center">
              <h2 className="text-white text-4xl font-black uppercase tracking-widest">Paused</h2>
            </div>
          )}

          {gameOver && (
             <div className="absolute inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center">
                <div className="text-red-500 font-black text-6xl mb-2 animate-pulse">GAME OVER</div>
                <div className="text-white font-mono text-2xl mb-12">SCORE: {score} | BEST: {bestScore}</div>
                <button onClick={() => { setGameOver(false); setScore(0); setIsPaused(false); }} className="px-10 py-5 bg-lime-500 text-black font-black text-xl uppercase rounded-xl">Play Again</button>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
