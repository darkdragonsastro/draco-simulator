// Dashboard / Home page

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Cloud,
  Zap,
  Camera,
  Target,
  ShoppingCart,
  Moon,
  Sun,
  Telescope,
  Star,
} from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import { useSkyStore } from '../stores/skyStore';
import { useDSOImageStore } from '../stores/dsoImageStore';
import { Planetarium } from '../components/planetarium/Planetarium';
import { PanelChrome } from '../components/ui/PanelChrome';

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

  const dsoImageStore = useDSOImageStore();

  useEffect(() => {
    fetchProgress();
    fetchChallenges();
    fetchAllSkyData();
    dsoImageStore.fetchManifest();
  }, [fetchProgress, fetchChallenges, fetchAllSkyData]);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-nina-elevated to-nina-surface rounded border border-nina-border p-5">
        <h1 className="text-2xl font-bold text-nina-text-bright mb-1">Welcome to Draco Simulator</h1>
        <p className="text-nina-text-dim text-sm">
          Learn astrophotography through realistic simulation, then transition to real equipment.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Player Progress Card */}
        <PanelChrome title="Your Progress" icon={<TrendingUp size={12} />}>
          {progress ? (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-nina-text-dim">Level {progress.level}</span>
                  <span className="text-nina-text-dim">
                    {progress.xp} / {progress.xp_to_next_level} XP
                  </span>
                </div>
                <div className="h-2 bg-nina-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-nina-active transition-all"
                    style={{ width: `${(progress.xp / progress.xp_to_next_level) * 100}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-nina-elevated rounded p-2.5 text-center">
                  <div className="text-xl font-bold text-star-gold">{progress.total_images}</div>
                  <div className="text-[10px] text-nina-text-dim">Images Captured</div>
                </div>
                <div className="bg-nina-elevated rounded p-2.5 text-center">
                  <div className="text-xl font-bold text-nina-active">
                    {Math.round(progress.total_exposure_time / 60)}m
                  </div>
                  <div className="text-[10px] text-nina-text-dim">Total Exposure</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-nina-text-dim">Achievements</span>
                <span className="text-nina-text">
                  {progress.unlocked_achievements.length} ({Math.round(progress.achievement_progress * 100)}%)
                </span>
              </div>
            </div>
          ) : (
            <div className="text-nina-text-dim text-sm">Loading...</div>
          )}
        </PanelChrome>

        {/* Sky Conditions Card */}
        <PanelChrome title="Current Sky" icon={<Cloud size={12} />}>
          {conditions && twilight ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <ConditionBox label="Seeing" value={`${conditions.seeing.toFixed(1)}"`} />
                <ConditionBox label="Transparency" value={`${Math.round(conditions.transparency * 100)}%`} />
                <ConditionBox label="Cloud Cover" value={`${Math.round(conditions.cloud_cover * 100)}%`} />
                <ConditionBox label="Bortle" value={String(conditions.bortle_class)} />
              </div>

              <div
                className={`flex items-center gap-2 p-2 rounded text-xs ${
                  twilight.is_dark ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                }`}
              >
                {twilight.is_dark ? <Moon size={12} /> : <Sun size={12} />}
                <span>
                  {twilight.is_dark
                    ? `Dark for ${twilight.dark_hours_remaining.toFixed(1)} more hours`
                    : 'Waiting for darkness...'}
                </span>
              </div>

              {moon && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-nina-text-dim">Moon</span>
                  <span className="text-nina-text">
                    {moon.phase_name} ({Math.round(moon.illumination)}%)
                    {moon.is_up ? ' - Up' : ' - Down'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-nina-text-dim text-sm">Loading...</div>
          )}
        </PanelChrome>

        {/* Quick Actions Card */}
        <PanelChrome title="Quick Actions" icon={<Zap size={12} />}>
          <div className="space-y-2">
            <QuickAction icon={Camera} label="Start Imaging" desc="Open the imaging interface" to="/imaging" />
            <QuickAction
              icon={Target}
              label="View Challenges"
              desc={`${availableChallenges.length} challenges available`}
              to="/challenges"
            />
            <QuickAction icon={ShoppingCart} label="Equipment Store" desc="Upgrade your gear" to="/store" />
          </div>
        </PanelChrome>
      </div>

      {/* Sky Map */}
      <PanelChrome title="Sky View" icon={<Telescope size={12} />}>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <Planetarium
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
            <div className="lg:w-56 bg-nina-elevated rounded p-3 border border-nina-border">
              {(() => {
                const manifestEntry = dsoImageStore.getImageData(selectedTarget.object.id);
                const thumbUrl = manifestEntry?.thumbUrl
                  ?? (selectedTarget.object.image_url
                    ? selectedTarget.object.image_url.replace('.jpg', '-thumb.jpg')
                    : undefined);
                const credit = manifestEntry?.credit ?? selectedTarget.object.image_credit;
                return thumbUrl ? (
                  <div className="mb-2">
                    <img
                      src={thumbUrl}
                      alt={selectedTarget.object.name || selectedTarget.object.id}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    {credit && (
                      <div className="text-[8px] text-nina-text-dim mt-0.5 text-right">
                        Image: {credit}
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
              <h3 className="font-medium text-nina-text-bright text-sm mb-2">
                {selectedTarget.object.name || selectedTarget.object.id}
              </h3>
              <div className="space-y-1.5 text-xs">
                <InfoRow label="Type" value={selectedTarget.object.type} />
                <InfoRow label="Magnitude" value={selectedTarget.object.vmag.toFixed(1)} />
                <InfoRow label="Altitude" value={`${selectedTarget.visibility.coords.altitude.toFixed(1)}°`} />
                <InfoRow label="Azimuth" value={`${selectedTarget.visibility.coords.azimuth.toFixed(1)}°`} />
                <InfoRow label="Airmass" value={selectedTarget.visibility.airmass.toFixed(2)} />
                {selectedTarget.object.size_major > 0 && (
                  <InfoRow
                    label="Size"
                    value={`${selectedTarget.object.size_major.toFixed(1)}' x ${selectedTarget.object.size_minor.toFixed(1)}'`}
                  />
                )}
              </div>
              <Link
                to="/imaging"
                className="mt-3 block w-full py-1.5 bg-nina-primary rounded text-center text-xs font-medium text-nina-text-bright hover:bg-nina-active transition"
              >
                Image This Target
              </Link>
            </div>
          )}
          {!selectedTarget && visibleObjects.length > 0 && (
            <div className="lg:w-56 bg-nina-elevated rounded p-3 border border-nina-border">
              <p className="text-nina-text-dim text-xs">
                Click on an object in the sky map to see details and start imaging.
              </p>
              <div className="mt-2 text-xs text-nina-text-dim">
                {visibleObjects.length} objects currently visible
              </div>
            </div>
          )}
        </div>
      </PanelChrome>

      {/* Suggested Targets */}
      <PanelChrome title="Suggested Targets Tonight" icon={<Star size={12} />}>
        {suggestedTargets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggestedTargets.slice(0, 6).map((suggestion) => (
              <div
                key={suggestion.object.id}
                className="bg-nina-elevated rounded overflow-hidden hover:bg-nina-border/50 transition cursor-pointer border border-nina-border"
              >
                {(() => {
                  const entry = dsoImageStore.getImageData(suggestion.object.id);
                  const thumbSrc = entry?.thumbUrl
                    ?? (suggestion.object.image_url
                      ? suggestion.object.image_url.replace('.jpg', '-thumb.jpg')
                      : undefined);
                  return thumbSrc ? (
                    <img
                      src={thumbSrc}
                      alt={suggestion.object.name || suggestion.object.id}
                      className="w-full h-20 object-cover"
                    />
                  ) : null;
                })()}
                <div className="p-3">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-nina-text-bright text-sm">
                      {suggestion.object.name || suggestion.object.id}
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-nina-surface text-nina-text-dim">
                      {suggestion.object.type}
                    </span>
                  </div>
                  <div className="text-xs text-nina-text-dim mb-1">
                    Mag {suggestion.object.vmag.toFixed(1)} | Alt{' '}
                    {suggestion.visibility.coords.altitude.toFixed(0)}°
                  </div>
                  <div className="text-[10px] text-nina-active">{suggestion.reason}</div>
                  <div className="mt-1 text-[10px] text-nina-text-dim">
                    Score: {suggestion.score.toFixed(0)} | Window: {suggestion.window_hours.toFixed(1)}h
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-nina-text-dim text-sm">Loading suggested targets...</div>
        )}
      </PanelChrome>
    </div>
  );
}

function ConditionBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-nina-elevated rounded p-2">
      <div className="text-[10px] text-nina-text-dim">{label}</div>
      <div className="text-sm font-medium text-nina-text-bright">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-nina-text-dim">{label}</span>
      <span className="text-nina-text capitalize">{value}</span>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  desc,
  to,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  desc: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 p-2.5 bg-nina-elevated rounded hover:bg-nina-border/50 transition border border-nina-border"
    >
      <Icon size={18} className="text-nina-active shrink-0" />
      <div>
        <div className="text-sm font-medium text-nina-text-bright">{label}</div>
        <div className="text-[10px] text-nina-text-dim">{desc}</div>
      </div>
    </Link>
  );
}
