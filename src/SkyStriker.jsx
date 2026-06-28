import React, { useState, useRef, useEffect } from 'react';
import { Pause, Play } from 'lucide-react';
import { deductArcadeTokens, saveArcadeScore } from '@/api/arcadeGamesApi';

const GAME_ID = 'sky_striker';
const TOKENS_REQUIRED = 10;

export default function SkyStriker({ onUpdateScore }) {
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isDeducting, setIsDeducting] = useState(false);
  const [tokenError, setTokenError] = useState(null);
  const [playTimestamp, setPlayTimestamp] = useState(null);
  const canvasRef = useRef(null);

  // Load best score on mount (from localStorage as fallback)
  useEffect(() => {
    const saved = localStorage.getItem('skyStrikerBestScore');
    if (saved) setBestScore(parseInt(saved, 10));
  }, []);

  const latestScoreUpdate = useRef(onUpdateScore);
  useEffect(() => {
    latestScoreUpdate.current = onUpdateScore;
  }, [onUpdateScore]);

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
    let currentScore = score; 
    let frameCount = 0;

    const player = { x: canvas.width / 2, y: canvas.height - 60, width: 30, height: 30, speed: 6, dx: 0 };
    let bullets = [];
    let enemies = [];
    let stars = Array.from({ length: 50 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: Math.random() * 2 + 0.5,
      size: Math.random() * 2 + 1
    }));

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') player.dx = -player.speed;
      if (e.key === 'ArrowRight') player.dx = player.speed;
    };
    const handleKeyUp = (e) => {
      if (e.key === 'ArrowLeft' && player.dx < 0) player.dx = 0;
      if (e.key === 'ArrowRight' && player.dx > 0) player.dx = 0;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const attachControls = (id, direction) => {
      const el = document.getElementById(id);
      if (!el) return () => {};
      const start = (e) => { e.preventDefault(); player.dx = direction * player.speed; };
      const stop = (e) => { e.preventDefault(); if (Math.sign(player.dx) === direction) player.dx = 0; };
      el.addEventListener('touchstart', start, { passive: false });
      el.addEventListener('mousedown', start);
      el.addEventListener('touchend', stop);
      el.addEventListener('mouseup', stop);
      el.addEventListener('mouseleave', stop);
      return () => {
        el.removeEventListener('touchstart', start);
        el.removeEventListener('mousedown', start);
        el.removeEventListener('touchend', stop);
        el.removeEventListener('mouseup', stop);
        el.removeEventListener('mouseleave', stop);
      };
    };

    const cleanupLeft = attachControls('btn-left', -1);
    const cleanupRight = attachControls('btn-right', 1);

    const endGame = async () => {
      setGameOver(true);
      // Update best score locally
      if (currentScore > bestScore) {
        setBestScore(currentScore);
        localStorage.setItem('skyStrikerBestScore', currentScore.toString());
      }

      // Save score to server (only if tokens were successfully deducted)
      if (playTimestamp) {
        const saveResult = await saveArcadeScore(GAME_ID, currentScore, playTimestamp);
        if (!saveResult.saved) {
          console.warn('[SkyStriker] Score not saved:', saveResult.message);
        }
      }

      latestScoreUpdate.current && latestScoreUpdate.current(GAME_ID, currentScore);
      window.cancelAnimationFrame(animationFrameId);
    };

    const render = () => {
      animationFrameId = window.requestAnimationFrame(render);
      if (isPaused) return; // ✨ Respect pause

      frameCount++;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#cbd5e1';
      stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) { star.y = 0; star.x = Math.random() * canvas.width; }
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });

      player.x += player.dx;
      if (player.x < 0) player.x = 0;
      if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

      if (frameCount % 15 === 0) {
        bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, width: 4, height: 15, speed: 8 });
      }

      ctx.fillStyle = '#22d3ee';
      bullets.forEach((bullet, index) => {
        bullet.y -= bullet.speed;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        if (bullet.y + bullet.height < 0) bullets.splice(index, 1);
      });

      const spawnRate = Math.max(20, 60 - Math.floor(currentScore / 100));
      if (frameCount % spawnRate === 0) {
        enemies.push({
          x: Math.random() * (canvas.width - 30),
          y: -30,
          width: 30,
          height: 30,
          speed: 2 + Math.random() * 2 + (currentScore / 1000)
        });
      }

      ctx.fillStyle = '#c084fc';
      for (let i = enemies.length - 1; i >= 0; i--) {
        let enemy = enemies[i];
        enemy.y += enemy.speed;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

        if (enemy.y > canvas.height) { enemies.splice(i, 1); continue; }
        if (player.x < enemy.x + enemy.width && player.x + player.width > enemy.x && player.y < enemy.y + enemy.height && player.y + player.height > enemy.y) { endGame(); return; }

        for (let j = bullets.length - 1; j >= 0; j--) {
          let bullet = bullets[j];
          if (bullet.x < enemy.x + enemy.width && bullet.x + bullet.width > enemy.x && bullet.y < enemy.y + enemy.height && bullet.y + bullet.height > enemy.y) {
            enemies.splice(i, 1);
            bullets.splice(j, 1);
            currentScore += 15;
            setScore(currentScore);
            break;
          }
        }
      }

      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(player.x + player.width / 2, player.y);
      ctx.lineTo(player.x + player.width, player.y + player.height);
      ctx.lineTo(player.x + player.width / 2, player.y + player.height - 10);
      ctx.lineTo(player.x, player.y + player.height);
      ctx.closePath();
      ctx.fill();
    };

    render();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cleanupLeft(); cleanupRight();
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isGameRunning, gameOver, isPaused, onUpdateScore]); 

  return (
    <div className="w-full aspect-video bg-slate-900 rounded-xl border-4 border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-8">
      {!isGameRunning ? (
        <>
          <h3 className="text-3xl font-black text-cyan-400 uppercase tracking-tighter mb-2">Sky Striker</h3>
          <div className="text-slate-400 font-mono mb-2">High Score: {bestScore}</div>
          {tokenError && (
            <div className="text-red-400 text-sm mb-4 text-center max-w-xs">{tokenError}</div>
          )}
          <div className="text-slate-500 text-xs mb-4">Costs {TOKENS_REQUIRED} tokens to play</div>
          <button
            onClick={handleStartGame}
            disabled={isDeducting}
            className="px-8 py-4 bg-cyan-500 text-black font-black uppercase tracking-widest hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed rounded shadow-[0_0_15px_rgba(6,182,212,0.5)]"
          >
            {isDeducting ? 'Deducting Tokens...' : 'Launch Fighter'}
          </button>
        </>
      ) : (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center overscroll-none touch-none">
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-50">
             <div className="bg-black/60 backdrop-blur-sm border border-slate-800 text-cyan-400 font-mono text-xl font-black px-6 py-3 rounded-2xl flex items-center gap-4">
               <span>{score.toString().padStart(4, '0')}</span>
               <span className="text-slate-600">|</span>
               <span className="text-slate-400">BEST: {bestScore}</span>
             </div>
             {/* ✨ NEW: Pause Button */}
             <button onClick={() => setIsPaused(!isPaused)} className="bg-black/60 border border-slate-800 text-white p-4 rounded-2xl hover:bg-slate-800">
               {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
             </button>
          </div>

          <canvas ref={canvasRef} width={800} height={450} className="w-full h-[100dvh] max-w-7xl object-contain bg-slate-900 border-y-4 sm:border-4 border-slate-800 z-10 shadow-2xl" />
          
          {isPaused && !gameOver && (
            <div className="absolute inset-0 z-40 bg-black/50 flex items-center justify-center">
              <h2 className="text-white text-4xl font-black uppercase tracking-widest">Paused</h2>
            </div>
          )}

          {gameOver && (
             <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto">
                <div className="text-red-500 font-black text-6xl mb-2 animate-pulse">SHOT DOWN</div>
                <div className="text-white font-mono text-2xl mb-12">SCORE: {score} | BEST: {bestScore}</div>
                <button onClick={() => { setGameOver(false); setScore(0); setIsPaused(false); }} className="px-10 py-5 bg-cyan-500 text-black font-black text-xl uppercase rounded-xl">Fly Again</button>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
