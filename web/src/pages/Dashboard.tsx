// Dashboard / Home page

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { useSkyStore } from '../stores/skyStore';
import { SkyMap } from '../components/SkyMap';

export function Dashboard() {
  const { progress, availableChallenges, fetchProgress, fetchChallenges } = useGameStore();
  const {
    conditions,
    twilight,
    moon,
    sun,
    visibleObjects,
    suggestedTargets,
    selectedTarget,
    fetchAllSkyData,
    selectTarget,
  } = useSkyStore();

  useEffect(() => {
    fetchProgress();
    fetchChallenges();
    fetchAllSkyData();
  }, [fetchProgress, fetchChallenges, fetchAllSkyData]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-space-700 to-space-800 rounded-xl p-6">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome to Draco Simulator</h1>
        <p className="text-gray-300">
          Learn astrophotography through realistic simulation, then transition to real equipment.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player Progress Card */}
        <div className="bg-space-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span>📈</span> Your Progress
          </h2>
          {progress ? (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Level {progress.level}</span>
                  <span className="text-gray-400">
                    {progress.xp} / {progress.xp_to_next_level} XP
                  </span>
                </div>
                <div className="h-3 bg-space-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-nebula-blue to-nebula-purple"
                    style={{ width: `${(progress.xp / progress.xp_to_next_level) * 100}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-space-700 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-star-gold">
                    {progress.total_images}
                  </div>
                  <div className="text-xs text-gray-400">Images Captured</div>
                </div>
                <div className="bg-space-700 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-nebula-blue">
                    {Math.round(progress.total_exposure_time / 60)}m
                  </div>
                  <div className="text-xs text-gray-400">Total Exposure</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Achievements</span>
                <span className="text-white">
                  {progress.unlocked_achievements.length} unlocked (
                  {Math.round(progress.achievement_progress * 100)}%)
                </span>
              </div>
            </div>
          ) : (
            <div className="text-gray-400">Loading...</div>
          )}
        </div>

        {/* Sky Conditions Card */}
        <div className="bg-space-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span>🌙</span> Current Sky
          </h2>
          {conditions && twilight ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-space-700 rounded-lg p-3">
                  <div className="text-sm text-gray-400">Seeing</div>
                  <div className="text-lg font-medium text-white">
                    {conditions.seeing.toFixed(1)}"
                  </div>
                </div>
                <div className="bg-space-700 rounded-lg p-3">
                  <div className="text-sm text-gray-400">Transparency</div>
                  <div className="text-lg font-medium text-white">
                    {Math.round(conditions.transparency * 100)}%
                  </div>
                </div>
                <div className="bg-space-700 rounded-lg p-3">
                  <div className="text-sm text-gray-400">Cloud Cover</div>
                  <div className="text-lg font-medium text-white">
                    {Math.round(conditions.cloud_cover * 100)}%
                  </div>
                </div>
                <div className="bg-space-700 rounded-lg p-3">
                  <div className="text-sm text-gray-400">Bortle Class</div>
                  <div className="text-lg font-medium text-white">{conditions.bortle_class}</div>
                </div>
              </div>

              <div
                className={`flex items-center gap-2 p-3 rounded-lg ${
                  twilight.is_dark ? 'bg-green-900/30 text-success' : 'bg-yellow-900/30 text-warning'
                }`}
              >
                <span>{twilight.is_dark ? '🌙' : '☀️'}</span>
                <span>
                  {twilight.is_dark
                    ? `Dark for ${twilight.dark_hours_remaining.toFixed(1)} more hours`
                    : 'Waiting for darkness...'}
                </span>
              </div>

              {moon && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Moon</span>
                  <span className="text-white">
                    {moon.phase_name} ({Math.round(moon.illumination)}%)
                    {moon.is_up ? ' - Up' : ' - Down'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-400">Loading...</div>
          )}
        </div>

        {/* Quick Actions Card */}
        <div className="bg-space-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span>🚀</span> Quick Actions
          </h2>
          <div className="space-y-3">
            <Link
              to="/imaging"
              className="flex items-center gap-3 p-3 bg-space-700 rounded-lg hover:bg-space-600 transition"
            >
              <span className="text-2xl">📷</span>
              <div>
                <div className="font-medium text-white">Start Imaging</div>
                <div className="text-sm text-gray-400">Open the imaging interface</div>
              </div>
            </Link>
            <Link
              to="/challenges"
              className="flex items-center gap-3 p-3 bg-space-700 rounded-lg hover:bg-space-600 transition"
            >
              <span className="text-2xl">🎯</span>
              <div>
                <div className="font-medium text-white">View Challenges</div>
                <div className="text-sm text-gray-400">
                  {availableChallenges.length} challenges available
                </div>
              </div>
            </Link>
            <Link
              to="/store"
              className="flex items-center gap-3 p-3 bg-space-700 rounded-lg hover:bg-space-600 transition"
            >
              <span className="text-2xl">🛒</span>
              <div>
                <div className="font-medium text-white">Equipment Store</div>
                <div className="text-sm text-gray-400">Upgrade your gear</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Sky Map */}
      <div className="bg-space-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <span>🌌</span> Sky View
        </h2>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <SkyMap
              visibleObjects={visibleObjects}
              moon={moon}
              sun={sun}
              selectedTarget={selectedTarget}
              onSelectTarget={selectTarget}
              width={500}
              height={400}
            />
          </div>
          {selectedTarget && (
            <div className="lg:w-64 bg-space-700 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2">
                {selectedTarget.object.name || selectedTarget.object.id}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Type</span>
                  <span className="text-white capitalize">{selectedTarget.object.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Magnitude</span>
                  <span className="text-white">{selectedTarget.object.vmag.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Altitude</span>
                  <span className="text-white">{selectedTarget.visibility.coords.altitude.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Azimuth</span>
                  <span className="text-white">{selectedTarget.visibility.coords.azimuth.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Airmass</span>
                  <span className="text-white">{selectedTarget.visibility.airmass.toFixed(2)}</span>
                </div>
                {selectedTarget.object.size_major > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Size</span>
                    <span className="text-white">
                      {selectedTarget.object.size_major.toFixed(1)}' x {selectedTarget.object.size_minor.toFixed(1)}'
                    </span>
                  </div>
                )}
              </div>
              <Link
                to="/imaging"
                className="mt-4 block w-full py-2 bg-nebula-blue rounded-lg text-center text-sm font-medium hover:bg-opacity-80 transition"
              >
                Image This Target
              </Link>
            </div>
          )}
          {!selectedTarget && visibleObjects.length > 0 && (
            <div className="lg:w-64 bg-space-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm">
                Click on an object in the sky map to see details and start imaging.
              </p>
              <div className="mt-4 text-sm text-gray-500">
                {visibleObjects.length} objects currently visible
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suggested Targets */}
      <div className="bg-space-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <span>🎯</span> Suggested Targets Tonight
        </h2>
        {suggestedTargets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestedTargets.slice(0, 6).map((suggestion) => (
              <div
                key={suggestion.object.id}
                className="bg-space-700 rounded-lg p-4 hover:bg-space-600 transition cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-white">{suggestion.object.name || suggestion.object.id}</h3>
                  <span className="text-xs px-2 py-1 rounded bg-space-500">
                    {suggestion.object.type}
                  </span>
                </div>
                <div className="text-sm text-gray-400 mb-2">
                  Mag {suggestion.object.vmag.toFixed(1)} | Alt{' '}
                  {suggestion.visibility.coords.altitude.toFixed(0)}°
                </div>
                <div className="text-xs text-nebula-blue">{suggestion.reason}</div>
                <div className="mt-2 text-xs text-gray-500">
                  Score: {suggestion.score.toFixed(0)} | Window: {suggestion.window_hours.toFixed(1)}h
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400">Loading suggested targets...</div>
        )}
      </div>
    </div>
  );
}
