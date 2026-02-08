// Challenges page

import { useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';

export function Challenges() {
  const { challenges, availableChallenges, fetchChallenges, startChallenge } = useGameStore();

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'bg-success/20 text-success';
      case 'intermediate':
        return 'bg-warning/20 text-warning';
      case 'advanced':
        return 'bg-nebula-red/20 text-nebula-red';
      case 'expert':
        return 'bg-nebula-purple/20 text-nebula-purple';
      default:
        return 'bg-gray-600 text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'tutorial':
        return '📚';
      case 'daily':
        return '📅';
      case 'weekly':
        return '📆';
      case 'special':
        return '⭐';
      default:
        return '🎯';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Challenges</h1>
      <p className="text-gray-400 mb-6">Complete challenges to earn XP and credits</p>

      {/* Available Challenges */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="text-success">●</span> Available Now
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableChallenges.map((challenge) => (
            <div key={challenge.id} className="bg-space-800 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getTypeIcon(challenge.type)}</span>
                  <div>
                    <h3 className="font-semibold text-white">{challenge.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyColor(challenge.difficulty)}`}>
                      {challenge.difficulty}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-4">{challenge.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-nebula-blue">+{challenge.xp_reward} XP</span>
                  <span className="text-sm text-star-gold">+{challenge.credits} Credits</span>
                </div>
                <button
                  onClick={() => startChallenge(challenge.id)}
                  className="px-4 py-2 bg-nebula-purple rounded-lg text-sm font-medium hover:bg-opacity-80 transition"
                >
                  Start
                </button>
              </div>
              {challenge.time_limit > 0 && (
                <div className="mt-3 text-xs text-gray-500">
                  Time limit: {Math.floor(challenge.time_limit / 60)} minutes
                </div>
              )}
            </div>
          ))}
        </div>
        {availableChallenges.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No challenges available. Check back later or level up to unlock more!
          </div>
        )}
      </section>

      {/* All Challenges */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">All Challenges</h2>
        <div className="bg-space-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-space-700">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Challenge</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Type</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Difficulty</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Tier</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Rewards</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-space-700">
              {challenges.map((challenge) => (
                <tr key={challenge.id} className="hover:bg-space-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{getTypeIcon(challenge.type)}</span>
                      <span className="text-white">{challenge.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400 capitalize">{challenge.type}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyColor(challenge.difficulty)}`}>
                      {challenge.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{challenge.tier_required}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-nebula-blue mr-3">+{challenge.xp_reward} XP</span>
                    <span className="text-sm text-star-gold">+{challenge.credits}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
