// Progress / Achievements page

import { useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';

export function Progress() {
  const { progress, achievements, unlockedAchievements, fetchProgress, fetchAchievements } =
    useGameStore();

  useEffect(() => {
    fetchProgress();
    fetchAchievements();
  }, [fetchProgress, fetchAchievements]);

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'common':
        return 'from-gray-400 to-gray-600';
      case 'rare':
        return 'from-nebula-blue to-blue-600';
      case 'epic':
        return 'from-nebula-purple to-purple-600';
      case 'legendary':
        return 'from-star-gold to-yellow-600';
      default:
        return 'from-gray-400 to-gray-600';
    }
  };

  const getRarityBorder = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'common':
        return 'border-gray-500';
      case 'rare':
        return 'border-nebula-blue';
      case 'epic':
        return 'border-nebula-purple';
      case 'legendary':
        return 'border-star-gold';
      default:
        return 'border-gray-600';
    }
  };

  const isUnlocked = (id: string) => unlockedAchievements.some((a) => a.id === id);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Progress & Achievements</h1>

      {/* Progress Overview */}
      {progress && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Level Progress */}
          <div className="bg-space-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Level Progress</h2>
            <div className="flex items-center gap-6 mb-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-nebula-blue to-nebula-purple flex items-center justify-center">
                <span className="text-4xl font-bold text-white">{progress.level}</span>
              </div>
              <div className="flex-1">
                <div className="text-lg font-medium text-white mb-1">{progress.tier} Tier</div>
                <div className="text-sm text-gray-400 mb-2">
                  {progress.xp.toLocaleString()} / {progress.xp_to_next_level.toLocaleString()} XP
                </div>
                <div className="h-3 bg-space-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-nebula-blue to-nebula-purple transition-all"
                    style={{ width: `${(progress.xp / progress.xp_to_next_level) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-space-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Statistics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-space-700 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-star-gold">
                  {progress.credits.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">Credits</div>
              </div>
              <div className="bg-space-700 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-nebula-blue">{progress.total_images}</div>
                <div className="text-sm text-gray-400">Images</div>
              </div>
              <div className="bg-space-700 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-nebula-purple">
                  {Math.round(progress.total_exposure_time / 60)}
                </div>
                <div className="text-sm text-gray-400">Minutes</div>
              </div>
              <div className="bg-space-700 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-success">
                  {progress.unlocked_achievements.length}
                </div>
                <div className="text-sm text-gray-400">Achievements</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Achievement Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Achievements</h2>
          <span className="text-sm text-gray-400">
            {unlockedAchievements.length} / {achievements.length} unlocked (
            {Math.round((progress?.achievement_progress ?? 0) * 100)}%)
          </span>
        </div>
        <div className="h-2 bg-space-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-star-gold to-yellow-600 transition-all"
            style={{ width: `${(progress?.achievement_progress ?? 0) * 100}%` }}
          />
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((achievement) => {
          const unlocked = isUnlocked(achievement.id);

          return (
            <div
              key={achievement.id}
              className={`bg-space-800 rounded-xl p-5 border-2 ${getRarityBorder(achievement.rarity)} ${
                !unlocked ? 'opacity-50 grayscale' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 rounded-full bg-gradient-to-br ${getRarityColor(
                    achievement.rarity
                  )} flex items-center justify-center text-2xl`}
                >
                  {achievement.hidden && !unlocked ? '?' : achievement.icon || '🏆'}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">
                    {achievement.hidden && !unlocked ? '???' : achievement.name}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {achievement.hidden && !unlocked
                      ? 'Hidden achievement'
                      : achievement.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded capitalize bg-gradient-to-r ${getRarityColor(
                        achievement.rarity
                      )} text-white`}
                    >
                      {achievement.rarity}
                    </span>
                    <span className="text-xs text-nebula-blue">+{achievement.xp_reward} XP</span>
                    {unlocked && (
                      <span className="text-xs px-2 py-0.5 bg-success/20 text-success rounded ml-auto">
                        Unlocked
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
