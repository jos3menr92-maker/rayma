import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { saveArcadeScore } from '@/api/arcadeGamesApi';
import TouchControls from '@/components/arcade/TouchControls';
import GameTopBar from '@/components/arcade/GameTopBar';
import { useT } from '@/lib/LanguageContext';

const GAME_ID = 'crystal_crusher';

/**
 * Crystal Crusher — Brick-breaker reimagined with shatter particles and glowing trails.
 * Shatter crystals, catch power-ups, keep the energy ball alive.
 * Score-only: no token rewards, just fun.
 */
export default function CrystalCrusher({ onUpdateScore }) {
  const T = useT();
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isRotated, setIsRotated] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const canvasRef = useRef(null);
  const touchRef = useRef({});

  useEffect(() => {
    const saved = localStorage.getItem('crystalCrusherBestScore');
    if (saved) setBestScore(parseInt(saved, 10));
  }, []);

  const latestScoreUpdate = useRef(onUpdateScore);
  useEffect(() => { latestScoreUpdate.current = onUpdateScore; }, [onUpdateScore]);

  const handleStartGame = () => {
    setGameOver(false);
    setGameWon(false);
    setIsPaused(false);
    setScore(0);
    setIsGameRunning(true);
  };

  useEffect(() => {
    if (!isGameRunning || gameOver || gameWon || isPaused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    let animationFrameId;
    let currentScore = 0;

    const paddle = { x: W / 2 - 50, y: H - 30, w: 100, h: 12, dx: 0, speed: 8, baseW: 100 };
    let ball = { x: W / 2, y: H - 50, dx: 4, dy: -4, r: 8, launched: false };
    let bricks = [];
    let particles = [];
    let trail = [];
    let powerUps = [];
    let powerType = null;
    let powerTimer = 0;

    // Build crystal grid
    const rows = 5, cols = 10;
    const brickW = 62, brickH = 22, padX = 8, padY = 8;
    const offsetX = (W - (cols * (brickW + padX) - padX)) / 2;
    const offsetY = 50;
    const colors = ['#f472b6', '#a855f7', '#22d3ee', '#10b981', '#fbbf24'];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bricks.push({
          x: offsetX + c * (brickW + padX),
          y: offsetY + r * (brickH + padY),
          w: brickW, h: brickH,
          color: colors[r],
          alive: true,
          hp: 1,
        });
      }
    }

    const touchMove = (dir) => {
      if (dir === 'left') paddle.dx = -paddle.speed;
      if (dir === 'right') paddle.dx = paddle.speed;
    };
    const touchRelease = (dir) => {
      if (dir === 'left' && paddle.dx < 0) paddle.dx = 0;
      if (dir === 'right' && paddle.dx > 0) paddle.dx = 0;
    };
    const touchAction = () => {
      if (!ball.launched) ball.launched = true;
    };
    touchRef.current = { touchMove, touchRelease, touchAction };

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') paddle.dx = -paddle.speed;
      if (e.key === 'ArrowRight') paddle.dx = paddle.speed;
      if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); ball.launched = true; }
    };
    const handleKeyUp = (e) => {
      if (e.key === 'ArrowLeft' && paddle.dx < 0) paddle.dx = 0;
      if (e.key === 'ArrowRight' && paddle.dx > 0) paddle.dx = 0;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const triggerEnd = (won = false) => {
      window.cancelAnimationFrame(animationFrameId);
      if (won) setGameWon(true); else setGameOver(true);
      if (currentScore > bestScore) {
        setBestScore(currentScore);
        localStorage.setItem('crystalCrusherBestScore', currentScore.toString());
      }
      saveArcadeScore(GAME_ID, currentScore);
      latestScoreUpdate.current && latestScoreUpdate.current(GAME_ID, currentScore);
    };

    const shatter = (brick) => {
      for (let i = 0; i < 12; i++) {
        particles.push({
          x: brick.x + brick.w / 2, y: brick.y + brick.h / 2,
          vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
          life: 25, color: brick.color, size: Math.random() * 3 + 2,
        });
      }
    };

    const renderLoop = () => {
      animationFrameId = window.requestAnimationFrame(renderLoop);

      // Gradient background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#0c0a1a');
      bgGrad.addColorStop(1, '#1a0a2e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Move paddle
      paddle.x += paddle.dx;
      paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

      // Ball follows paddle before launch
      if (!ball.launched) {
        ball.x = paddle.x + paddle.w / 2;
        ball.y = paddle.y - ball.r - 2;
      } else {
        ball.x += ball.dx;
        ball.y += ball.dy;
        // Wall bounces
        if (ball.x - ball.r < 0) { ball.x = ball.r; ball.dx *= -1; }
        if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.dx *= -1; }
        if (ball.y - ball.r < 0) { ball.y = ball.r; ball.dy *= -1; }
        // Paddle bounce
        if (ball.y + ball.r > paddle.y && ball.y < paddle.y + paddle.h && ball.x > paddle.x && ball.x < paddle.x + paddle.w) {
          ball.dy = -Math.abs(ball.dy);
          const hitPos = (ball.x - paddle.x) / paddle.w - 0.5;
          ball.dx = hitPos * 8;
        }
        // Ball falls
        if (ball.y - ball.r > H) triggerEnd(false);
      }

      // Ball trail
      trail.push({ x: ball.x, y: ball.y, life: 12 });
      trail.forEach((t) => {
        t.life--;
        ctx.globalAlpha = (t.life / 12) * 0.4;
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(t.x, t.y, ball.r * (t.life / 12), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      trail = trail.filter(t => t.life > 0);

      // Draw & collide bricks
      let aliveCount = 0;
      bricks.forEach((brick) => {
        if (!brick.alive) return;
        aliveCount++;
        // Glow
        ctx.shadowBlur = 8;
        ctx.shadowColor = brick.color;
        const grad = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.h);
        grad.addColorStop(0, brick.color);
        grad.addColorStop(1, brick.color + 'aa');
        ctx.fillStyle = grad;
        ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
        ctx.shadowBlur = 0;
        // Facet highlight
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(brick.x, brick.y, brick.w, 4);

        // Collision
        if (ball.launched && ball.x > brick.x && ball.x < brick.x + brick.w && ball.y - ball.r < brick.y + brick.h && ball.y + ball.r > brick.y) {
          brick.alive = false;
          ball.dy *= -1;
          currentScore += 10;
          setScore(currentScore);
          shatter(brick);
          // Random power-up drop
          if (Math.random() < 0.12) {
            powerUps.push({ x: brick.x + brick.w / 2, y: brick.y + brick.h, dy: 2, type: Math.random() > 0.5 ? 'wide' : 'multi' });
          }
        }
      });

      if (aliveCount === 0) triggerEnd(true);

      // Power-ups
      powerUps.forEach((pu) => {
        pu.y += pu.dy;
        // Catch
        if (pu.y > paddle.y && pu.y < paddle.y + paddle.h && pu.x > paddle.x && pu.x < paddle.x + paddle.w) {
          pu.caught = true;
          if (pu.type === 'wide') { paddle.w = 160; powerTimer = 300; }
          // 'multi' simplified to just bonus score for lightweight
          if (pu.type === 'multi') { currentScore += 50; setScore(currentScore); }
        }
        if (!pu.caught && pu.y < H) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = pu.type === 'wide' ? '#10b981' : '#fbbf24';
          ctx.fillStyle = pu.type === 'wide' ? '#10b981' : '#fbbf24';
          ctx.beginPath();
          ctx.arc(pu.x, pu.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#000';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(pu.type === 'wide' ? 'W' : 'M', pu.x, pu.y + 4);
        }
      });
      powerUps = powerUps.filter(pu => !pu.caught && pu.y < H);

      // Power timer
      if (powerTimer > 0) {
        powerTimer--;
        if (powerTimer === 0) paddle.w = paddle.baseW;
      }

      // Draw ball
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#22d3ee';
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw paddle
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#a855f7';
      const pGrad = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.w, paddle.y);
      pGrad.addColorStop(0, '#a855f7');
      pGrad.addColorStop(0.5, '#ec4899');
      pGrad.addColorStop(1, '#a855f7');
      ctx.fillStyle = pGrad;
      ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
      ctx.shadowBlur = 0;

      // Particles
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--;
        ctx.globalAlpha = Math.max(0, p.life / 25);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
      ctx.globalAlpha = 1;
      particles = particles.filter(p => p.life > 0);

      // Launch hint
      if (!ball.launched) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(T('tapToLaunch', 'TAP FIRE TO LAUNCH'), W / 2, H / 2);
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
          <h3 className="text-3xl font-black text-pink-400 uppercase tracking-tighter mb-2">{T('crystalCrusher', 'Crystal Crusher')}</h3>
          <div className="text-slate-400 font-mono mb-2">{T('highScore', 'High Score')}: {bestScore}</div>
          <div className="text-slate-500 font-mono mb-6 text-xs text-center max-w-xs">{T('crystalHowTo', 'Shatter every crystal. Catch green for a wider paddle, gold for bonus points.')}</div>
          <button
            onClick={handleStartGame}
            className="px-8 py-4 bg-pink-500 text-white font-black uppercase tracking-widest hover:bg-pink-400 rounded shadow-[0_0_15px_rgba(236,72,153,0.5)]"
          >
            {T('shatter', 'Shatter')}
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
          {isPaused && !gameOver && !gameWon && (
            <div className="absolute inset-0 z-40 bg-black/50 flex flex-col items-center justify-center gap-6">
              <h2 className="text-white text-4xl font-black uppercase tracking-widest">{T('paused', 'Paused')}</h2>
              <button onClick={() => { setIsPaused(false); setIsGameRunning(false); }} className="px-8 py-4 bg-slate-800 text-white font-black uppercase tracking-widest rounded-xl border border-slate-700 hover:bg-slate-700 flex items-center gap-2">
                <X className="w-5 h-5" /> {T('exit', 'Exit')}
              </button>
            </div>
          )}
          {!gameOver && !gameWon && !isPaused && (
            <TouchControls
              onDirection={(dir) => touchRef.current.touchMove?.(dir)}
              onDirectionRelease={(dir) => touchRef.current.touchRelease?.(dir)}
              onAction={() => touchRef.current.touchAction?.()}
              actionLabel={T('fire', 'FIRE')}
            />
          )}
          {(gameOver || gameWon) && (
            <div className="absolute inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center">
              <div className={`font-black text-6xl mb-2 ${gameWon ? 'text-green-400' : 'text-red-500'}`}>{gameWon ? T('victory', 'VICTORY') : T('gameOver', 'GAME OVER')}</div>
              <div className="text-white font-mono text-2xl mb-6">{T('score', 'SCORE')}: {score} | {T('best', 'BEST')}: {bestScore}</div>
              <div className="flex gap-4">
                <button onClick={() => { setGameOver(false); setGameWon(false); setScore(0); setIsGameRunning(true); }} className="px-10 py-5 bg-pink-500 text-white font-black text-xl uppercase rounded-xl">{T('tryAgain', 'Try Again')}</button>
                <button onClick={() => { setGameOver(false); setGameWon(false); setScore(0); setIsGameRunning(false); }} className="px-8 py-5 bg-slate-800 text-white font-black text-xl uppercase rounded-xl border border-slate-700 hover:bg-slate-700 flex items-center gap-2">
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