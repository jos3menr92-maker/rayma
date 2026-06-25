import React, { useState, useRef, useEffect } from 'react';
import { Pause, Play } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { getHighestArcadeScore, saveArcadeScore, deductUserTokens, getUserTokenBalance } from '@/api/arcadeScoresApi';

const ENTRY_FEE_TOKENS = 10;

export default function RetroSnake({ onUpdateScore, userId }) {
  const { user } = useAuth();
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isLoadingScore, setIsLoadingScore] = useState(true);
  const [userTokens, setUserTokens] = useState(0);
  const [showInsufficientTokens, setShowInsufficientTokens] = useState(false);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const canvasRef = useRef(null);

  // Load best score from database on mount
  useEffect(() => {
    async function loadHighScore() {
      const currentUserId = userId || user?.id;
      if (!currentUserId) {
        setIsLoadingScore(false);
        return;
      }

      try {
        const highScore = await getHighestArcadeScore(currentUserId, 'retrosnake');
        const tokens = await getUserTokenBalance(currentUserId);
        setBestScore(highScore);
        setUserTokens(tokens);
      } catch (err) {
        console.error('[RetroSnake] Error loading scores:', err);
      } finally {
        setIsLoadingScore(false);
      }
    }

    loadHighScore();
  }, [userId, user?.id]);

  const handleStartGame = async () => {
    const currentUserId = userId || user?.id;
    
    // Check if user has enough tokens
    if (currentUserId && userTokens < ENTRY_FEE_TOKENS) {
      setShowInsufficientTokens(true);
      setTimeout(() => setShowInsufficientTokens(false), 3000);
      return;
    }

    // Deduct tokens for playing
    if (currentUserId) {
      const deducted = await deductUserTokens(currentUserId, ENTRY_FEE_TOKENS);
      if (deducted) {
        setUserTokens(prev => prev - ENTRY_FEE_TOKENS);
        setGameOver(false);
        setScore(0);
        setIsPaused(false);
        setIsGameRunning(true);
      } else {
        setShowInsufficientTokens(true);
        setTimeout(() => setShowInsufficientTokens(false), 3000);
      }
    } else {
      // If no user, just start the game (for testing)
      setGameOver(false);
      setScore(0);
      setIsPaused(false);
      setIsGameRunning(true);
    }
  };

  const latestScoreUpdate = useRef(onUpdateScore);
  useEffect(() => { latestScoreUpdate.current = onUpdateScore; }, [onUpdateScore]);

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

    const endGame = (finalScore) => {
      setGameOver(true);
      
      // Save score to database if it's a new high score
      const currentUserId = userId || user?.id;
      if (currentUserId && finalScore > bestScore) {
        setIsSavingScore(true);
        saveArcadeScore(currentUserId, 'retrosnake', finalScore)
          .then((wasSaved) => {
            if (wasSaved) {
              setBestScore(finalScore);
              console.log('[RetroSnake] High score saved successfully');
            }
          })
          .catch((err) => console.error('[RetroSnake] Error saving score:', err))
          .finally(() => setIsSavingScore(false));
      }
      
      latestScoreUpdate.current && latestScoreUpdate.current('retro_snake', finalScore);
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
          {!isLoadingScore && (
            <>
              <div className="text-yellow-400 font-mono mb-4 text-sm">Tokens Available: {userTokens} | Entry Fee: {ENTRY_FEE_TOKENS}</div>
              {showInsufficientTokens && (
                <div className="text-red-400 font-mono mb-4 text-sm animate-pulse">⚠️ Insufficient tokens! Need {ENTRY_FEE_TOKENS}</div>
              )}
            </>
          )}
          <button 
            onClick={handleStartGame}
            disabled={isLoadingScore || (userTokens < ENTRY_FEE_TOKENS && !isLoadingScore)}
            className={`px-8 py-4 font-black uppercase rounded shadow-[0_0_15px_rgba(132,204,22,0.5)] transition-opacity ${
              isLoadingScore || (userTokens < ENTRY_FEE_TOKENS && !isLoadingScore) 
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50' 
                : 'bg-lime-500 text-black hover:bg-lime-400'
            }`}
          >
            {isLoadingScore ? 'Loading...' : userTokens < ENTRY_FEE_TOKENS ? 'Insufficient Tokens' : 'Insert Coin'}
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
                <div className="text-white font-mono text-2xl mb-4">SCORE: {score} | BEST: {bestScore}</div>
                {isSavingScore && <div className="text-green-400 font-mono text-sm mb-4 animate-pulse">Saving score...</div>}
                {score > bestScore && !isSavingScore && <div className="text-green-400 font-mono text-sm mb-4">🎉 New High Score!</div>}
                <button 
                  onClick={handleStartGame}
                  disabled={isSavingScore}
                  className="px-10 py-5 bg-lime-500 text-black font-black text-xl uppercase rounded-xl hover:bg-lime-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingScore ? 'Saving...' : 'Play Again'}
                </button>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
