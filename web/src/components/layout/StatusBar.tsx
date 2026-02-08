import {
  Camera,
  Telescope,
  Focus,
  Disc,
  Star,
  Coins,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { useDeviceStore } from '../../stores/deviceStore';
import { useGameStore } from '../../stores/gameStore';
import { DeviceStatusDot } from '../ui/DeviceStatusDot';

export function StatusBar() {
  const { devices, capture, focus, guide } = useDeviceStore();
  const { progress } = useGameStore();

  return (
    <div className="h-[30px] bg-nina-surface border-t border-nina-border flex items-center px-3 text-[11px] text-nina-text-dim gap-4 shrink-0 overflow-x-auto">
      {/* Device statuses */}
      <div className="flex items-center gap-3">
        <DeviceStatusItem icon={Camera} label="Cam" status={devices.camera.status} />
        <DeviceStatusItem icon={Telescope} label="Mount" status={devices.mount.status} />
        <DeviceStatusItem icon={Focus} label="Focus" status={devices.focuser.status} />
        <DeviceStatusItem icon={Disc} label="FW" status={devices.filter_wheel.status} />
        <DeviceStatusItem icon={Star} label="Guide" status={devices.guider.status} />
      </div>

      <div className="w-px h-4 bg-nina-border" />

      {/* Active operations */}
      <div className="flex items-center gap-3">
        {capture.isCapturing && (
          <div className="flex items-center gap-1.5 text-nina-active">
            <Activity size={11} className="animate-pulse" />
            <span>
              Capturing {capture.currentExposure}/{capture.totalExposures} ({Math.round(capture.progress)}%)
            </span>
          </div>
        )}
        {focus.isFocusing && (
          <div className="flex items-center gap-1.5 text-warning">
            <Focus size={11} className="animate-pulse" />
            <span>Focusing... pos {focus.currentPosition}</span>
          </div>
        )}
        {guide.isGuiding && (
          <div className="flex items-center gap-1.5 text-success">
            <Star size={11} />
            <span>Guiding RMS {guide.totalRMS.toFixed(2)}"</span>
          </div>
        )}
        {!capture.isCapturing && !focus.isFocusing && !guide.isGuiding && (
          <span className="text-nina-text-dim">Idle</span>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* XP / Credits / Level */}
      {progress && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <TrendingUp size={11} />
            <span>Lvl {progress.level}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-nina-active">{progress.xp}</span>
            <span>/ {progress.xp_to_next_level} XP</span>
          </div>
          <div className="flex items-center gap-1">
            <Coins size={11} className="text-star-gold" />
            <span className="text-star-gold">{progress.credits.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function DeviceStatusItem({
  icon: Icon,
  label,
  status,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  status: import('../../stores/deviceStore').DeviceStatus;
}) {
  return (
    <div className="flex items-center gap-1" title={`${label}: ${status}`}>
      <DeviceStatusDot status={status} size="sm" />
      <Icon size={11} />
      <span>{label}</span>
    </div>
  );
}
