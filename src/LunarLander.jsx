import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { saveArcadeScore } from '@/api/arcadeGamesApi';
import TouchControls from '@/components/arcade/TouchControls';
import GameTopBar from '@/components/arcade/GameTopBar';
import { useT } from '@/lib/LanguageContext';
import useAutoPauseOnHide from '@/hooks/useAutoPauseOnHide';
import useAutoRotate from '@/hooks/useAutoRotate';
import { drawSpaceBackdrop, drawStarfield, makeStarfield, glowCircle, glowSlab, drawVignette } from '@/utils/gameFx';

const GAME_ID = 'lunar_lander';

/**
 * Lunar Lander — the classic rocket-descent game, Rayma AI style.
 * Fire your thrusters to slow the fall and touch down SOFTLY on the glowing
 * pad. Every successful landing scores (fuel bonus included) and starts a
 * harder round: smaller pad, stronger gravity. Run out of fuel or hit the
 * terrain and it's over.
 * Score-only: no token rewards, just fun.
 */
export default function LunarLander({ onUpdateScore }) {
  const T = useT();
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const [isRotated, setIsRotated] = useAutoRotate(isGameRunning);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [level, setLevel] = useState(1);
  const canvasRef = useRef(null);
  const touchRef = useRef({});

  useEffect(() => {
    const saved = localStorage.getItem('lunarLanderBestScore');
    if (saved) setBestScore(parseInt(saved, 10));
  }, []);

  const latestScoreUpdate = useRef(onUpdateScore);
  useEffect(() => { latestScoreUpdate.current = onUpdateScore; }, [onUpdateScore]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  // 📱 Phone guard — auto-pause when the app is backgrounded (call, app switch, lock screen)
  useAutoPauseOnHide(isGameRunning && !gameOver, () => setIsPaused(true));

  const handleStartGame = () => {
    setGameOver(false);
    setIsPaused(false);
    setScore(0);
    setLevel(1);
    setIsGameRunning(true);
  };

  useEffect(() => {
    if (!isGameRunning || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // Physics constants (tuned for ~60fps)
    const BASE_GRAVITY = 0.035;
    const THRUST = 0.09;
    const SIDE = 0.05;
    const FUEL_BURN = 0.2;
    const MAX_LAND_VY = 1.0;
    const MAX_LAND_VX = 0.8;

    let animationFrameId;
    let currentScore = 0;
    let round = 1;
    let fuel = 100;
    let thrusting = false;
    let dirX = 0;
    let hintFrames = 300;
    let landedFlash = 0;
    let lastBonus = 0;
    let particles = [];
    const bgStars = makeStarfield(W, H, 3, 35);

    const lander = { x: W / 2, y: 55, vx: 0, vy: 0.4 };

    // Jagged terrain with one flat, glowing landing pad.
    // Pad shrinks each round — gravity rises with it.
    const makeTerrain = (r) => {
      const padW = Math.max(46, 120 - (r - 1) * 12);
      const padX = 60 + Math.random() * (W - 120 - padW);
      const padY = H * 0.68 + (Math.random() - 0.5) * 50;
      const n = 34;
      let y = padY + 30;
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const x = (i / n) * W;
        if (x >= padX - 30 && x <= padX + padW + 30) {
          pts.push({ x, y: padY });
        } else {
          y += (Math.random() - 0.5) * 46;
          y = Math.max(H * 0.45, Math.min(H * 0.9, y));
          pts.push({ x, y });
        }
      }
      return { pts, padX, padW, padY };
    };
    let terrain = makeTerrain(round);

    const groundY = (x) => {
      const pts = terrain.pts;
      for (let i = 0; i < pts.length - 1; i++) {
        if (x >= pts[i].x && x <= pts[i + 1].x) {
          const t = (x - pts[i].x) / (pts[i + 1].x - pts[i].x || 1);
          return pts[i].y + (pts[i + 1].y - pts[i].y) * t;
        }
      }
      return H;
    };

    const spawnLander = () => {
      lander.x = 70 + Math.random() * (W - 140);
      lander.y = 55;
      lander.vx = (Math.random() - 0.5) * 1.2;
      lander.vy = 0.4;
    };

    const touchMove = (dir) => {
      if (dir === 'left') dirX = -1;
      if (dir === 'right') dirX = 1;
    };
    const touchRelease = (dir) => {
      if (dir === 'left' && dirX < 0) dirX = 0;
      if (dir === 'right' && dirX > 0) dirX = 0;
    };
    touchRef.current = {
      touchMove,
      touchRelease,
      thrustOn: () => { thrusting = true; },
      thrustOff: () => { thrusting = false; },
    };

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') dirX = -1;
      if (e.key === 'ArrowRight') dirX = 1;
      if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); thrusting = true; }
    };
    const handleKeyUp = (e) => {
      if (e.key === 'ArrowLeft' && dirX < 0) dirX = 0;
      if (e.key === 'ArrowRight' && dirX > 0) dirX = 0;
      if (e.key === ' ' || e.key === 'ArrowUp') thrusting = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const triggerEnd = (finalScore) => {
      window.cancelAnimationFrame(animationFrameId);
      setGameOver(true);
      if (finalScore > bestScore) {
        setBestScore(finalScore);
        localStorage.setItem('lunarLanderBestScore', finalScore.toString());
      }
      saveArcadeScore(GAME_ID, finalScore);
      latestScoreUpdate.current && latestScoreUpdate.current(GAME_ID, finalScore);
    };

    const renderLoop = () => {
      animationFrameId = window.requestAnimationFrame(renderLoop);
      if (isPausedRef.current) return;

      // 2.5D backdrop — moonlit sky gradient + parallax stars
      drawSpaceBackdrop(ctx, W, H, { top: '#0a1024', mid: '#101c3a', bottom: '#030612', accent: 'rgba(34,211,238,0.08)' });
      drawStarfield(ctx, bgStars, W, H);

      // --- Physics ---
      const grav = BASE_GRAVITY + (round - 1) * 0.004;
      lander.vy += grav;
      if (thrusting && fuel > 0) {
        lander.vy -= THRUST;
        fuel -= FUEL_BURN;
        if (fuel < 0) fuel = 0;
        for (let i = 0; i < 3; i++) {
          particles.push({
            x: lander.x + (Math.random() - 0.5) * 8, y: lander.y + 12,
            vx: (Math.random() - 0.5) * 1.5, vy: 2 + Math.random() * 2,
            life: 18, color: Math.random() > 0.5 ? '#fbbf24' : '#22d3ee', size: Math.random() * 2.5 + 1,
          });
        }
      }
      lander.vx += dirX * SIDE;
      lander.x += lander.vx;
      lander.y += lander.vy;
      if (lander.x < 16) { lander.x = 16; lander.vx = 0; }
      if (lander.x > W - 16) { lander.x = W - 16; lander.vx = 0; }

      // --- Terrain ---
      ctx.beginPath();
      ctx.moveTo(terrain.pts[0].x, H);
      terrain.pts.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.lineTo(W, H);
      ctx.closePath();
      const tg = ctx.createLinearGradient(0, H * 0.4, 0, H);
      tg.addColorStop(0, '#3b4a63');
      tg.addColorStop(1, '#0b1220');
      ctx.fillStyle = tg;
      ctx.fill();

      // Glowing ridge line
      ctx.beginPath();
      terrain.pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.strokeStyle = 'rgba(148,163,184,0.9)';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#94a3b8';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Landing pad — glowing platform + alternating beacon lights
      glowSlab(ctx, terrain.padX, terrain.padY - 8, terrain.padW, 8, '#22d3ee', 16, { shadow: false });
      const beaconOn = Math.floor(Date.now() / 300) % 2 === 0;
      glowCircle(ctx, terrain.padX + 6, terrain.padY - 12, 3, beaconOn ? '#f43f5e' : '#22d3ee', 10);
      glowCircle(ctx, terrain.padX + terrain.padW - 6, terrain.padY - 12, 3, beaconOn ? '#22d3ee' : '#f43f5e', 10);

      // --- Touchdown / crash check ---
      const gy = groundY(lander.x);
      if (lander.y + 12 >= gy) {
        const onPad = lander.x - 9 > terrain.padX && lander.x + 9 < terrain.padX + terrain.padW;
        const soft = lander.vy <= MAX_LAND_VY && Math.abs(lander.vx) <= MAX_LAND_VX;
        if (onPad && soft) {
          // 🌕 TOUCHDOWN — fuel bonus, then a harder round
          lastBonus = 100 + Math.round(fuel * 2);
          currentScore += lastBonus;
          setScore(currentScore);
          landedFlash = 90;
          round++;
          setLevel(round);
          fuel = 100;
          terrain = makeTerrain(round);
          spawnLander();
        } else {
          for (let i = 0; i < 30; i++) {
            particles.push({
              x: lander.x, y: gy - 6,
              vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5,
              life: 30, color: '#f43f5e', size: Math.random() * 3 + 1,
            });
          }
          triggerEnd(currentScore);
          return;
        }
      }

      // --- HUD: fuel gauge ---
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = fuel < 25 ? '#f87171' : '#94a3b8';
      ctx.fillText(T('fuel', 'FUEL'), 14, 70);
      ctx.fillStyle = 'rgba(15,23,42,0.8)';
      ctx.fillRect(14, 76, 120, 8);
      const fg = ctx.createLinearGradient(14, 0, 134, 0);
      fg.addColorStop(0, fuel < 25 ? '#f87171' : '#22d3ee');
      fg.addColorStop(1, fuel < 25 ? '#fca5a5' : '#a5f3fc');
      ctx.fillStyle = fg;
      ctx.fillRect(14, 76, Math.max(0, (fuel / 100) * 120), 8);
      ctx.strokeStyle = 'rgba(148,163,184,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(14, 76, 120, 8);

      // --- HUD: descent speed — green = safe landing possible ---
      const safe = lander.vy <= MAX_LAND_VY && Math.abs(lander.vx) <= MAX_LAND_VX;
      ctx.textAlign = 'right';
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = safe ? '#4ade80' : '#f87171';
      ctx.shadowBlur = 6;
      ctx.shadowColor = safe ? '#4ade80' : '#f87171';
      ctx.fillText(`▼ ${Math.max(0, lander.vy).toFixed(1)}`, W - 14, 70);
      ctx.shadowBlur = 0;

      // --- Lander: glossy hull, legs, flickering flame ---
      ctx.save();
      ctx.translate(lander.x, lander.y);
      if (thrusting && fuel > 0) {
        const fl = 10 + Math.random() * 8;
        const flameGrad = ctx.createLinearGradient(0, 8, 0, 8 + fl);
        flameGrad.addColorStop(0, '#fbbf24');
        flameGrad.addColorStop(1, 'rgba(249,115,22,0)');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.moveTo(-5, 8);
        ctx.lineTo(5, 8);
        ctx.lineTo(0, 8 + fl);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, 6); ctx.lineTo(-10, 12);
      ctx.moveTo(6, 6); ctx.lineTo(10, 12);
      ctx.stroke();
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#67e8f9';
      const hull = ctx.createLinearGradient(0, -14, 0, 8);
      hull.addColorStop(0, '#a5f3fc');
      hull.addColorStop(1, '#0e7490');
      ctx.fillStyle = hull;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(9, 6);
      ctx.lineTo(-9, 6);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, -4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // --- Particles ---
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

      // Touchdown bonus flash
      if (landedFlash > 0) {
        landedFlash--;
        ctx.globalAlpha = Math.min(1, landedFlash / 30);
        ctx.textAlign = 'center';
        ctx.font = 'bold 28px monospace';
        ctx.fillStyle = '#4ade80';
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#4ade80';
        ctx.fillText(`${T('touchdown', 'TOUCHDOWN')} +${lastBonus}`, W / 2, 130);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      // First-run hint
      if (hintFrames > 0 && round === 1) {
        hintFrames--;
        ctx.globalAlpha = Math.min(1, hintFrames / 60) * 0.9;
        ctx.textAlign = 'center';
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(T('landerHint', 'HOLD FIRE TO THRUST · LAND SOFTLY ON THE PAD'), W / 2, 110);
        ctx.globalAlpha = 1;
      }
      if (thrusting) hintFrames = 0;

      drawVignette(ctx, W, H, 0.4);
    };

    renderLoop();
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isGameRunning, gameOver]);

  return (
    <div className="w-full aspect-video bg-slate-900 rounded-xl border-4 border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-8">
      {!isGameRunning ? (
        <>
          <h3 className="text-3xl font-black text-cyan-400 uppercase tracking-tighter mb-2">{T('lunarLander', 'Lunar Lander')}</h3>
          <div className="text-slate-400 font-mono mb-2">{T('highScore', 'High Score')}: {bestScore}</div>
          <div className="text-slate-500 font-mono mb-6 text-xs text-center max-w-xs">{T('landerHowTo', 'Fire your thrusters to slow the fall. Land softly on the pad — every landing is smaller and heavier.')}</div>
          <button
            onClick={handleStartGame}
            className="px-8 py-4 bg-cyan-500 text-black font-black uppercase tracking-widest hover:bg-cyan-400 rounded shadow-[0_0_15px_rgba(6,182,212,0.5)]"
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
            level={level}
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
              onAction={() => touchRef.current.thrustOn?.()}
              onActionRelease={() => touchRef.current.thrustOff?.()}
              actionLabel={T('thrust', 'THRUST')}
            />
          )}

          {gameOver && (
            <div className="absolute inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center">
              <div className="font-black text-6xl mb-2 text-red-500">{T('crashed', 'CRASHED')}</div>
              <div className="text-white font-mono text-2xl mb-6">{T('score', 'SCORE')}: {score} | {T('best', 'BEST')}: {bestScore}</div>
              <div className="flex gap-4">
                <button onClick={() => { setGameOver(false); setScore(0); setLevel(1); setIsGameRunning(true); }} className="px-10 py-5 bg-cyan-500 text-black font-black text-xl uppercase rounded-xl">{T('tryAgain', 'Try Again')}</button>
                <button onClick={() => { setGameOver(false); setScore(0); setLevel(1); setIsGameRunning(false); }} className="px-8 py-5 bg-slate-800 text-white font-black text-xl uppercase rounded-xl border border-slate-700 hover:bg-slate-700 flex items-center gap-2">
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