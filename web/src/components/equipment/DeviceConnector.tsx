import { RefreshCw, Settings, Plug, Unplug } from 'lucide-react';
import { clsx } from 'clsx';
import type { DeviceStatus } from '../../stores/deviceStore';

export function DeviceConnector({
  deviceName,
  status,
  onConnect,
  onDisconnect,
  onRefresh,
}: {
  deviceName: string;
  status: DeviceStatus;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh?: () => void;
}) {
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  return (
    <div className="flex items-center gap-2 p-2 bg-nina-elevated border border-nina-border rounded">
      {/* Device name / dropdown placeholder */}
      <div className="flex-1 flex items-center gap-2">
        <select
          className="flex-1 bg-nina-surface border border-nina-border rounded px-2 py-1.5 text-sm text-nina-text"
          defaultValue={deviceName}
        >
          <option>{deviceName}</option>
        </select>
      </div>

      {/* Refresh */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="p-1.5 rounded hover:bg-nina-surface transition-colors text-nina-text-dim hover:text-nina-text"
          title="Refresh devices"
        >
          <RefreshCw size={14} />
        </button>
      )}

      {/* Settings */}
      <button
        className="p-1.5 rounded hover:bg-nina-surface transition-colors text-nina-text-dim hover:text-nina-text"
        title="Device settings"
      >
        <Settings size={14} />
      </button>

      {/* Connect / Disconnect */}
      <button
        onClick={isConnected ? onDisconnect : onConnect}
        disabled={isConnecting}
        className={clsx(
          'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors',
          isConnected
            ? 'bg-error/20 text-error hover:bg-error/30'
            : isConnecting
            ? 'bg-warning/20 text-warning cursor-wait'
            : 'bg-nina-primary text-nina-text-bright hover:bg-nina-active'
        )}
      >
        {isConnected ? (
          <>
            <Unplug size={14} />
            Disconnect
          </>
        ) : isConnecting ? (
          <>
            <RefreshCw size={14} className="animate-spin" />
            Connecting
          </>
        ) : (
          <>
            <Plug size={14} />
            Connect
          </>
        )}
      </button>
    </div>
  );
}
