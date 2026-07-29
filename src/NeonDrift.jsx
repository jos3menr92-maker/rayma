import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { saveArcadeScore } from '@/api/arcadeGamesApi';
import TouchControls from '@/components/arcade/TouchControls';
import GameTopBar from '@/components/arcade/GameTopBar';
import { useT } from '@/lib/LanguageContext';

const GAME_ID = 'neon_drift';

/**
 * Neon Drift — Synthwave endless runner.
 * Pilot a neon ship down an infinite grid highway, dodge barriers, collect orbs.
 * Visual: perspective grid, glowing ship trail, particle bursts, synthwave sun.
 * Score-only: no token rewards, just fun.
 */
export default function NeonDrift({ onUpdateScore }) {
  const T = useT();
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isRotated, setIsRotated] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const canvasRef = useRef(null);
  const touchRef = useRef({});

  useEffect(() => {
    const saved = localStorage.getItem('neonDriftBestScore');
    if (saved) setBestScore(parseInt(saved, 10));
  }, []);

  const latestScoreUpdate = useRef(onUpdateScore);
  useEffect(() => { latestScoreUpdate.current = onUpdateScore; }, [onUpdateScore]);

  const handleStartGame = () => {
    setGameOver(false);
    setIsPaused(false);
    setScore(0);
    setIsGameRunning(true);
  };

  useEffect(() => {
    if (!isGameRunning || gameOver || isPaused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const horizon = H * 0.35;

    let animationFrameId;
    let currentScore = 0;
    let scrollOffset = 0;
    let speed = 4;

    const player = { x: W / 2, y: H - 80, w: 30, h: 40, dx: 0, speed: 6, shield: 0 };
    let barriers = [];
    let orbs = [];
    let particles = [];
    let trail = [];
    let spawnTimer = 0;

    const touchMove = (dir) => {
      if (dir === 'left') player.dx = -player.speed;
      if (dir === 'right') player.dx = player.speed;
    };
    const touchRelease = (dir) => {
      if (dir === 'left' && player.dx < 0) player.dx = 0;
      if (dir === 'right' && player.dx > 0) player.dx = 0;
    };
    const touchBoost = () => {
      if (player.shield <= 0) { player.shield = 60; }
      for (let i = 0; i < 20; i++) {
        particles.push({
          x: player.x, y: player.y + 20,
          vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3 + 1,
          life: 30, color: '#22d3ee', size: Math.random() * 3 + 1,
        });
      }
    };
    touchRef.current = { touchMove, touchRelease, touchBoost };

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') player.dx = -player.speed;
      if (e.key === 'ArrowRight') player.dx = player.speed;
      if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); touchBoost(); }
    };
    const handleKeyUp = (e) => {
      if (e.key === 'ArrowLeft' && player.dx < 0) player.dx = 0;
      if (e.key === 'ArrowRight' && player.dx > 0) player.dx = 0;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const triggerEnd = () => {
      window.cancelAnimationFrame(animationFrameId);
      setGameOver(true);
      if (currentScore > bestScore) {
        setBestScore(currentScore);
        localStorage.setItem('neonDriftBestScore', currentScore.toString());
      }
      saveArcadeScore(GAME_ID, currentScore);
      latestScoreUpdate.current && latestScoreUpdate.current(GAME_ID, currentScore);
    };

    const spawnEntity = () => {
      const lane = Math.floor(Math.random() * 5) - 2; // -2..2
      const px = W / 2 + lane * 60;
      if (Math.random() > 0.4) {
        orbs.push({ x: px, y: horizon, z: 0, collected: false });
      } else {
        barriers.push({ x: px, y: horizon, z: 0, hit: false });
      }
    };

    const project = (x, z) => {
      const scale = 1 / (1 + z * 0.015);
      const py = horizon + (H - horizon) * (1 - scale);
      const px = W / 2 + (x - W / 2) * scale;
      return { x: px, y: py, scale };
    };

    const renderLoop = () => {
      animationFrameId = window.requestAnimationFrame(renderLoop);

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#0a0420');
      bgGrad.addColorStop(0.35, '#1a0a3a');
      bgGrad.addColorStop(0.36, '#2d1b4e');
      bgGrad.addColorStop(1, '#0a0420');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Synthwave sun
      const sunY = horizon - 20;
      const sunGrad = ctx.createRadialGradient(W / 2, sunY, 5, W / 2, sunY, 80);
      sunGrad.addColorStop(0, '#fde047');
      sunGrad.addColorStop(0.5, '#f97316');
      sunGrad.addColorStop(1, 'rgba(249,115,22,0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(W / 2, sunY, 80, 0, Math.PI * 2);
      ctx.fill();

      // Perspective grid
      scrollOffset += speed;
      ctx.strokeStyle = 'rgba(168,85,247,0.4)';
      ctx.lineWidth = 1;
      // Horizontal lines (scrolling toward viewer)
      const numHLines = 25;
      for (let i = 0; i < numHLines; i++) {
        const z = (i * 40 - (scrollOffset % 40));
        if (z < 0) continue;
        const { y } = project(W / 2, z);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.globalAlpha = Math.min(1, z / 200);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Vertical lines (converging to vanishing point)
      for (let i = -6; i <= 6; i++) {
        const farX = W / 2 + i * 40;
        const nearX = W / 2 + i * 200;
        ctx.beginPath();
        ctx.moveTo(W / 2, horizon);
        ctx.lineTo(nearX, H);
        ctx.strokeStyle = 'rgba(34,211,238,0.25)';
        ctx.stroke();
      }

      // Move player
      player.x += player.dx;
      player.x = Math.max(40, Math.min(W - 40, player.x));
      if (player.shield > 0) player.shield--;

      // Spawn entities
      spawnTimer++;
      if (spawnTimer > 30) { spawnTimer = 0; spawnEntity(); }

      // Update & draw orbs
      orbs.forEach((orb) => {
        orb.z += speed;
        const { x, y, scale } = project(orb.x, orb.z);
        // Collision
        if (!orb.collected && scale > 0.7 && Math.abs(x - player.x) < 25 && Math.abs(y - player.y) < 25) {
          orb.collected = true;
          currentScore += 50;
          setScore(currentScore);
          for (let i = 0; i < 15; i++) {
            particles.push({
              x, y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
              life: 25, color: '#fbbf24', size: Math.random() * 3 + 1,
            });
          }
        }
        if (scale > 0.05 && !orb.collected) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#fbbf24';
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(x, y, 8 * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
      orbs = orbs.filter(o => o.z < 300 && !o.collected);

      // Update & draw barriers
      barriers.forEach((bar) => {
        bar.z += speed;
        const { x, y, scale } = project(bar.x, bar.z);
        if (!bar.hit && scale > 0.6 && Math.abs(x - player.x) < 28 && Math.abs(y - player.y) < 28) {
          if (player.shield > 0) {
            bar.hit = true;
            for (let i = 0; i < 20; i++) {
              particles.push({
                x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
                life: 30, color: '#22d3ee', size: Math.random() * 3 + 1,
              });
            }
          } else {
            triggerEnd();
          }
        }
        if (scale > 0.05 && !bar.hit) {
          const bw = 50 * scale, bh = 60 * scale;
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#f43f5e';
          ctx.fillStyle = '#f43f5e';
          ctx.fillRect(x - bw / 2, y - bh / 2, bw, bh);
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#fecaca';
          ctx.lineWidth = 2;
          ctx.strokeRect(x - bw / 2, y - bh / 2, bw, bh);
        }
      });
      barriers = barriers.filter(b => b.z < 300 && !b.hit);

      // Player trail
      trail.push({ x: player.x, y: player.y + 15, life: 15 });
      trail.forEach((t, i) => {
        t.life--;
        ctx.globalAlpha = (t.life / 15) * 0.5;
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(t.x, t.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      trail = trail.filter(t => t.life > 0);

      // Draw player ship (glowing triangle)
      ctx.shadowBlur = 20;
      ctx.shadowColor = player.shield > 0 ? '#fbbf24' : '#22d3ee';
      ctx.fillStyle = player.shield > 0 ? '#fbbf24' : '#22d3ee';
      ctx.beginPath();
      ctx.moveTo(player.x, player.y - 20);
      ctx.lineTo(player.x - 15, player.y + 15);
      ctx.lineTo(player.x + 15, player.y + 15);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      // Cockpit
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(player.x, player.y - 5, 4, 0, Math.PI * 2);
      ctx.fill();

      // Particles
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.life--;
        ctx.globalAlpha = Math.max(0, p.life / 30);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      particles = particles.filter(p => p.life > 0);

      // Score from distance
      currentScore += 1;
      setScore(currentScore);
      speed = 4 + Math.floor(currentScore / 200) * 0.3;
    };

    renderLoop();
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isGameRunning, gameOver, isPaused]);

  return (
    <div className="w-full aspect-video bg-slate-900 rounded-xl border-4 border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-8">
      {!isGameRunning ? (
        <>
          <h3 className="text-3xl font-black text-cyan-400 uppercase tracking-tighter mb-2">{T('neonDrift', 'Neon Drift')}</h3>
          <div className="text-slate-400 font-mono mb-2">{T('highScore', 'High Score')}: {bestScore}</div>
          <div className="text-slate-500 font-mono mb-6 text-xs text-center max-w-xs">{T('neonDriftHowTo', 'Dodge red barriers, collect gold orbs. Tap BOOST for a short shield.')}</div>
          <button
            onClick={handleStartGame}
            className="px-8 py-4 bg-cyan-400 text-black font-black uppercase tracking-widest hover:bg-cyan-300 rounded shadow-[0_0_15px_rgba(34,211,238,0.5)]"
          >
            {T('launch', 'Launch')}
          </button>
        </>
      ) : (
        <div className={`fixed ${isRotated ? 'game-landscape' : 'inset-0'} z-[100] bg-slate-950 flex flex-col items-center justify-center overscroll-none touch-none`}>
          <GameTopBar
            score={score}
            bestScore={bestScore}
            accentColor="text-cyan-400"
            isPaused={isPaused}
            onTogglePause={() => setIsPaused(!isPaused)}
            onToggleRotate={() => setIsRotated(!isRotated)}
            isRotated={isRotated}
          />
          <canvas ref={canvasRef} width={800} height={450} className="w-full h-full max-w-7xl object-contain z-10" />
          {isPaused && !gameOver && (
            <div className="absolute inset-0 z-40 bg-black/50 flex flex-col items-center justify-center gap-6">
              <h2 className="text-white text-4xl font-black uppercase tracking-widest">{T('paused', 'Paused')}</h2>
              <button onClick={() => { setIsPaused(false); setIsGameRunning(false); }} className="px-8 py-4 bg-slate-800 text-white font-black uppercase tracking-widest rounded-xl border border-slate-700 hover:bg-slate-700 flex items-center gap-2">
                <X className="w-5 h-5" /> {T('exit', 'Exit')}
              </button>
            </div>
          )}
          {!gameOver && !isPaused && (
            <TouchControls
              onDirection={(dir) => touchRef.current.touchMove?.(dir)}
              onDirectionRelease={(dir) => touchRef.current.touchRelease?.(dir)}
              onAction={() => touchRef.current.touchBoost?.()}
              actionLabel={T('boost', 'BOOST')}
            />
          )}
          {gameOver && (
            <div className="absolute inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center">
              <div className="font-black text-6xl mb-2 text-red-500">{T('gameOver', 'GAME OVER')}</div>
              <div className="text-white font-mono text-2xl mb-6">{T('score', 'SCORE')}: {score} | {T('best', 'BEST')}: {bestScore}</div>
              <div className="flex gap-4">
                <button onClick={() => { setGameOver(false); setScore(0); setIsGameRunning(true); }} className="px-10 py-5 bg-cyan-400 text-black font-black text-xl uppercase rounded-xl">{T('tryAgain', 'Try Again')}</button>
                <button onClick={() => { setGameOver(false); setScore(0); setIsGameRunning(false); }} className="px-8 py-5 bg-slate-800 text-white font-black text-xl uppercase rounded-xl border border-slate-700 hover:bg-slate-700 flex items-center gap-2">
                  <X className="w-5 h-5" /> {T('exit', 'Exit')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}