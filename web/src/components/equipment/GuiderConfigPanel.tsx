import { PanelChrome } from '../ui/PanelChrome';
import { Star } from 'lucide-react';
import { useDeviceStore } from '../../stores/deviceStore';
import { DeviceConnector } from './DeviceConnector';

export function GuiderConfigPanel() {
  const { devices, guide, connectDevice, disconnectDevice } = useDeviceStore();
  const gdr = devices.guider;

  return (
    <div className="space-y-3">
      <DeviceConnector
        deviceName={gdr.name}
        status={gdr.status}
        onConnect={() => connectDevice('guider')}
        onDisconnect={() => disconnectDevice('guider')}
      />

      <PanelChrome title="Guider Properties" icon={<Star size={12} />}>
        {gdr.status === 'connected' ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <PropRow label="Guide Camera" value="Virtual Guider" />
            <PropRow label="Exposure" value="2.0s" />
            <PropRow label="Guide Rate" value="0.5x" />
            {guide.isGuiding && (
              <>
                <PropRow label="RA RMS" value={`${guide.rmsRA.toFixed(2)}"`} />
                <PropRow label="Dec RMS" value={`${guide.rmsDec.toFixed(2)}"`} />
                <PropRow label="Total RMS" value={`${guide.totalRMS.toFixed(2)}"`} />
              </>
            )}
          </div>
        ) : (
          <div className="text-nina-text-dim text-sm py-4 text-center">
            Connect guider to view properties
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
