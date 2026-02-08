import { Image } from 'lucide-react';
import { PanelChrome } from '../ui/PanelChrome';
import { useDeviceStore } from '../../stores/deviceStore';

export function ImageViewerPanel() {
  const { capture } = useDeviceStore();
  const lastImage = capture.lastImage;

  return (
    <PanelChrome title="Image" icon={<Image size={12} />} className="h-full" noPad>
      <div className="h-full bg-nina-bg flex items-center justify-center relative overflow-hidden">
        {capture.isCapturing ? (
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-nina-active border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-nina-text-bright text-sm mb-1">
              Capturing frame {capture.currentExposure} of {capture.totalExposures}
            </p>
            <div className="w-48 h-1.5 bg-nina-border rounded-full overflow-hidden mx-auto">
              <div
                className="h-full bg-nina-active transition-all"
                style={{ width: `${capture.progress}%` }}
              />
            </div>
            <p className="text-xs text-nina-text-dim mt-1">{Math.round(capture.progress)}%</p>
          </div>
        ) : lastImage ? (
          <div className="w-full h-full relative">
            {/* Simulated star field */}
            {Array.from({ length: lastImage.starCount || 50 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${1 + Math.random() * 3}px`,
                  height: `${1 + Math.random() * 3}px`,
                  opacity: 0.3 + Math.random() * 0.7,
                }}
              />
            ))}
            {/* Stats overlay */}
            <div className="absolute bottom-2 left-2 flex gap-2">
              <StatChip label="HFR" value={lastImage.hfr?.toFixed(2) ?? '--'} />
              <StatChip label="Stars" value={String(lastImage.starCount ?? '--')} />
              <StatChip label="ADU" value={lastImage.meanADU?.toLocaleString() ?? '--'} />
              <StatChip label="Score" value={String(lastImage.score ?? '--')} highlight={lastImage.score != null && lastImage.score > 80} />
            </div>
          </div>
        ) : (
          <div className="text-center text-nina-text-dim">
            <Image size={48} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No image captured yet</p>
          </div>
        )}
      </div>
    </PanelChrome>
  );
}

function StatChip({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-nina-bg/80 border border-nina-border px-2 py-0.5 rounded text-[10px]">
      <span className="text-nina-text-dim">{label} </span>
      <span className={highlight ? 'text-star-gold font-medium' : 'text-nina-text-bright'}>{value}</span>
    </div>
  );
}
