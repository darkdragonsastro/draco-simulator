import { Camera, Telescope, Focus, Disc } from 'lucide-react';
import { PanelChrome } from '../ui/PanelChrome';
import { useDeviceStore } from '../../stores/deviceStore';
import { DeviceStatusDot } from '../ui/DeviceStatusDot';
import type { DeviceStatus } from '../../stores/deviceStore';

export function EquipmentStatusPanel() {
  const { devices, connectDevice, disconnectDevice } = useDeviceStore();

  return (
    <PanelChrome title="Equipment" icon={<Telescope size={12} />} className="h-full" data-tutorial="equipment-panel">
      <div className="space-y-1.5" data-tutorial="equipment-panel">
        <DeviceRow
          icon={Camera}
          name="Camera"
          detail={devices.camera.name}
          status={devices.camera.status}
          onConnect={() => connectDevice('camera')}
          onDisconnect={() => disconnectDevice('camera')}
        />
        <DeviceRow
          icon={Telescope}
          name="Mount"
          detail={devices.mount.name}
          status={devices.mount.status}
          onConnect={() => connectDevice('mount')}
          onDisconnect={() => disconnectDevice('mount')}
        />
        <DeviceRow
          icon={Focus}
          name="Focuser"
          detail={devices.focuser.name}
          status={devices.focuser.status}
          onConnect={() => connectDevice('focuser')}
          onDisconnect={() => disconnectDevice('focuser')}
        />
        <DeviceRow
          icon={Disc}
          name="Filter Wheel"
          detail={devices.filter_wheel.name}
          status={devices.filter_wheel.status}
          onConnect={() => connectDevice('filter_wheel')}
          onDisconnect={() => disconnectDevice('filter_wheel')}
        />
      </div>
    </PanelChrome>
  );
}

function DeviceRow({
  icon: Icon,
  name,
  detail,
  status,
  onConnect,
  onDisconnect,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  name: string;
  detail: string;
  status: DeviceStatus;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1 px-2 bg-nina-elevated rounded text-xs">
      <DeviceStatusDot status={status} />
      <Icon size={12} className="text-nina-text-dim shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-nina-text">{name}</span>
        <span className="text-nina-text-dim ml-1 truncate">({detail})</span>
      </div>
      {status === 'disconnected' && (
        <button onClick={onConnect} className="text-[10px] px-1.5 py-0.5 bg-nina-primary/20 text-nina-active rounded hover:bg-nina-primary/30">
          Connect
        </button>
      )}
      {status === 'connected' && (
        <button onClick={onDisconnect} className="text-[10px] px-1.5 py-0.5 text-nina-text-dim rounded hover:bg-nina-bg">
          Disconnect
        </button>
      )}
    </div>
  );
}
