import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { IconSidebar } from './IconSidebar';
import { StatusBar } from './StatusBar';
import { useGameStore } from '../../stores/gameStore';
import { useTutorialStore } from '../../stores/tutorialStore';
import { TutorialOverlay } from '../TutorialOverlay';

export function AppLayout() {
  const { fetchProgress, showAchievementPopup, dismissAchievementPopup, showLevelUpPopup, newLevel, dismissLevelUpPopup } = useGameStore();
  const { activeTutorial, completeTutorial, skipTutorial } = useTutorialStore();

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <IconSidebar />
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
      <StatusBar />

      {/* Achievement Popup */}
      {showAchievementPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-nina-elevated rounded-xl p-8 max-w-md text-center border border-nina-border">
            <div className="text-6xl mb-4">{showAchievementPopup.icon || '🏆'}</div>
            <h2 className="text-2xl font-bold text-star-gold mb-2">Achievement Unlocked!</h2>
            <h3 className="text-xl font-semibold text-nina-text-bright mb-2">{showAchievementPopup.name}</h3>
            <p className="text-nina-text mb-4">{showAchievementPopup.description}</p>
            <p className="text-nina-active mb-6">+{showAchievementPopup.xp_reward} XP</p>
            <button
              onClick={dismissAchievementPopup}
              className="px-6 py-2 bg-nina-primary rounded-lg hover:bg-nina-active transition text-nina-text-bright"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* Level Up Popup */}
      {showLevelUpPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-nina-elevated rounded-xl p-8 max-w-md text-center border border-nina-border">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-star-gold mb-2">Level Up!</h2>
            <div className="text-6xl font-bold text-nina-text-bright my-6">{newLevel}</div>
            <p className="text-nina-text mb-6">Congratulations on reaching a new level!</p>
            <button
              onClick={dismissLevelUpPopup}
              className="px-6 py-2 bg-nina-primary rounded-lg hover:bg-nina-active transition text-nina-text-bright"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Tutorial Overlay */}
      <TutorialOverlay
        tutorial={activeTutorial}
        onComplete={completeTutorial}
        onSkip={skipTutorial}
      />
    </div>
  );
}
