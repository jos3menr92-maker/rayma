import React from 'react';
import { useFinancialData } from './lib/FinancialDataContext';

const Arcade = () => {
  const { userProfile, refreshUserProfile } = useFinancialData();

  // Access user-specific game stats (like high scores)
  const highScores = userProfile?.game_stats?.highScores || {};

  const handleUpdateScore = async (gameId, newScore) => {
    console.log(`Updating score for ${gameId} to ${newScore}`);
    // This is where logic to update stats would go, e.g., calling an API or a context function
    // For now, we simulate an update and refresh the profile
    // await updateGameStats(userProfile.id, gameId, newScore);
    await refreshUserProfile();
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-xl shadow-2xl border border-gray-800">
      <h2 className="text-3xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
        RAYMA Arcade Experience
      </h2>
      
      {userProfile ? (
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold">
              {userProfile.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Current Player</p>
              <p className="text-xl font-bold">{userProfile.username}</p>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-lg font-bold mb-3 flex items-center">
              <span className="mr-2">🏆</span> Personal High Scores
            </h3>
            {Object.keys(highScores).length > 0 ? (
              <ul className="space-y-2">
                {Object.entries(highScores).map(([game, score]) => (
                  <li key={game} className="flex justify-between items-center p-2 bg-gray-750 rounded border border-gray-700 hover:bg-gray-700 transition-colors">
                    <span className="font-medium">{game}</span>
                    <span className="font-mono text-yellow-400 font-bold">{score}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No game stats available yet. Start playing!</p>
            )}
          </div>

          <div className="text-xs text-gray-500 text-center italic">
            Connected to RAYMA Profile Management
          </div>
        </div>
      ) : (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="ml-3 text-gray-400">Syncing profile data...</span>
        </div>
      )}
    </div>
  );
};

export default Arcade;
