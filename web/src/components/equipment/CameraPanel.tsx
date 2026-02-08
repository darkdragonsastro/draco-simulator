import { PanelChrome } from '../ui/PanelChrome';
import { Camera } from 'lucide-react';
import { useDeviceStore } from '../../stores/deviceStore';
import { DeviceConnector } from './DeviceConnector';

export function CameraPanel() {
  const { devices, connectDevice, disconnectDevice } = useDeviceStore();
  const cam = devices.camera;

  return (
    <div className="space-y-3">
      <DeviceConnector
        deviceName={cam.name}
        status={cam.status}
        onConnect={() => connectDevice('camera')}
        onDisconnect={() => disconnectDevice('camera')}
      />

      <PanelChrome title="Camera Properties" icon={<Camera size={12} />}>
        {cam.status === 'connected' ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <PropRow label="Sensor" value="Mono CMOS" />
            <PropRow label="Resolution" value="4656 x 3520" />
            <PropRow label="Pixel Size" value="3.76 µm" />
            <PropRow label="Bit Depth" value="16-bit" />
            <PropRow label="Cooler" value="On (-10°C)" />
            <PropRow label="Gain" value="100" />
            <PropRow label="Offset" value="30" />
            <PropRow label="Binning" value="1x1" />
            <PropRow label="Sensor Temp" value="-10.2°C" />
            <PropRow label="USB Limit" value="80" />
          </div>
        ) : (
          <div className="text-nina-text-dim text-sm py-4 text-center">
            Connect camera to view properties
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
