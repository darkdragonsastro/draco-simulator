// Challenges page

import { useEffect } from 'react';
import { BookOpen, CalendarDays, CalendarRange, Star, Target, Trophy } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import { PanelChrome } from '../components/ui/PanelChrome';
import type { LucideIcon } from 'lucide-react';

export function Challenges() {
  const { challenges, availableChallenges, fetchChallenges, startChallenge } = useGameStore();

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return 'bg-success/20 text-success';
      case 'intermediate': return 'bg-warning/20 text-warning';
      case 'advanced': return 'bg-nebula-red/20 text-nebula-red';
      case 'expert': return 'bg-nebula-purple/20 text-nebula-purple';
      default: return 'bg-nina-border text-nina-text-dim';
    }
  };

  const getTypeIcon = (type: string): LucideIcon => {
    switch (type.toLowerCase()) {
      case 'tutorial': return BookOpen;
      case 'daily': return CalendarDays;
      case 'weekly': return CalendarRange;
      case 'special': return Star;
      default: return Target;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-nina-text-bright mb-0.5">Challenges</h1>
        <p className="text-xs text-nina-text-dim">Complete challenges to earn XP and credits</p>
      </div>

      {/* Available Challenges */}
      <section>
        <h2 className="text-sm font-medium text-nina-text-bright mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success" /> Available Now
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availableChallenges.map((challenge) => {
            const TypeIcon = getTypeIcon(challenge.type);
            return (
              <div key={challenge.id} className="bg-nina-surface rounded border border-nina-border p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <TypeIcon size={20} className="text-nina-active shrink-0" />
                    <div>
                      <h3 className="font-medium text-nina-text-bright text-sm">{challenge.name}</h3>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${getDifficultyColor(challenge.difficulty)}`}>
                        {challenge.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-nina-text-dim text-xs mb-3">{challenge.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-nina-active">+{challenge.xp_reward} XP</span>
                    <span className="text-xs text-star-gold">+{challenge.credits} Credits</span>
                  </div>
                  <button
                    onClick={() => startChallenge(challenge.id)}
                    className="px-3 py-1.5 bg-nina-primary rounded text-xs font-medium text-nina-text-bright hover:bg-nina-active transition"
                  >
                    Start
                  </button>
                </div>
                {challenge.time_limit > 0 && (
                  <div className="mt-2 text-[10px] text-nina-text-dim">
                    Time limit: {Math.floor(challenge.time_limit / 60)} minutes
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {availableChallenges.length === 0 && (
          <div className="text-center py-6 text-nina-text-dim text-sm">
            No challenges available. Check back later or level up to unlock more!
          </div>
        )}
      </section>

      {/* All Challenges */}
      <PanelChrome title="All Challenges" icon={<Trophy size={12} />}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-nina-border">
                <th className="text-left py-2 px-3 text-nina-text-dim font-medium">Challenge</th>
                <th className="text-left py-2 px-3 text-nina-text-dim font-medium">Type</th>
                <th className="text-left py-2 px-3 text-nina-text-dim font-medium">Difficulty</th>
                <th className="text-left py-2 px-3 text-nina-text-dim font-medium">Tier</th>
                <th className="text-right py-2 px-3 text-nina-text-dim font-medium">Rewards</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nina-border">
              {challenges.map((challenge) => {
                const TypeIcon = getTypeIcon(challenge.type);
                return (
                  <tr key={challenge.id} className="hover:bg-nina-elevated/50">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <TypeIcon size={12} className="text-nina-text-dim" />
                        <span className="text-nina-text">{challenge.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-nina-text-dim capitalize">{challenge.type}</td>
                    <td className="py-2 px-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${getDifficultyColor(challenge.difficulty)}`}>
                        {challenge.difficulty}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-nina-text-dim">{challenge.tier_required}</td>
                    <td className="py-2 px-3 text-right">
                      <span className="text-nina-active mr-2">+{challenge.xp_reward} XP</span>
                      <span className="text-star-gold">+{challenge.credits}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PanelChrome>
    </div>
  );
}
