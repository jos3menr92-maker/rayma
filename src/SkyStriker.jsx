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
    
    // Game state
    const player = { x: canvas.width / 2 - 15, y: canvas.height - 60, w: 30, h: 30, speed: 6 };
    let bullets = [];
    let enemies = [];
    let particles = [];
    let stars = Array(70).fill(0).map(() => ({ 
      x: Math.random() * canvas.width, 
      y: Math.random() * canvas.height, 
      speed: Math.random() * 3 + 1,
      size: Math.random() * 2 + 1
    }));
    
    let currentScore = score; 
    let frameCount = 0;
    
    const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

    const handleKeyDown = (e) => {
      if(keys.hasOwnProperty(e.key)) {
          e.preventDefault();
          keys[e.key] = true;
      }
    };
    const handleKeyUp = (e) => {
      if(keys.hasOwnProperty(e.key)) {
          keys[e.key] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Mobile continuous control handlers
    const attachControls = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return () => {};
      
      const startTrigger = (e) => { e.preventDefault(); keys[key] = true; };
      const endTrigger = (e) => { e.preventDefault(); keys[key] = false; };
      
      el.addEventListener('touchstart', startTrigger, { passive: false });
      el.addEventListener('touchend', endTrigger);
      el.addEventListener('mousedown', startTrigger);
      el.addEventListener('mouseup', endTrigger);
      el.addEventListener('mouseleave', endTrigger);
      
      return () => {
        el.removeEventListener('touchstart', startTrigger);
        el.removeEventListener('touchend', endTrigger);
        el.removeEventListener('mousedown', startTrigger);
        el.removeEventListener('mouseup', endTrigger);
        el.removeEventListener('mouseleave', endTrigger);
      };
    };

    const cleanupUp = attachControls('btn-up', 'ArrowUp');
    const cleanupDown = attachControls('btn-down', 'ArrowDown');
    const cleanupLeft = attachControls('btn-left', 'ArrowLeft');
    const cleanupRight = attachControls('btn-right', 'ArrowRight');

    const endGame = (finalScore) => {
      setGameOver(true);
      onUpdateScore('sky_striker', finalScore);
      window.cancelAnimationFrame(animationFrameId);
    };

    const render = () => {
      animationFrameId = window.requestAnimationFrame(render);
      frameCount++;

      const currentLevel = Math.floor(currentScore / 100) + 1;
      
      // Movement
      if (keys.ArrowUp && player.y > 0) player.y -= player.speed;
      if (keys.ArrowDown && player.y < canvas.height - player.h) player.y += player.speed;
      if (keys.ArrowLeft && player.x > 0) player.x -= player.speed;
      if (keys.ArrowRight && player.x < canvas.width - player.w) player.x += player.speed;

      // Auto-fire
      if (frameCount % 12 === 0) {
        bullets.push({ x: player.x + player.w / 2 - 3, y: player.y, w: 6, h: 15, speed: 10 });
      }

      // Spawn Enemies (gets faster with levels)
      const spawnRate = Math.max(15, 60 - (currentLevel * 5));
      if (frameCount % spawnRate === 0) {
        enemies.push({ 
          x: Math.random() * (canvas.width - 30), 
          y: -30, 
          w: 30, 
          h: 30, 
          speed: 3 + Math.random() * 2 + (currentLevel * 0.5) 
        });
      }

      // Update positions
      stars.forEach(s => { 
        s.y += s.speed; 
        if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; } 
      });
      
      bullets.forEach(b => b.y -= b.speed);
      bullets = bullets.filter(b => b.y > -20);
      
      enemies.forEach(e => e.y += e.speed);
      
      particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
      particles = particles.filter(p => p.life > 0);

      // Collisions
      for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        
        // Player hitting enemy
        if (player.x < e.x + e.w && player.x + player.w > e.x && 
            player.y < e.y + e.h && player.y + player.h > e.y) {
          endGame(currentScore);
          return;
        }

        // Bullet hitting enemy
        for (let j = bullets.length - 1; j >= 0; j--) {
          let b = bullets[j];
          if (b.x < e.x + e.w && b.x + b.w > e.x && 
              b.y < e.y + e.h && b.y + b.h > e.y) {
            
            // Spawn explosion particles
            for(let p=0; p<8; p++) {
              particles.push({
                x: e.x + e.w/2, y: e.y + e.h/2, 
                vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, 
                life: 20 + Math.random() * 10
              });
            }

            enemies.splice(i, 1);
            bullets.splice(j, 1);
            currentScore += 10;
            setScore(currentScore);
            break;
          }
        }
      }
      enemies = enemies.filter(e => e.y < canvas.height + 50);

      // --- DRAWING ---
      ctx.fillStyle = '#0f172a'; // Deep slate background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stars
      ctx.fillStyle = '#475569';
      stars.forEach(s => ctx.fillRect(s.x, s.y, s.size, s.size));

      // Particles
      ctx.fillStyle = '#f97316'; // Orange explosion
      particles.forEach(p => ctx.fillRect(p.x, p.y, 4, 4));

      // Bullets
      ctx.fillStyle = '#fde047'; // Yellow lasers
      bullets.forEach(b => {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fde047';
        ctx.fillRect(b.x, b.y, b.w, b.h);
      });
      ctx.shadowBlur = 0; // reset

      // Enemies (Red triangles/diamonds)
      ctx.fillStyle = '#ef4444';
      enemies.forEach(e => {
        ctx.beginPath();
        ctx.moveTo(e.x + e.w/2, e.y + e.h);
        ctx.lineTo(e.x, e.y);
        ctx.lineTo(e.x + e.w, e.y);
        ctx.fill();
      });

      // Player (Cyan jet)
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.moveTo(player.x + player.w/2, player.y);
      ctx.lineTo(player.x + player.w, player.y + player.h);
      ctx.lineTo(player.x + player.w/2, player.y + player.h - 10);
      ctx.lineTo(player.x, player.y + player.h);
      ctx.fill();
    };

    render();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cleanupUp(); cleanupDown(); cleanupLeft(); cleanupRight();
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isGameRunning, gameOver, onUpdateScore]); 

  useEffect(() => {
    return () => { setIsGameRunning(false); };
  }, []);

  const currentLevel = Math.floor(score / 100) + 1;

  return (
    <div className="w-full aspect-video bg-slate-900 rounded-xl border-4 border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-8">
      {!isGameRunning ? (
        <>
          <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Sky Striker</h3>
          <div className="text-slate-400 font-mono mb-8 text-center max-w-md h-12">Take to the skies! Dogfight through market volatility. Auto-fires continuously.</div>
          <button
            onClick={() => { setGameOver(false); setScore(0); setIsGameRunning(true); }}
            className="px-8 py-4 bg-cyan-400 text-black font-black uppercase tracking-widest hover:bg-cyan-300 transition-colors rounded shadow-[0_0_15px_rgba(34,211,238,0.5)]"
          >
            Deploy Jet
          </button>
        </>
      ) : (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center overscroll-none touch-none">
          <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex justify-between items-start z-50 pointer-events-none">
             <div className="bg-black/60 backdrop-blur-sm border border-slate-800 text-cyan-400 font-mono text-xl md:text-3xl font-black px-6 py-3 rounded-2xl pointer-events-auto shadow-lg flex items-center gap-3 sm:gap-4">
               <span className="text-cyan-500/60 text-sm md:text-xl">LVL {currentLevel}</span>
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
                <button id="btn-up" className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-800/90 backdrop-blur border-b-4 border-slate-900 rounded-2xl text-white text-3xl active:bg-cyan-500 active:border-cyan-700 active:text-black active:translate-y-1 transition-all flex items-center justify-center select-none">↑</button>
                <div className="flex gap-1">
                  <button id="btn-left" className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-800/90 backdrop-blur border-b-4 border-slate-900 rounded-2xl text-white text-3xl active:bg-cyan-500 active:border-cyan-700 active:text-black active:translate-y-1 transition-all flex items-center justify-center select-none">←</button>
                  <button id="btn-down" className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-800/90 backdrop-blur border-b-4 border-slate-900 rounded-2xl text-white text-3xl active:bg-cyan-500 active:border-cyan-700 active:text-black active:translate-y-1 transition-all flex items-center justify-center select-none">↓</button>
                  <button id="btn-right" className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-800/90 backdrop-blur border-b-4 border-slate-900 rounded-2xl text-white text-3xl active:bg-cyan-500 active:border-cyan-700 active:text-black active:translate-y-1 transition-all flex items-center justify-center select-none">→</button>
                </div>
             </div>
          </div>

          {gameOver && (
             <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto">
                <div className="text-red-500 font-black text-6xl sm:text-8xl mb-2 tracking-widest text-center animate-pulse drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]">MAYDAY!</div>
                <div className="text-white font-mono text-2xl sm:text-3xl mb-12 bg-black/50 px-8 py-4 rounded-xl border border-slate-800 flex items-center gap-4">
                  <span className="text-slate-400">REACHED LVL {currentLevel}</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-cyan-400">{score} PTS</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-6">
                  <button onClick={() => { setGameOver(false); setScore(0); }} className="px-10 py-5 bg-cyan-400 text-black font-black text-xl uppercase tracking-widest hover:bg-cyan-300 rounded-xl shadow-[0_0_30px_rgba(34,211,238,0.4)] border-b-4 border-cyan-600 active:translate-y-1 active:border-b-0 transition-all">Retry Sortie</button>
                  <button onClick={() => { setIsGameRunning(false); setGameOver(false); setScore(0); }} className="px-10 py-5 bg-slate-800 text-white font-black text-xl uppercase tracking-widest hover:bg-slate-700 rounded-xl border-b-4 border-slate-900 active:translate-y-1 active:border-b-0 transition-all">Main Menu</button>
                </div>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
