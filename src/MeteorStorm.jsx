import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { saveArcadeScore } from '@/api/arcadeGamesApi';
import TouchControls from '@/components/arcade/TouchControls';
import GameTopBar from '@/components/arcade/GameTopBar';
import { useT } from '@/lib/LanguageContext';

const GAME_ID = 'meteor_storm';

/**
 * Meteor Storm — Asteroid survival shooter.
 * Pilot a starship, blast meteors before they hit you. Big ones split into smaller fragments.
 * Visual: parallax starfield, rotating glowing asteroids, thrust particles, screen shake.
 * Score-only: no token rewards, just fun.
 */
export default function MeteorStorm({ onUpdateScore }) {
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
    const saved = localStorage.getItem('meteorStormBestScore');
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

    let animationFrameId;
    let currentScore = 0;
    let shakeX = 0, shakeY = 0, shakeIntensity = 0;
    let fireCooldown = 0;
    let spawnTimer = 0;

    // Parallax starfield (3 layers)
    const stars = [[], [], []];
    const starSpeeds = [0.3, 0.7, 1.5];
    const starSizes = [1, 1.5, 2.5];
    for (let layer = 0; layer < 3; layer++) {
      for (let i = 0; i < 50; i++) {
        stars[layer].push({ x: Math.random() * W, y: Math.random() * H });
      }
    }

    const player = { x: W / 2, y: H - 60, w: 30, h: 30, dx: 0, speed: 6 };
    let bullets = [];
    let asteroids = [];
    let particles = [];
    let thrust = [];

    const touchMove = (dir) => {
      if (dir === 'left') player.dx = -player.speed;
      if (dir === 'right') player.dx = player.speed;
    };
    const touchRelease = (dir) => {
      if (dir === 'left' && player.dx < 0) player.dx = 0;
      if (dir === 'right' && player.dx > 0) player.dx = 0;
    };
    const touchFire = () => {
      if (fireCooldown <= 0) {
        bullets.push({ x: player.x, y: player.y - 15, dy: -10 });
        fireCooldown = 10;
      }
    };
    touchRef.current = { touchMove, touchRelease, touchFire };

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') player.dx = -player.speed;
      if (e.key === 'ArrowRight') player.dx = player.speed;
      if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); touchFire(); }
    };
    const handleKeyUp = (e) => {
      if (e.key === 'ArrowLeft' && player.dx < 0) player.dx = 0;
      if (e.key === 'ArrowRight' && player.dx > 0) player.dx = 0;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const spawnAsteroid = (x, y, size, vx, vy) => {
      const verts = [];
      const numVerts = 8 + Math.floor(Math.random() * 4);
      for (let i = 0; i < numVerts; i++) {
        const angle = (i / numVerts) * Math.PI * 2;
        const r = size * (0.7 + Math.random() * 0.3);
        verts.push({ angle, r });
      }
      asteroids.push({
        x: x ?? Math.random() * W,
        y: y ?? -size,
        size,
        vx: vx ?? (Math.random() - 0.5) * 2,
        vy: vy ?? Math.random() * 1.5 + 1,
        rot: 0, rotSpeed: (Math.random() - 0.5) * 0.05,
        verts,
      });
    };

    const explode = (x, y, color, count) => {
      for (let i = 0; i < count; i++) {
        particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
          life: 30, color, size: Math.random() * 3 + 2,
        });
      }
      shakeIntensity = Math.min(shakeIntensity + 8, 20);
    };

    const triggerEnd = () => {
      window.cancelAnimationFrame(animationFrameId);
      setGameOver(true);
      if (currentScore > bestScore) {
        setBestScore(currentScore);
        localStorage.setItem('meteorStormBestScore', currentScore.toString());
      }
      saveArcadeScore(GAME_ID, currentScore);
      latestScoreUpdate.current && latestScoreUpdate.current(GAME_ID, currentScore);
    };

    const renderLoop = () => {
      animationFrameId = window.requestAnimationFrame(renderLoop);

      // Screen shake
      if (shakeIntensity > 0) {
        shakeX = (Math.random() - 0.5) * shakeIntensity;
        shakeY = (Math.random() - 0.5) * shakeIntensity;
        shakeIntensity *= 0.9;
      } else { shakeX = 0; shakeY = 0; }
      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#020617');
      bgGrad.addColorStop(1, '#0c0a1a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(-30, -30, W + 60, H + 60);

      // Parallax stars
      stars.forEach((layer, l) => {
        layer.forEach((star) => {
          star.y += starSpeeds[l];
          if (star.y > H) { star.y = 0; star.x = Math.random() * W; }
          ctx.fillStyle = l === 2 ? '#a855f7' : l === 1 ? '#64748b' : '#334155';
          ctx.beginPath();
          ctx.arc(star.x, star.y, starSizes[l], 0, Math.PI * 2);
          ctx.fill();
        });
      });

      // Move player
      player.x += player.dx;
      player.x = Math.max(20, Math.min(W - 20, player.x));
      if (fireCooldown > 0) fireCooldown--;

      // Thrust particles
      thrust.push({ x: player.x + (Math.random() - 0.5) * 6, y: player.y + 12, life: 15 });
      thrust.forEach((t) => {
        t.life--;
        t.y += 2;
        ctx.globalAlpha = (t.life / 15) * 0.6;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(t.x, t.y, 3 * (t.life / 15), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      thrust = thrust.filter(t => t.life > 0);

      // Draw player ship
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#22d3ee';
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.moveTo(player.x, player.y - 15);
      ctx.lineTo(player.x - 12, player.y + 10);
      ctx.lineTo(player.x + 12, player.y + 10);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(player.x, player.y - 2, 3, 0, Math.PI * 2);
      ctx.fill();

      // Bullets
      bullets.forEach((b, bi) => {
        b.y += b.dy;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#22d3ee';
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(b.x - 2, b.y, 4, 12);
        ctx.shadowBlur = 0;
        if (b.y < -20) bullets.splice(bi, 1);
      });

      // Spawn asteroids
      spawnTimer++;
      if (spawnTimer > 45) { spawnTimer = 0; spawnAsteroid(); }

      // Asteroids
      asteroids.forEach((a, ai) => {
        a.x += a.vx; a.y += a.vy; a.rot += a.rotSpeed;
        if (a.x < a.size) a.vx = Math.abs(a.vx);
        if (a.x > W - a.size) a.vx = -Math.abs(a.vx);

        // Draw asteroid
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.rot);
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#f472b6';
        const aGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, a.size);
        aGrad.addColorStop(0, '#9d174d');
        aGrad.addColorStop(1, '#831843');
        ctx.fillStyle = aGrad;
        ctx.beginPath();
        a.verts.forEach((v, i) => {
          const px = Math.cos(v.angle) * v.r;
          const py = Math.sin(v.angle) * v.r;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // Bullet collision
        bullets.forEach((b, bi) => {
          const dist = Math.hypot(b.x - a.x, b.y - a.y);
          if (dist < a.size) {
            bullets.splice(bi, 1);
            const points = a.size > 30 ? 10 : a.size > 18 ? 20 : 40;
            currentScore += points;
            setScore(currentScore);
            explode(a.x, a.y, '#f472b6', 15);
            // Split into smaller asteroids
            if (a.size > 18) {
              spawnAsteroid(a.x, a.y, a.size * 0.5, a.vx + 1, a.vy);
              spawnAsteroid(a.x, a.y, a.size * 0.5, a.vx - 1, a.vy);
            }
            asteroids.splice(ai, 1);
          }
        });

        // Player collision
        const pDist = Math.hypot(player.x - a.x, player.y - a.y);
        if (pDist < a.size + 12) {
          explode(player.x, player.y, '#f43f5e', 30);
          triggerEnd();
        }
        if (a.y > H + a.size) asteroids.splice(ai, 1);
      });

      // Particles
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.life--;
        ctx.globalAlpha = Math.max(0, p.life / 30);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.life / 30), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      particles = particles.filter(p => p.life > 0);

      // Survival score
      currentScore += 1;
      setScore(currentScore);

      ctx.restore();
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
          <h3 className="text-3xl font-black text-pink-400 uppercase tracking-tighter mb-2">{T('meteorStorm', 'Meteor Storm')}</h3>
          <div className="text-slate-400 font-mono mb-2">{T('highScore', 'High Score')}: {bestScore}</div>
          <div className="text-slate-500 font-mono mb-6 text-xs text-center max-w-xs">{T('meteorHowTo', 'Blast the meteors before they hit you. Big ones split — clear the fragments fast.')}</div>
          <button
            onClick={handleStartGame}
            className="px-8 py-4 bg-pink-600 text-white font-black uppercase tracking-widest hover:bg-pink-500 rounded shadow-[0_0_15px_rgba(236,72,153,0.5)]"
          >
            {T('launch', 'Launch')}
          </button>
        </>
      ) : (
        <div className={`fixed ${isRotated ? 'game-landscape' : 'inset-0'} z-[100] bg-slate-950 flex flex-col items-center justify-center overscroll-none touch-none`}>
          <GameTopBar
            score={score}
            bestScore={bestScore}
            accentColor="text-pink-400"
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
              onAction={() => touchRef.current.touchFire?.()}
              actionLabel={T('fire', 'FIRE')}
            />
          )}
          {gameOver && (
            <div className="absolute inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center">
              <div className="font-black text-6xl mb-2 text-red-500">{T('gameOver', 'GAME OVER')}</div>
              <div className="text-white font-mono text-2xl mb-6">{T('score', 'SCORE')}: {score} | {T('best', 'BEST')}: {bestScore}</div>
              <div className="flex gap-4">
                <button onClick={() => { setGameOver(false); setScore(0); setIsGameRunning(true); }} className="px-10 py-5 bg-pink-600 text-white font-black text-xl uppercase rounded-xl">{T('tryAgain', 'Try Again')}</button>
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