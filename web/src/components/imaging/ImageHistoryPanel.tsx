import { Images } from 'lucide-react';
import { PanelChrome } from '../ui/PanelChrome';
import { useDeviceStore } from '../../stores/deviceStore';

export function ImageHistoryPanel() {
  const { captureHistory } = useDeviceStore();

  return (
    <PanelChrome title="Image History" icon={<Images size={12} />} className="h-full">
      {captureHistory.length > 0 ? (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {captureHistory.slice(0, 15).map((img) => (
            <div
              key={img.id}
              className="flex-shrink-0 w-16 bg-nina-elevated rounded p-1.5 text-center border border-nina-border"
            >
              <div className="text-[10px] text-nina-text-dim">{img.exposure}s</div>
              <div className="text-xs font-medium text-nina-text-bright">{img.score ?? '--'}</div>
              <div className="text-[9px] text-nina-text-dim">
                HFR {img.hfr?.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-nina-text-dim text-center py-2">
          No captures yet
        </div>
      )}
    </PanelChrome>
  );
}
