import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import RetroSnake from '../RetroSnake';
import { getHighestArcadeScore } from '@/api/arcadeScoresApi';
import { Trophy } from 'lucide-react';

/**
 * RetroSnakeContainer
 * 
 * This component wraps the RetroSnake game with database-backed high score system.
 * It displays:
 * - Current high score from database
 * - The game interface
 * - Success notification when a new high score is achieved
 */
export default function RetroSnakeContainer() {
  const { user } = useAuth();
  const [highScore, setHighScore] = useState(0);
  const [isLoadingScore, setIsLoadingScore] = useState(true);
  const [newHighScoreNotification, setNewHighScoreNotification] = useState(false);

  // Load user's high score when component mounts
  useEffect(() => {
    async function loadHighScore() {
      if (!user?.id) {
        setIsLoadingScore(false);
        return;
      }

      try {
        const score = await getHighestArcadeScore(user.id, 'retrosnake');
        setHighScore(score);
      } catch (err) {
        console.error('[RetroSnakeContainer] Error loading high score:', err);
      } finally {
        setIsLoadingScore(false);
      }
    }

    loadHighScore();
  }, [user?.id]);

  const handleScoreUpdate = (gameId, newScore) => {
    if (gameId === 'retro_snake' && newScore > highScore) {
      setHighScore(newScore);
      setNewHighScoreNotification(true);
      setTimeout(() => setNewHighScoreNotification(false), 5000);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Header with High Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <div>
            <h2 className="text-2xl font-black text-white uppercase">Retro Snake</h2>
            <p className="text-sm text-slate-400">
              {isLoadingScore ? 'Loading...' : `All-Time Best: ${highScore}`}
            </p>
          </div>
        </div>

        {newHighScoreNotification && (
          <div className="bg-green-500/20 border border-green-500/50 text-green-400 text-sm font-bold px-3 py-1 rounded-full animate-pulse">
            🎉 New High Score!
          </div>
        )}
      </div>

      {/* Game Component */}
      <RetroSnake onUpdateScore={handleScoreUpdate} userId={user?.id} />
    </div>
  );
}
