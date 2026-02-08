// Progress / Achievements page

import { useEffect } from 'react';
import { Trophy, TrendingUp, Coins, Camera, Clock, Award } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import { PanelChrome } from '../components/ui/PanelChrome';
import { ProgressRing } from '../components/ui/ProgressRing';

export function Progress() {
  const { progress, achievements, unlockedAchievements, fetchProgress, fetchAchievements } =
    useGameStore();

  useEffect(() => {
    fetchProgress();
    fetchAchievements();
  }, [fetchProgress, fetchAchievements]);

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'common': return 'from-gray-400 to-gray-600';
      case 'rare': return 'from-nebula-blue to-blue-600';
      case 'epic': return 'from-nebula-purple to-purple-600';
      case 'legendary': return 'from-star-gold to-yellow-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getRarityBorder = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'common': return 'border-nina-border';
      case 'rare': return 'border-nebula-blue';
      case 'epic': return 'border-nebula-purple';
      case 'legendary': return 'border-star-gold';
      default: return 'border-nina-border';
    }
  };

  const isUnlocked = (id: string) => unlockedAchievements.some((a) => a.id === id);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-nina-text-bright">Progress & Achievements</h1>

      {/* Progress Overview */}
      {progress && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Level Progress */}
          <PanelChrome title="Level Progress" icon={<TrendingUp size={12} />}>
            <div className="flex items-center gap-5 mb-4">
              <ProgressRing value={progress.xp} max={progress.xp_to_next_level} size={72} strokeWidth={4}>
                <span className="text-2xl font-bold text-nina-text-bright">{progress.level}</span>
              </ProgressRing>
              <div className="flex-1">
                <div className="text-sm font-medium text-nina-text-bright mb-1">{progress.tier} Tier</div>
                <div className="text-xs text-nina-text-dim mb-1.5">
                  {progress.xp.toLocaleString()} / {progress.xp_to_next_level.toLocaleString()} XP
                </div>
                <div className="h-2 bg-nina-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-nina-active transition-all"
                    style={{ width: `${(progress.xp / progress.xp_to_next_level) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </PanelChrome>

          {/* Stats */}
          <PanelChrome title="Statistics" icon={<Award size={12} />}>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Coins} label="Credits" value={progress.credits.toLocaleString()} color="text-star-gold" />
              <StatCard icon={Camera} label="Images" value={String(progress.total_images)} color="text-nina-active" />
              <StatCard icon={Clock} label="Minutes" value={String(Math.round(progress.total_exposure_time / 60))} color="text-nebula-purple" />
              <StatCard icon={Trophy} label="Achievements" value={String(progress.unlocked_achievements.length)} color="text-success" />
            </div>
          </PanelChrome>
        </div>
      )}

      {/* Achievement Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-nina-text-bright">Achievements</h2>
          <span className="text-xs text-nina-text-dim">
            {unlockedAchievements.length} / {achievements.length} unlocked (
            {Math.round((progress?.achievement_progress ?? 0) * 100)}%)
          </span>
        </div>
        <div className="h-1.5 bg-nina-border rounded-full overflow-hidden">
          <div
            className="h-full bg-star-gold transition-all"
            style={{ width: `${(progress?.achievement_progress ?? 0) * 100}%` }}
          />
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {achievements.map((achievement) => {
          const unlocked = isUnlocked(achievement.id);

          return (
            <div
              key={achievement.id}
              className={`bg-nina-surface rounded p-4 border-2 ${getRarityBorder(achievement.rarity)} ${
                !unlocked ? 'opacity-40 grayscale' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${getRarityColor(
                    achievement.rarity
                  )} flex items-center justify-center text-lg shrink-0`}
                >
                  {achievement.hidden && !unlocked ? '?' : achievement.icon || '🏆'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-nina-text-bright text-sm">
                    {achievement.hidden && !unlocked ? '???' : achievement.name}
                  </h3>
                  <p className="text-xs text-nina-text-dim mt-0.5">
                    {achievement.hidden && !unlocked
                      ? 'Hidden achievement'
                      : achievement.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded capitalize bg-gradient-to-r ${getRarityColor(
                        achievement.rarity
                      )} text-white`}
                    >
                      {achievement.rarity}
                    </span>
                    <span className="text-[10px] text-nina-active">+{achievement.xp_reward} XP</span>
                    {unlocked && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-success/20 text-success rounded ml-auto">
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

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-nina-elevated rounded p-3 text-center">
      <Icon size={14} className={`${color} mx-auto mb-1`} />
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-nina-text-dim">{label}</div>
    </div>
  );
}
