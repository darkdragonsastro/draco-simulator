// Main layout component with navigation

import { Link, Outlet, useLocation } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { useTutorialStore } from '../stores/tutorialStore';
import { TutorialOverlay } from './TutorialOverlay';
import { useEffect } from 'react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '🏠' },
  { path: '/imaging', label: 'Imaging', icon: '📷' },
  { path: '/challenges', label: 'Challenges', icon: '🎯' },
  { path: '/store', label: 'Store', icon: '🛒' },
  { path: '/progress', label: 'Progress', icon: '📈' },
  { path: '/equipment', label: 'Equipment', icon: '🔭' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Layout() {
  const location = useLocation();
  const { progress, fetchProgress } = useGameStore();
  const { activeTutorial, completeTutorial, skipTutorial, startTutorial, isCompleted } = useTutorialStore();

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <header className="bg-space-800 border-b border-space-600 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🐉</span>
            <span className="text-xl font-bold text-white">Draco Simulator</span>
          </Link>

          {/* Player Stats */}
          {progress && (
            <div className="flex items-center gap-6">
              {/* Level */}
              <div className="flex items-center gap-2">
                <span className="text-star-gold">⭐</span>
                <span className="text-sm">
                  Level {progress.level}
                </span>
              </div>

              {/* XP Bar */}
              <div className="w-32">
                <div className="text-xs text-gray-400 mb-1">
                  {progress.xp} / {progress.xp_to_next_level} XP
                </div>
                <div className="h-2 bg-space-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-nebula-blue to-nebula-purple transition-all"
                    style={{
                      width: `${(progress.xp / progress.xp_to_next_level) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Credits */}
              <div className="flex items-center gap-2">
                <span className="text-star-gold">💰</span>
                <span className="text-sm font-medium">
                  {progress.credits.toLocaleString()}
                </span>
              </div>

              {/* Tier Badge */}
              <div className="px-2 py-1 rounded text-xs font-medium bg-space-600">
                {progress.tier}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1">
        {/* Side Navigation */}
        <nav className="w-56 bg-space-800 border-r border-space-600 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-space-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-space-700'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Tutorial Section */}
          <div className="mt-8 pt-4 border-t border-space-600">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 px-4">
              Tutorials
            </div>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => startTutorial('firstLight')}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left transition-colors ${
                    isCompleted('first-light')
                      ? 'text-gray-500'
                      : 'text-gray-400 hover:text-white hover:bg-space-700'
                  }`}
                >
                  <span>📷</span>
                  <span>First Light</span>
                  {isCompleted('first-light') && <span className="ml-auto text-success">✓</span>}
                </button>
              </li>
              <li>
                <button
                  onClick={() => startTutorial('autofocus')}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left transition-colors ${
                    isCompleted('autofocus')
                      ? 'text-gray-500'
                      : 'text-gray-400 hover:text-white hover:bg-space-700'
                  }`}
                >
                  <span>🔭</span>
                  <span>Autofocus</span>
                  {isCompleted('autofocus') && <span className="ml-auto text-success">✓</span>}
                </button>
              </li>
              <li>
                <button
                  onClick={() => startTutorial('guiding')}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left transition-colors ${
                    isCompleted('guiding')
                      ? 'text-gray-500'
                      : 'text-gray-400 hover:text-white hover:bg-space-700'
                  }`}
                >
                  <span>⭐</span>
                  <span>Guiding</span>
                  {isCompleted('guiding') && <span className="ml-auto text-success">✓</span>}
                </button>
              </li>
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Achievement Popup */}
      <AchievementPopup />
      <LevelUpPopup />

      {/* Tutorial Overlay */}
      <TutorialOverlay
        tutorial={activeTutorial}
        onComplete={completeTutorial}
        onSkip={skipTutorial}
      />
    </div>
  );
}

function AchievementPopup() {
  const { showAchievementPopup, dismissAchievementPopup } = useGameStore();

  if (!showAchievementPopup) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-space-700 rounded-xl p-8 max-w-md text-center animate-bounce-in">
        <div className="text-6xl mb-4">{showAchievementPopup.icon || '🏆'}</div>
        <h2 className="text-2xl font-bold text-star-gold mb-2">Achievement Unlocked!</h2>
        <h3 className="text-xl font-semibold text-white mb-2">{showAchievementPopup.name}</h3>
        <p className="text-gray-300 mb-4">{showAchievementPopup.description}</p>
        <p className="text-nebula-blue mb-6">+{showAchievementPopup.xp_reward} XP</p>
        <button
          onClick={dismissAchievementPopup}
          className="px-6 py-2 bg-nebula-purple rounded-lg hover:bg-opacity-80 transition"
        >
          Awesome!
        </button>
      </div>
    </div>
  );
}

function LevelUpPopup() {
  const { showLevelUpPopup, newLevel, dismissLevelUpPopup } = useGameStore();

  if (!showLevelUpPopup) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-space-700 rounded-xl p-8 max-w-md text-center animate-bounce-in">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-star-gold mb-2">Level Up!</h2>
        <div className="text-6xl font-bold text-white my-6">{newLevel}</div>
        <p className="text-gray-300 mb-6">Congratulations on reaching a new level!</p>
        <button
          onClick={dismissLevelUpPopup}
          className="px-6 py-2 bg-nebula-purple rounded-lg hover:bg-opacity-80 transition"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
