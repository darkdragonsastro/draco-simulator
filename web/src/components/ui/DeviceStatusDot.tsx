import type { DeviceStatus } from '../../stores/deviceStore';
import { clsx } from 'clsx';

const statusConfig: Record<DeviceStatus, { color: string; pulse: boolean }> = {
  disconnected: { color: 'bg-gray-600', pulse: false },
  connecting: { color: 'bg-warning', pulse: true },
  connected: { color: 'bg-success', pulse: false },
  error: { color: 'bg-error', pulse: false },
};

export function DeviceStatusDot({
  status,
  size = 'sm',
}: {
  status: DeviceStatus;
  size?: 'sm' | 'md';
}) {
  const cfg = statusConfig[status];
  return (
    <span
      className={clsx(
        'inline-block rounded-full',
        cfg.color,
        cfg.pulse && 'animate-pulse',
        size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'
      )}
    />
  );
}
