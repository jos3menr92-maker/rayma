import React, { useState, useRef, useEffect } from 'react';

export default function SkyStriker({ onUpdateScore }) {
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
    let currentScore = score; 
    let frameCount = 0;

    // Game Objects
    const player = { x: canvas.width / 2, y: canvas.height - 60, width: 30, height: 30, speed: 6, dx: 0 };
    let bullets = [];
    let enemies = [];
    let stars = Array.from({ length: 50 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: Math.random() * 2 + 0.5,
      size: Math.random() * 2 + 1
    }));

    // Keyboard Controls
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

    // Touch Controls
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

    const endGame = () => {
      setGameOver(true);
      onUpdateScore('sky_striker', currentScore);
      window.cancelAnimationFrame(animationFrameId);
    };

    const render = () => {
      animationFrameId = window.requestAnimationFrame(render);
      frameCount++;

      // Clear Canvas
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw & Update Parallax Stars
      ctx.fillStyle = '#cbd5e1';
      stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });

      // Update Player
      player.x += player.dx;
      // Boundaries
      if (player.x < 0) player.x = 0;
      if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

      // Auto-Fire every 15 frames
      if (frameCount % 15 === 0) {
        bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, width: 4, height: 15, speed: 8 });
      }

      // Update Bullets
      ctx.fillStyle = '#22d3ee'; // Cyan bullets
      bullets.forEach((bullet, index) => {
        bullet.y -= bullet.speed;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        if (bullet.y + bullet.height < 0) bullets.splice(index, 1);
      });

      // Spawn Enemies (Increases difficulty with score)
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

      // Update Enemies & Check Collisions
      ctx.fillStyle = '#c084fc'; // Purple enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        let enemy = enemies[i];
        enemy.y += enemy.speed;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

        // Enemy hits bottom (lose points or just despawn - let's just despawn for arcade feel)
        if (enemy.y > canvas.height) {
          enemies.splice(i, 1);
          continue;
        }

        // Collision: Player vs Enemy (Game Over)
        if (
          player.x < enemy.x + enemy.width &&
          player.x + player.width > enemy.x &&
          player.y < enemy.y + enemy.height &&
          player.y + player.height > enemy.y
        ) {
          endGame();
          return;
        }

        // Collision: Bullet vs Enemy
        for (let j = bullets.length - 1; j >= 0; j--) {
          let bullet = bullets[j];
          if (
            bullet.x < enemy.x + enemy.width &&
            bullet.x + bullet.width > enemy.x &&
            bullet.y < enemy.y + enemy.height &&
            bullet.y + bullet.height > enemy.y
          ) {
            // Hit!
            enemies.splice(i, 1);
            bullets.splice(j, 1);
            currentScore += 15;
            setScore(currentScore);
            break; // Stop checking this enemy
          }
        }
      }

      // Draw Player (Cyan jet shape)
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(player.x + player.width / 2, player.y); // Nose
      ctx.lineTo(player.x + player.width, player.y + player.height); // Right wing
      ctx.lineTo(player.x + player.width / 2, player.y + player.height - 10); // Engine indent
      ctx.lineTo(player.x, player.y + player.height); // Left wing
      ctx.closePath();
      ctx.fill();
    };

    render();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cleanupLeft(); 
      cleanupRight();
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isGameRunning, gameOver, onUpdateScore]); 

  useEffect(() => {
    return () => { setIsGameRunning(false); };
  }, []);

  const currentLevel = Math.floor(score / 300) + 1;

  return (
    <div className="w-full aspect-video bg-slate-900 rounded-xl border-4 border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-8">
      {!isGameRunning ? (
        <>
          <h3 className="text-3xl font-black text-cyan-400 uppercase tracking-tighter mb-2">Sky Striker</h3>
          <div className="text-slate-400 font-mono mb-8 text-center max-w-md h-12">Take to the skies! Dogfight through market volatility.</div>
          <button
            onClick={() => { setGameOver(false); setScore(0); setIsGameRunning(true); }}
            className="px-8 py-4 bg-cyan-500 text-black font-black uppercase tracking-widest hover:bg-cyan-400 transition-colors rounded shadow-[0_0_15px_rgba(6,182,212,0.5)]"
          >
            Launch Fighter
          </button>
        </>
      ) : (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center overscroll-none touch-none">
          <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex justify-between items-start z-50 pointer-events-none">
             <div className="bg-black/60 backdrop-blur-sm border border-slate-800 text-cyan-400 font-mono text-xl md:text-3xl font-black px-6 py-3 rounded-2xl pointer-events-auto shadow-lg flex items-center gap-3 sm:gap-4">
               <span className="text-cyan-500/60 text-sm md:text-xl">WAVE {currentLevel}</span>
               <span className="opacity-30">|</span>
               <span>{score.toString().padStart(4, '0')}</span>
             </div>
             <button
               onClick={() => { setIsGameRunning(false); setGameOver(false); setScore(0); }}
               className="bg-black/60 backdrop-blur-sm border border-slate-800 text-slate-400 hover:text-white hover:bg-red-500/80 hover:border-red-500 font-black px-6 py-3 rounded-2xl pointer-events-auto transition-all shadow-lg flex items-center gap-2"
             >
               <span className="hidden sm:inline">ABORT</span> ✖
             </button>
          </div>

          <canvas ref={canvasRef} width={800} height={450} className="w-full h-[100dvh] max-w-7xl object-contain bg-slate-900 border-y-4 sm:border-4 border-slate-800 z-10 shadow-2xl" />
          
          <div className="absolute bottom-8 left-4 right-4 sm:left-12 sm:right-12 flex justify-center items-end z-50 pointer-events-none">
             <div className="flex gap-8 pointer-events-auto opacity-60 hover:opacity-100 transition-opacity">
                <button id="btn-left" className="w-24 h-20 sm:w-32 sm:h-24 bg-slate-800/90 backdrop-blur border-b-4 border-slate-900 rounded-2xl text-white text-4xl active:bg-cyan-500 active:border-cyan-700 active:text-black active:translate-y-1 transition-all flex items-center justify-center select-none">←</button>
                <button id="btn-right" className="w-24 h-20 sm:w-32 sm:h-24 bg-slate-800/90 backdrop-blur border-b-4 border-slate-900 rounded-2xl text-white text-4xl active:bg-cyan-500 active:border-cyan-700 active:text-black active:translate-y-1 transition-all flex items-center justify-center select-none">→</button>
             </div>
          </div>

          {gameOver && (
             <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto">
                <div className="text-red-500 font-black text-6xl sm:text-8xl mb-2 tracking-widest text-center animate-pulse drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]">SHOT DOWN</div>
                <div className="text-white font-mono text-2xl sm:text-3xl mb-12 bg-black/50 px-8 py-4 rounded-xl border border-slate-800 flex items-center gap-4">
                  <span className="text-slate-400">REACHED WAVE {currentLevel}</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-cyan-400">{score} PTS</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-6">
                  <button onClick={() => { setGameOver(false); setScore(0); }} className="px-10 py-5 bg-cyan-500 text-black font-black text-xl uppercase tracking-widest hover:bg-cyan-400 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.4)] border-b-4 border-cyan-700 active:translate-y-1 active:border-b-0 transition-all">Fly Again</button>
                  <button onClick={() => { setIsGameRunning(false); setGameOver(false); setScore(0); }} className="px-10 py-5 bg-slate-800 text-white font-black text-xl uppercase tracking-widest hover:bg-slate-700 rounded-xl border-b-4 border-slate-900 active:translate-y-1 active:border-b-0 transition-all">Main Menu</button>
                </div>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
