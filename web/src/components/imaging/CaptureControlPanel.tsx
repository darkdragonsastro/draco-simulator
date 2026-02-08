import { useState } from 'react';
import { Play, Square } from 'lucide-react';
import { PanelChrome } from '../ui/PanelChrome';
import { useDeviceStore } from '../../stores/deviceStore';

export function CaptureControlPanel() {
  const [exposure, setExposure] = useState(30);
  const [gain, setGain] = useState(100);
  const [binning, setBinning] = useState(1);
  const [frameCount, setFrameCount] = useState(1);

  const { devices, capture, startCapture, stopCapture } = useDeviceStore();
  const cameraConnected = devices.camera.status === 'connected';

  const handleStart = () => {
    if (!cameraConnected) return;
    startCapture(exposure, gain, binning, frameCount);
  };

  return (
    <PanelChrome title="Capture" icon={<Play size={12} />} className="h-full">
      <div className="space-y-3" data-tutorial="capture-controls">
        <div data-tutorial="exposure-slider">
          <label className="block text-xs text-nina-text-dim mb-1">Exposure: {exposure}s</label>
          <input
            type="range"
            min="1"
            max="300"
            value={exposure}
            onChange={(e) => setExposure(Number(e.target.value))}
            disabled={capture.isCapturing}
          />
        </div>

        <div data-tutorial="gain-slider">
          <label className="block text-xs text-nina-text-dim mb-1">Gain: {gain}</label>
          <input
            type="range"
            min="0"
            max="300"
            value={gain}
            onChange={(e) => setGain(Number(e.target.value))}
            disabled={capture.isCapturing}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-nina-text-dim mb-1">Binning</label>
            <select
              value={binning}
              onChange={(e) => setBinning(Number(e.target.value))}
              className="w-full bg-nina-bg border border-nina-border rounded px-2 py-1 text-sm text-nina-text"
              disabled={capture.isCapturing}
            >
              <option value={1}>1x1</option>
              <option value={2}>2x2</option>
              <option value={3}>3x3</option>
              <option value={4}>4x4</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-nina-text-dim mb-1">Frames</label>
            <input
              type="number"
              min="1"
              max="100"
              value={frameCount}
              onChange={(e) => setFrameCount(Number(e.target.value))}
              className="w-full bg-nina-bg border border-nina-border rounded px-2 py-1 text-sm text-nina-text"
              disabled={capture.isCapturing}
            />
          </div>
        </div>

        {capture.isCapturing ? (
          <button
            onClick={stopCapture}
            className="w-full flex items-center justify-center gap-2 py-2 bg-error/20 text-error rounded text-sm font-medium hover:bg-error/30 transition"
            data-tutorial="capture-button"
          >
            <Square size={14} /> Stop Capture
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={!cameraConnected}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded text-sm font-medium transition ${
              cameraConnected
                ? 'bg-nina-primary text-nina-text-bright hover:bg-nina-active'
                : 'bg-nina-border text-nina-text-dim cursor-not-allowed'
            }`}
            data-tutorial="capture-button"
          >
            <Play size={14} />
            {cameraConnected ? 'Start Capture' : 'Camera Not Connected'}
          </button>
        )}
      </div>
    </PanelChrome>
  );
}
