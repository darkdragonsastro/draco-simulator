import { PanelChrome } from '../ui/PanelChrome';
import { Disc } from 'lucide-react';
import { useDeviceStore } from '../../stores/deviceStore';
import { DeviceConnector } from './DeviceConnector';

export function FilterWheelPanel() {
  const { devices, connectDevice, disconnectDevice } = useDeviceStore();
  const fw = devices.filter_wheel;

  const filters = ['L', 'R', 'G', 'B', 'Ha', 'OIII', 'SII'];

  return (
    <div className="space-y-3">
      <DeviceConnector
        deviceName={fw.name}
        status={fw.status}
        onConnect={() => connectDevice('filter_wheel')}
        onDisconnect={() => disconnectDevice('filter_wheel')}
      />

      <PanelChrome title="Filter Wheel" icon={<Disc size={12} />}>
        {fw.status === 'connected' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <PropRow label="Current Filter" value="L (Luminance)" />
              <PropRow label="Position" value="1 / 7" />
            </div>
            <div>
              <div className="text-xs text-nina-text-dim mb-2">Filter Slots</div>
              <div className="flex flex-wrap gap-1.5">
                {filters.map((f, i) => (
                  <button
                    key={f}
                    className={`px-2.5 py-1 text-xs rounded transition-colors ${
                      i === 0
                        ? 'bg-nina-primary text-nina-text-bright'
                        : 'bg-nina-surface text-nina-text-dim hover:bg-nina-elevated'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-nina-text-dim text-sm py-4 text-center">
            Connect filter wheel to view properties
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
