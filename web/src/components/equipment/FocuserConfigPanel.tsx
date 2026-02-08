import { PanelChrome } from '../ui/PanelChrome';
import { Focus } from 'lucide-react';
import { useDeviceStore } from '../../stores/deviceStore';
import { DeviceConnector } from './DeviceConnector';

export function FocuserConfigPanel() {
  const { devices, focus, connectDevice, disconnectDevice } = useDeviceStore();
  const foc = devices.focuser;

  return (
    <div className="space-y-3">
      <DeviceConnector
        deviceName={foc.name}
        status={foc.status}
        onConnect={() => connectDevice('focuser')}
        onDisconnect={() => disconnectDevice('focuser')}
      />

      <PanelChrome title="Focuser Properties" icon={<Focus size={12} />}>
        {foc.status === 'connected' ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <PropRow label="Position" value={String(focus.currentPosition)} />
            <PropRow label="Max Position" value="10000" />
            <PropRow label="Step Size" value="1 µm" />
            <PropRow label="Temperature" value="12.5°C" />
            <PropRow label="Temp Comp" value="Off" />
            {focus.bestPosition && (
              <PropRow label="Best Position" value={String(focus.bestPosition)} />
            )}
          </div>
        ) : (
          <div className="text-nina-text-dim text-sm py-4 text-center">
            Connect focuser to view properties
          </div>
        )}
      </PanelChrome>
    </div>
  );
}

function PropRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-nina-text-dim">{label}</span>
      <span className="text-nina-text-bright font-medium">{value}</span>
    </div>
  );
}
