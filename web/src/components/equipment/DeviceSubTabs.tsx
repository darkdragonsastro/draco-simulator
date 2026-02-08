import { clsx } from 'clsx';
import {
  Camera,
  Disc,
  Focus,
  Telescope,
  Star,
  RotateCw,
  User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useDeviceStore } from '../../stores/deviceStore';
import { DeviceStatusDot } from '../ui/DeviceStatusDot';
import type { DeviceStatus } from '../../stores/deviceStore';

export type EquipmentTab = 'camera' | 'filter_wheel' | 'focuser' | 'mount' | 'guider' | 'rotator' | 'profiles';

interface TabDef {
  id: EquipmentTab;
  label: string;
  icon: LucideIcon;
  deviceKey?: 'camera' | 'mount' | 'focuser' | 'filter_wheel' | 'guider';
}

const tabs: TabDef[] = [
  { id: 'camera', label: 'Camera', icon: Camera, deviceKey: 'camera' },
  { id: 'filter_wheel', label: 'Filter Wheel', icon: Disc, deviceKey: 'filter_wheel' },
  { id: 'focuser', label: 'Focuser', icon: Focus, deviceKey: 'focuser' },
  { id: 'mount', label: 'Mount', icon: Telescope, deviceKey: 'mount' },
  { id: 'guider', label: 'Guider', icon: Star, deviceKey: 'guider' },
  { id: 'rotator', label: 'Rotator', icon: RotateCw },
  { id: 'profiles', label: 'Profiles', icon: User },
];

export function DeviceSubTabs({
  active,
  onChange,
}: {
  active: EquipmentTab;
  onChange: (tab: EquipmentTab) => void;
}) {
  const { devices } = useDeviceStore();

  return (
    <div className="w-[52px] flex flex-col bg-nina-surface border-r border-nina-border shrink-0">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        const Icon = tab.icon;
        const status: DeviceStatus | undefined = tab.deviceKey
          ? devices[tab.deviceKey].status
          : undefined;

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            title={tab.label}
            className={clsx(
              'relative flex flex-col items-center justify-center py-3 px-1 transition-colors',
              isActive
                ? 'bg-nina-primary text-nina-text-bright'
                : 'text-nina-text-dim hover:text-nina-text hover:bg-nina-elevated'
            )}
          >
            <Icon size={18} />
            <span className="text-[8px] mt-0.5 leading-tight">{tab.label.split(' ')[0]}</span>
            {status && (
              <div className="absolute top-1.5 right-1.5">
                <DeviceStatusDot status={status} size="sm" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
