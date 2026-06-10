import React, { useState, useRef, useEffect } from 'react';

export default function SpaceInvaders({ onUpdateScore }) {
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [score, setScore] = useState(0);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isGameRunning || gameOver || gameWon) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId;
    let currentScore = score;
    let currentWave = Math.floor(score / 500) + 1;

    // Game Scaling & Entities
    const player = { x: canvas.width / 2 - 20, y: canvas.height - 50, width: 40, height: 20, speed: 5, dx: 0 };
    let bullets = [];
    let alienBullets = [];
    let aliens = [];
    
    // Invader Config
    const rows = 4;
    const cols = 8;
    const alienWidth = 35;
    const alienHeight = 25;
    const alienPadding = 20;
    const alienOffsetLeft = 50;
    const alienOffsetTop = 60;
    let alienSpeed = 1 + (currentWave * 0.3);
    let alienDirection = 1; 
    let alienMoveDown = false;

    // Initialize Aliens
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

    // Initialize Bunkers (Shields)
    let bunkers = [];
    const bunkerCount = 4;
    const bunkerWidth = 60;
    const bunkerHeight = 15;
    for (let i = 0; i < bunkerCount; i++) {
      bunkers.push({
        x: (canvas.width / bunkerCount) * i + (canvas.width / bunkerCount / 2) - (bunkerWidth / 2),
        y: canvas.height - 100,
        width: bunkerWidth,
        height: bunkerHeight,
        health: 5
      });
    }

    // Keyboard Handles
    let isShooting = false;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') player.dx = -player.speed;
      if (e.key === 'ArrowRight') player.dx = player.speed;
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isShooting) {
          bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, width: 4, height: 12, speed: 7 });
          isShooting = true;
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'ArrowLeft' && player.dx < 0) player.dx = 0;
      if (e.key === 'ArrowRight' && player.dx > 0) player.dx = 0;
      if (e.key === ' ' || e.key === 'ArrowUp') isShooting = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Touch Action Links
    const attachMoveControl = (id, direction) => {
      const el = document.getElementById(id);
      if (!el) return () => {};
      const start = (e) => { e.preventDefault(); player.dx = direction * player.speed; };
      const stop = (e) => { e.preventDefault(); if (Math.sign(player.dx) === direction) player.dx = 0; };
      el.addEventListener('touchstart', start, { passive: false });
      el.addEventListener('mousedown', start);
      el.addEventListener('touchend', stop);
      el.addEventListener('mouseup', stop);
      return () => {
        el.removeEventListener('touchstart', start); el.removeEventListener('mousedown', start);
        el.removeEventListener('touchend', stop); el.removeEventListener('mouseup', stop);
      };
    };

    const attachFireControl = (id) => {
      const el = document.getElementById(id);
      if (!el) return () => {};
      const fire = (e) => {
        e.preventDefault();
        bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, width: 4, height: 12, speed: 7 });
      };
      el.addEventListener('touchstart', fire, { passive: false });
      el.addEventListener('mousedown', fire);
      return () => {
        el.removeEventListener('touchstart', fire);
        el.removeEventListener('mousedown', fire);
      };
    };

    const cleanupLeft = attachMoveControl('btn-left', -1);
    const cleanupRight = attachMoveControl('btn-right', 1);
    const cleanupFire = attachFireControl('btn-fire');

    const triggerEnd = (won = false) => {
      if (won) setGameWon(true);
      else setGameOver(true);
      onUpdateScore('space_invaders', currentScore);
      window.cancelAnimationFrame(animationFrameId);
    };

    const renderLoop = () => {
      animationFrameId = window.requestAnimationFrame(renderLoop);

      // Canvas Screen Setup
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Player Tracker Execution
      player.x += player.dx;
      if (player.x < 0) player.x = 0;
      if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

      // Draw Player Cannon
      ctx.fillStyle = '#a855f7'; // Purple Signature Core
      ctx.fillRect(player.x, player.y, player.width, player.height);
      ctx.fillRect(player.x + player.width / 2 - 4, player.y - 6, 8, 6); // Cannon Tip

      // Player Bullets Cycle
      ctx.fillStyle = '#f472b6';
      bullets.forEach((b, bIdx) => {
        b.y -= b.speed;
        ctx.fillRect(b.x, b.y, b.width, b.height);
        if (b.y < 0) bullets.splice(bIdx, 1);
      });

      // Enemy Counter Bullets Cycle
      ctx.fillStyle = '#ef4444';
      alienBullets.forEach((ab, abIdx) => {
        ab.y += ab.speed;
        ctx.fillRect(ab.x, ab.y, ab.width, ab.height);
        
        // Player Collision Hit Check
        if (
          ab.x < player.x + player.width &&
          ab.x + ab.width > player.x &&
          ab.y < player.y + player.height &&
          ab.y + ab.height > player.y
        ) {
          triggerEnd(false);
          return;
        }
        if (ab.y > canvas.height) alienBullets.splice(abIdx, 1);
      });

      // Draw and Verify Shields/Bunkers
      bunkers.forEach((bunker, bunIdx) => {
        if (bunker.health <= 0) return;
        ctx.fillStyle = `rgba(168, 85, 247, ${bunker.health / 5})`;
        ctx.fillRect(bunker.x, bunker.y, bunker.width, bunker.height);

        // Bullet protection checks
        bullets.forEach((b, bIdx) => {
          if (b.x < bunker.x + bunker.width && b.x + b.width > bunker.x && b.y < bunker.y + bunker.height && b.y + b.height > bunker.y) {
            bullets.splice(bIdx, 1);
            bunker.health--;
          }
        });
        alienBullets.forEach((ab, abIdx) => {
          if (ab.x < bunker.x + bunker.width && ab.x + ab.width > bunker.x && ab.y < bunker.y + bunker.height && ab.y + ab.height > bunker.y) {
            alienBullets.splice(abIdx, 1);
            bunker.health--;
          }
        });
      });

      // Aliens Management System
      let liveAliens = aliens.filter(a => a.alive);
      if (liveAliens.length === 0) {
        currentScore += 200; // Bonus payout Clear
        setScore(currentScore);
        triggerEnd(true);
        return;
      }

      alienMoveDown = false;
      liveAliens.forEach(alien => {
        alien.x += alienSpeed * alienDirection;
        if (alien.x + alien.width > canvas.width - 20 || alien.x < 20) {
          alienMoveDown = true;
        }
      });

      if (alienMoveDown) {
        alienDirection *= -1;
        aliens.forEach(alien => { alien.y += 15; });
      }

      // Draw Invaders & Collision Checks
      ctx.fillStyle = '#c084fc';
      aliens.forEach(alien => {
        if (!alien.alive) return;
        
        // Draw Core Blocks Shape
        ctx.fillRect(alien.x, alien.y, alien.width, alien.height);
        ctx.fillStyle = '#0f172a'; // Eyes
        ctx.fillRect(alien.x + 6, alien.y + 6, 6, 6);
        ctx.fillRect(alien.x + alien.width - 12, alien.y + 6, 6, 6);
        ctx.fillStyle = '#c084fc';

        // Check if Invaders broke through frontlines
        if (alien.y + alien.height >= player.y) {
          triggerEnd(false);
          return;
        }

        // Check laser impacts on Invaders
        bullets.forEach((b, bIdx) => {
          if (b.x < alien.x + alien.width && b.x + b.width > alien.x && b.y < alien.y + alien.height && b.y + b.height > alien.y) {
            alien.alive = false;
            bullets.splice(bIdx, 1);
            currentScore += alien.points;
            setScore(currentScore);
          }
        });
      });

      // Random Fire Counterattacks from base frontline
      if (Math.random() < 0.015 && liveAliens.length > 0) {
        const randomAlien = liveAliens[Math.floor(Math.random() * liveAliens.length)];
        alienBullets.push({ x: randomAlien.x + randomAlien.width / 2, y: randomAlien.y + randomAlien.height, width: 3, height: 10, speed: 4 + currentWave });
      }
    };

    renderLoop();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cleanupLeft(); cleanupRight(); cleanupFire();
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isGameRunning, gameOver, gameWon, onUpdateScore]);

  useEffect(() => {
    return () => { setIsGameRunning(false); };
  }, []);

  const currentLevel = Math.floor(score / 500) + 1;

  return (
    <div className="w-full aspect-video bg-slate-900 rounded-xl border-4 border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-8">
      {!isGameRunning ? (
        <>
          <h3 className="text-3xl font-black text-purple-500 uppercase tracking-tighter mb-2">Space Invaders</h3>
          <div className="text-slate-400 font-mono mb-8 text-center max-w-md h-12">Defend your portfolio from descending aliens!</div>
          <button
            onClick={() => { setGameOver(false); setGameWon(false); setScore(0); setIsGameRunning(true); }}
            className="px-8 py-4 bg-purple-500 text-black font-black uppercase tracking-widest hover:bg-purple-400 transition-colors rounded shadow-[0_0_15px_rgba(168,85,247,0.5)]"
          >
            Load Matrix
          </button>
        </>
      ) : (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center overscroll-none touch-none">
          <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex justify-between items-start z-50 pointer-events-none">
             <div className="bg-black/60 backdrop-blur-sm border border-slate-800 text-purple-400 font-mono text-xl md:text-3xl font-black px-6 py-3 rounded-2xl pointer-events-auto shadow-lg flex items-center gap-3 sm:gap-4">
               <span className="text-purple-500/60 text-sm md:text-xl">WAVE {currentLevel}</span>
               <span className="opacity-30">|</span>
               <span>{score.toString().padStart(4, '0')}</span>
             </div>
             <button
               onClick={() => { setIsGameRunning(false); setGameOver(false); setGameWon(false); setScore(0); }}
               className="bg-black/60 backdrop-blur-sm border border-slate-800 text-slate-400 hover:text-white hover:bg-red-500/80 hover:border-red-500 font-black px-6 py-3 rounded-2xl pointer-events-auto transition-all shadow-lg flex items-center gap-2"
             >
               <span className="hidden sm:inline">HALT</span> ✖
             </button>
          </div>

          <canvas ref={canvasRef} width={800} height={450} className="w-full h-[100dvh] max-w-7xl object-contain bg-slate-900 border-y-4 sm:border-4 border-slate-800 z-10 shadow-2xl" />
          
          {/* Mobile Controller Layout split left/right */}
          <div className="absolute bottom-8 left-4 right-4 sm:left-12 sm:right-12 flex justify-between items-end z-50 pointer-events-none">
             <div className="flex gap-3 pointer-events-auto opacity-60 hover:opacity-100 transition-opacity">
                <button id="btn-left" className="w-20 h-16 sm:w-24 sm:h-20 bg-slate-800/90 backdrop-blur border-b-4 border-slate-900 rounded-2xl text-white text-3xl active:bg-purple-500 active:border-purple-700 active:text-black active:translate-y-1 transition-all flex items-center justify-center select-none">←</button>
                <button id="btn-right" className="w-20 h-16 sm:w-24 sm:h-20 bg-slate-800/90 backdrop-blur border-b-4 border-slate-900 rounded-2xl text-white text-3xl active:bg-purple-500 active:border-purple-700 active:text-black active:translate-y-1 transition-all flex items-center justify-center select-none">→</button>
             </div>
             <div className="pointer-events-auto opacity-60 hover:opacity-100 transition-opacity">
                <button id="btn-fire" className="w-24 h-24 bg-red-600/90 backdrop-blur border-b-4 border-red-900 rounded-full text-white font-black tracking-wider text-xl active:bg-purple-500 active:border-purple-700 active:text-black active:translate-y-2 transition-all flex items-center justify-center select-none shadow-xl">FIRE</button>
             </div>
          </div>

          {(gameOver || gameWon) && (
             <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto">
                <div className={`font-black text-6xl sm:text-8xl mb-2 tracking-widest text-center animate-pulse drop-shadow-[0_0_20px_rgba(168,85,247,0.8)] ${gameWon ? 'text-green-400' : 'text-red-500'}`}>
                  {gameWon ? 'VICTORY' : 'INVADED'}
                </div>
                <div className="text-white font-mono text-2xl sm:text-3xl mb-12 bg-black/50 px-8 py-4 rounded-xl border border-slate-800 flex items-center gap-4">
                  <span className="text-slate-400">STAGE {currentLevel} CLEARED</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-purple-400">{score} PTS</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-6">
                  <button onClick={() => { setGameOver(false); setGameWon(false); if(gameWon){ setScore(score + 10); } else { setScore(0); } }} className="px-10 py-5 bg-purple-500 text-black font-black text-xl uppercase tracking-widest hover:bg-purple-400 rounded-xl shadow-[0_0_30px_rgba(168,85,247,0.4)] border-b-4 border-purple-700 active:translate-y-1 active:border-b-0 transition-all">
                    {gameWon ? 'Next Wave' : 'Try Again'}
                  </button>
                  <button onClick={() => { setIsGameRunning(false); setGameOver(false); setGameWon(false); setScore(0); }} className="px-10 py-5 bg-slate-800 text-white font-black text-xl uppercase tracking-widest hover:bg-slate-700 rounded-xl border-b-4 border-slate-900 active:translate-y-1 active:border-b-0 transition-all">Main Menu</button>
                </div>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
