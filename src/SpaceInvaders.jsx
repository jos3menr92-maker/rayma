import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/lib/LanguageContext';
import { claimArcadeReward, saveArcadeScore } from '@/api/arcadeGamesApi';
import TouchControls from '@/components/arcade/TouchControls';
import GameTopBar from '@/components/arcade/GameTopBar';
import ArcadeRewardCelebration from '@/components/arcade/ArcadeRewardCelebration';

const GAME_ID = 'space_invaders';

export default function SpaceInvaders({ onUpdateScore }) {
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isRotated, setIsRotated] = useState(false);
  const [rewardResult, setRewardResult] = useState(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [waveFlash, setWaveFlash] = useState(false);
  const T = useT();
  const canvasRef = useRef(null);
  const touchRef = useRef({});

  useEffect(() => {
    const saved = localStorage.getItem('spaceInvadersBestScore');
    if (saved) setBestScore(parseInt(saved, 10));
  }, []);

  const latestScoreUpdate = useRef(onUpdateScore);
  useEffect(() => { latestScoreUpdate.current = onUpdateScore; }, [onUpdateScore]);

  const handleStartGame = () => {
    setGameOver(false);
    setGameWon(false);
    setIsPaused(false);
    setScore(0);
    setWave(1);
    setRewardResult(null);
    setIsGameRunning(true);
  };

  useEffect(() => {
    if (!isGameRunning || gameOver || gameWon || isPaused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId;
    let currentScore = score;
    let currentWave = Math.floor(score / 500) + 1;

    const player = { x: canvas.width / 2 - 20, y: canvas.height - 50, width: 40, height: 20, speed: 5, dx: 0 };
    let bullets = [];
    let aliens = [];
    let alienDirection = 1;
    
    const rows = 4;
    const cols = 8;
    const alienWidth = 35;
    const alienHeight = 25;
    const alienPadding = 20;
    const alienOffsetLeft = 50;
    const alienOffsetTop = 60;
    const alienStepX = 2;
    const alienDropY = 15;

    const spawnWave = (w) => {
      aliens.length = 0;
      alienDirection = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          aliens.push({
            x: c * (alienWidth + alienPadding) + alienOffsetLeft,
            y: r * (alienHeight + alienPadding) + alienOffsetTop,
            width: alienWidth,
            height: alienHeight,
            alive: true,
            points: (rows - r) * 10
          });
        }
      }
    };
    spawnWave(currentWave);

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') player.dx = -player.speed;
      if (e.key === 'ArrowRight') player.dx = player.speed;
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, width: 4, height: 12, speed: 7 });
      }
    };

    const touchMove = (dir) => {
      if (dir === 'left') player.dx = -player.speed;
      if (dir === 'right') player.dx = player.speed;
    };
    const touchRelease = (dir) => {
      if (dir === 'left' && player.dx < 0) player.dx = 0;
      if (dir === 'right' && player.dx > 0) player.dx = 0;
    };
    const touchFire = () => {
      bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, width: 4, height: 12, speed: 7 });
    };
    touchRef.current = { touchMove, touchRelease, touchFire };

    const handleKeyUp = (e) => {
      if (e.key === 'ArrowLeft' && player.dx < 0) player.dx = 0;
      if (e.key === 'ArrowRight' && player.dx > 0) player.dx = 0;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const triggerEnd = (won = false) => {
      window.cancelAnimationFrame(animationFrameId);
      if (won) setGameWon(true);
      else setGameOver(true);

      if (currentScore > bestScore) {
        setBestScore(currentScore);
        localStorage.setItem('spaceInvadersBestScore', currentScore.toString());
      }

      // Background API calls — don't block the game-over UI
      saveArcadeScore(GAME_ID, currentScore).then(async () => {
        const levelReached = Math.floor(currentScore / 500) + 1;
        if (levelReached >= 5) {
          const result = await claimArcadeReward(GAME_ID, levelReached);
          if (result.success && result.rewardGranted) {
            setRewardResult({ amount: result.rewardAmount });
          }
        }
      });

      latestScoreUpdate.current && latestScoreUpdate.current(GAME_ID, currentScore);
    };

    const renderLoop = () => {
      animationFrameId = window.requestAnimationFrame(renderLoop);
      if (isPaused) return;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      player.x += player.dx;
      if (player.x < 0) player.x = 0;
      if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

      ctx.fillStyle = '#a855f7'; 
      ctx.fillRect(player.x, player.y, player.width, player.height);
      ctx.fillRect(player.x + player.width / 2 - 4, player.y - 6, 8, 6);

      ctx.fillStyle = '#f472b6';
      bullets.forEach((b, bIdx) => {
        b.y -= b.speed;
        ctx.fillRect(b.x, b.y, b.width, b.height);
        if (b.y < 0) bullets.splice(bIdx, 1);
      });

      // Move aliens horizontally as a group; drop + reverse at edges
      const aliveAliens = aliens.filter(a => a.alive);
      if (aliveAliens.length > 0) {
        const aliveCount = aliveAliens.length;
        // Speed up as fewer aliens remain
        const speedMultiplier = 1 + (1 - aliveCount / (rows * cols)) * 2;
        const waveBoost = 1 + (currentWave - 1) * 0.12;
        const step = alienStepX * speedMultiplier * waveBoost * alienDirection;

        const minX = Math.min(...aliveAliens.map(a => a.x));
        const maxX = Math.max(...aliveAliens.map(a => a.x + a.width));

        let shouldDrop = false;
        if (alienDirection > 0 && maxX + step > canvas.width) shouldDrop = true;
        if (alienDirection < 0 && minX + step < 0) shouldDrop = true;

        aliens.forEach((alien) => {
          if (!alien.alive) return;
          if (shouldDrop) {
            alien.y += alienDropY;
            alien.x -= step; // undo this frame's horizontal, reversed next frame
          } else {
            alien.x += step;
          }
        });
        if (shouldDrop) alienDirection *= -1;
      }

      // Render + collision
      let allDead = true;
      aliens.forEach((alien) => {
        if (!alien.alive) return;
        allDead = false;
        ctx.fillStyle = '#10b981';
        ctx.fillRect(alien.x, alien.y, alien.width, alien.height);

        // Aliens reached player's row → game over
        if (alien.y + alien.height >= player.y) { triggerEnd(false); return; }

        bullets.forEach((b, bIdx) => {
          if (b.x > alien.x && b.x < alien.x + alien.width && b.y > alien.y && b.y < alien.y + alien.height) {
            alien.alive = false;
            bullets.splice(bIdx, 1);
            currentScore += alien.points;
            setScore(currentScore);
          }
        });
      });

      if (allDead) {
        currentWave++;
        setWave(currentWave);
        setWaveFlash(true);
        setTimeout(() => setWaveFlash(false), 1300);
        spawnWave(currentWave);
      }
    };

    renderLoop();
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isGameRunning, gameOver, gameWon, isPaused]); 

  return (
    <div className="w-full aspect-video bg-slate-900 rounded-xl border-4 border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-8">
      {!isGameRunning ? (
        <>
          <h3 className="text-3xl font-black text-purple-500 uppercase tracking-tighter mb-2">Space Invaders</h3>
          <div className="text-slate-400 font-mono mb-6">High Score: {bestScore}</div>
          <button
            onClick={handleStartGame}
            className="px-8 py-4 bg-purple-500 text-black font-black uppercase tracking-widest hover:bg-purple-400 rounded shadow-[0_0_15px_rgba(168,85,247,0.5)]"
          >
            Load Matrix (Free)
          </button>
        </>
      ) : (
        <div className={`fixed ${isRotated ? 'game-landscape' : 'inset-0'} z-[100] bg-slate-950 flex flex-col items-center justify-center overscroll-none touch-none`}>
          <GameTopBar
            score={score}
            bestScore={bestScore}
            accentColor="text-purple-400"
            level={wave}
            isPaused={isPaused}
            onTogglePause={() => setIsPaused(!isPaused)}
            onToggleRotate={() => setIsRotated(!isRotated)}
            isRotated={isRotated}
          />

          <canvas ref={canvasRef} width={800} height={450} className="w-full h-full max-w-7xl object-contain bg-slate-900 border-4 border-slate-800 z-10" />

          {waveFlash && !gameOver && !gameWon && (
            <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
              <div className="text-purple-300 font-black text-5xl sm:text-7xl uppercase tracking-widest animate-pulse drop-shadow-[0_0_20px_rgba(168,85,247,0.8)]">{T('waveUp', 'WAVE {n}').replace('{n}', wave)}</div>
            </div>
          )}
          
          {isPaused && !gameOver && !gameWon && (
            <div className="absolute inset-0 z-40 bg-black/50 flex flex-col items-center justify-center gap-6">
              <h2 className="text-white text-4xl font-black uppercase tracking-widest">Paused</h2>
              <button onClick={() => { setIsPaused(false); setIsGameRunning(false); }} className="px-8 py-4 bg-slate-800 text-white font-black uppercase tracking-widest rounded-xl border border-slate-700 hover:bg-slate-700 flex items-center gap-2">
                <X className="w-5 h-5" /> Exit
              </button>
            </div>
          )}

          {!gameOver && !gameWon && !isPaused && (
            <TouchControls
              onDirection={(dir) => touchRef.current.touchMove?.(dir)}
              onDirectionRelease={(dir) => touchRef.current.touchRelease?.(dir)}
              onAction={() => touchRef.current.touchFire?.()}
              actionLabel="FIRE"
            />
          )}

          {(gameOver || gameWon) && (
             <div className="absolute inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center">
                <div className={`font-black text-6xl mb-2 ${gameWon ? 'text-green-400' : 'text-red-500'}`}>{gameWon ? 'VICTORY' : 'INVADED'}</div>
                <div className="text-white font-mono text-2xl mb-6">SCORE: {score} | BEST: {bestScore}</div>
                {score >= 2000 && (
                  <div className="text-purple-400 font-black text-xl mb-8 animate-bounce tracking-widest">
                    🎉 WAVE 5+ REACHED: +2 ENERGY BARS PER MILESTONE!
                  </div>
                )}
                <div className="flex gap-4">
                  <button onClick={() => { setGameOver(false); setGameWon(false); setIsPaused(false); setScore(0); setWave(1); }} className="px-10 py-5 bg-purple-500 text-black font-black text-xl uppercase rounded-xl">Try Again</button>
                  <button onClick={() => { setGameOver(false); setGameWon(false); setIsPaused(false); setScore(0); setWave(1); setIsGameRunning(false); }} className="px-8 py-5 bg-slate-800 text-white font-black text-xl uppercase rounded-xl border border-slate-700 hover:bg-slate-700 flex items-center gap-2">
                    <X className="w-5 h-5" /> Exit
                    </button>
                    </div>
                    {rewardResult && (
                    <ArcadeRewardCelebration amount={rewardResult.amount} onDismiss={() => setRewardResult(null)} />
                    )}
                    </div>
                    )}
        </div>
      )}
    </div>
  );
}