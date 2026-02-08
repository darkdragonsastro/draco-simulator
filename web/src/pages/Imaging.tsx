// Imaging page - main capture interface

import { useState, useEffect } from 'react';
import { useDeviceStore } from '../stores/deviceStore';
import type { DeviceStatus } from '../stores/deviceStore';

export function Imaging() {
  const [exposure, setExposure] = useState(30);
  const [gain, setGain] = useState(100);
  const [binning, setBinning] = useState(1);
  const [frameCount, setFrameCount] = useState(1);

  const {
    devices,
    capture,
    focus,
    guide,
    captureHistory,
    connectDevice,
    disconnectDevice,
    startCapture,
    stopCapture,
    startFocus,
    stopFocus,
    startGuiding,
    stopGuiding,
  } = useDeviceStore();

  const lastImage = capture.lastImage;
  const cameraConnected = devices.camera.status === 'connected';

  // Auto-connect devices on mount
  useEffect(() => {
    if (devices.camera.status === 'disconnected') {
      connectDevice('camera');
    }
    if (devices.mount.status === 'disconnected') {
      connectDevice('mount');
    }
    if (devices.focuser.status === 'disconnected') {
      connectDevice('focuser');
    }
  }, []);

  const handleStartCapture = () => {
    if (!cameraConnected) return;
    startCapture(exposure, gain, binning, frameCount);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Imaging Interface</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Image Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-space-800 rounded-xl p-4">
            <div className="aspect-[4/3] bg-space-900 rounded-lg flex items-center justify-center relative overflow-hidden">
              {capture.isCapturing ? (
                <div className="text-center">
                  <div className="text-6xl mb-4 animate-pulse">📷</div>
                  <p className="text-white mb-2">
                    Capturing frame {capture.currentExposure} of {capture.totalExposures}
                  </p>
                  <div className="w-64 h-3 bg-space-700 rounded-full overflow-hidden mx-auto">
                    <div
                      className="h-full bg-gradient-to-r from-nebula-blue to-nebula-purple transition-all"
                      style={{ width: `${capture.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    {Math.round(capture.progress)}% ({Math.round((capture.progress / 100) * exposure)}s / {exposure}s)
                  </p>
                </div>
              ) : lastImage ? (
                <div className="w-full h-full bg-gradient-to-br from-space-800 to-space-900 flex items-center justify-center">
                  {/* Simulated star field */}
                  <div className="relative w-full h-full">
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
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm text-gray-500 bg-space-900/80 px-3 py-1 rounded">
                        Simulated {lastImage.starCount} stars
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <div className="text-6xl mb-4">📷</div>
                  <p>No image captured yet</p>
                  <p className="text-sm">Start a capture to see your image here</p>
                </div>
              )}
            </div>

            {/* Image Stats */}
            <div className="mt-4 grid grid-cols-4 gap-4">
              <StatBox
                label="HFR"
                value={lastImage?.hfr?.toFixed(2) ?? '--'}
                unit="px"
                highlight={!!(lastImage && lastImage.hfr && lastImage.hfr < 2)}
              />
              <StatBox
                label="Stars"
                value={lastImage?.starCount?.toString() ?? '--'}
                highlight={!!(lastImage && lastImage.starCount && lastImage.starCount > 100)}
              />
              <StatBox
                label="Mean ADU"
                value={lastImage?.meanADU?.toLocaleString() ?? '--'}
              />
              <StatBox
                label="Score"
                value={lastImage?.score?.toString() ?? '--'}
                highlight={!!(lastImage && lastImage.score && lastImage.score > 80)}
                color="text-star-gold"
              />
            </div>
          </div>

          {/* Capture History */}
          {captureHistory.length > 0 && (
            <div className="bg-space-800 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Recent Captures</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {captureHistory.slice(0, 10).map((img) => (
                  <div
                    key={img.id}
                    className="flex-shrink-0 w-20 bg-space-700 rounded-lg p-2 text-center"
                  >
                    <div className="text-xs text-gray-400">{img.exposure}s</div>
                    <div className="text-sm font-medium text-white">
                      {img.score ?? '--'}
                    </div>
                    <div className="text-xs text-gray-500">HFR {img.hfr?.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Focus Panel */}
          {focus.isFocusing && (
            <div className="bg-space-800 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Autofocus</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-sm text-gray-400">Position: {focus.currentPosition}</div>
                  <div className="text-sm text-gray-400">
                    Samples: {focus.hfrValues.length}
                  </div>
                  {focus.bestPosition && (
                    <div className="text-sm text-success">
                      Best: {focus.bestPosition} (HFR{' '}
                      {focus.hfrValues
                        .find((v) => v.position === focus.bestPosition)
                        ?.hfr.toFixed(2)}
                      )
                    </div>
                  )}
                </div>
                <button
                  onClick={stopFocus}
                  className="px-4 py-2 bg-error/20 text-error rounded-lg hover:bg-error/30 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Guide Panel */}
          {guide.isGuiding && (
            <div className="bg-space-800 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Guiding</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-medium text-white">
                    {guide.rmsRA.toFixed(2)}"
                  </div>
                  <div className="text-xs text-gray-400">RA RMS</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-medium text-white">
                    {guide.rmsDec.toFixed(2)}"
                  </div>
                  <div className="text-xs text-gray-400">Dec RMS</div>
                </div>
                <div className="text-center">
                  <div
                    className={`text-lg font-medium ${
                      guide.totalRMS < 1 ? 'text-success' : guide.totalRMS < 2 ? 'text-warning' : 'text-error'
                    }`}
                  >
                    {guide.totalRMS.toFixed(2)}"
                  </div>
                  <div className="text-xs text-gray-400">Total RMS</div>
                </div>
              </div>
              <button
                onClick={stopGuiding}
                className="mt-3 w-full py-2 bg-error/20 text-error rounded-lg hover:bg-error/30 transition"
              >
                Stop Guiding
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Capture Settings */}
          <div className="bg-space-800 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Capture Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Exposure: {exposure}s
                </label>
                <input
                  type="range"
                  min="1"
                  max="300"
                  value={exposure}
                  onChange={(e) => setExposure(Number(e.target.value))}
                  className="w-full"
                  disabled={capture.isCapturing}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Gain: {gain}</label>
                <input
                  type="range"
                  min="0"
                  max="300"
                  value={gain}
                  onChange={(e) => setGain(Number(e.target.value))}
                  className="w-full"
                  disabled={capture.isCapturing}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Binning</label>
                  <select
                    value={binning}
                    onChange={(e) => setBinning(Number(e.target.value))}
                    className="w-full bg-space-700 border border-space-600 rounded-lg px-3 py-2 text-white"
                    disabled={capture.isCapturing}
                  >
                    <option value={1}>1x1</option>
                    <option value={2}>2x2</option>
                    <option value={3}>3x3</option>
                    <option value={4}>4x4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Frames</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={frameCount}
                    onChange={(e) => setFrameCount(Number(e.target.value))}
                    className="w-full bg-space-700 border border-space-600 rounded-lg px-3 py-2 text-white"
                    disabled={capture.isCapturing}
                  />
                </div>
              </div>

              {capture.isCapturing ? (
                <button
                  onClick={stopCapture}
                  className="w-full py-3 bg-error rounded-lg font-medium text-white hover:bg-opacity-80 transition"
                >
                  Stop Capture
                </button>
              ) : (
                <button
                  onClick={handleStartCapture}
                  disabled={!cameraConnected}
                  className={`w-full py-3 rounded-lg font-medium text-white transition ${
                    cameraConnected
                      ? 'bg-nebula-blue hover:bg-opacity-80'
                      : 'bg-gray-700 cursor-not-allowed'
                  }`}
                >
                  {cameraConnected ? 'Start Capture' : 'Camera Not Connected'}
                </button>
              )}
            </div>
          </div>

          {/* Equipment Status */}
          <div className="bg-space-800 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Equipment</h2>
            <div className="space-y-2">
              <EquipmentItem
                name="Camera"
                device={devices.camera}
                onConnect={() => connectDevice('camera')}
                onDisconnect={() => disconnectDevice('camera')}
              />
              <EquipmentItem
                name="Mount"
                device={devices.mount}
                onConnect={() => connectDevice('mount')}
                onDisconnect={() => disconnectDevice('mount')}
              />
              <EquipmentItem
                name="Focuser"
                device={devices.focuser}
                onConnect={() => connectDevice('focuser')}
                onDisconnect={() => disconnectDevice('focuser')}
              />
              <EquipmentItem
                name="Filter Wheel"
                device={devices.filter_wheel}
                onConnect={() => connectDevice('filter_wheel')}
                onDisconnect={() => disconnectDevice('filter_wheel')}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-space-800 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={focus.isFocusing ? stopFocus : startFocus}
                disabled={devices.focuser.status !== 'connected'}
                className={`py-2 rounded-lg text-sm transition ${
                  focus.isFocusing
                    ? 'bg-warning/20 text-warning'
                    : devices.focuser.status === 'connected'
                    ? 'bg-space-700 hover:bg-space-600'
                    : 'bg-space-700 opacity-50 cursor-not-allowed'
                }`}
              >
                {focus.isFocusing ? 'Focusing...' : 'Autofocus'}
              </button>
              <button
                disabled={devices.mount.status !== 'connected'}
                className={`py-2 rounded-lg text-sm transition ${
                  devices.mount.status === 'connected'
                    ? 'bg-space-700 hover:bg-space-600'
                    : 'bg-space-700 opacity-50 cursor-not-allowed'
                }`}
              >
                Center
              </button>
              <button
                onClick={guide.isGuiding ? stopGuiding : startGuiding}
                disabled={devices.mount.status !== 'connected'}
                className={`py-2 rounded-lg text-sm transition ${
                  guide.isGuiding
                    ? 'bg-success/20 text-success'
                    : devices.mount.status === 'connected'
                    ? 'bg-space-700 hover:bg-space-600'
                    : 'bg-space-700 opacity-50 cursor-not-allowed'
                }`}
              >
                {guide.isGuiding ? 'Guiding...' : 'Guide'}
              </button>
              <button
                disabled={devices.mount.status !== 'connected'}
                className={`py-2 rounded-lg text-sm transition ${
                  devices.mount.status === 'connected'
                    ? 'bg-space-700 hover:bg-space-600'
                    : 'bg-space-700 opacity-50 cursor-not-allowed'
                }`}
              >
                Plate Solve
              </button>
            </div>
          </div>

          {/* Focuser Position */}
          {devices.focuser.status === 'connected' && (
            <div className="bg-space-800 rounded-xl p-4">
              <h2 className="text-lg font-semibold text-white mb-4">Focuser</h2>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Position</span>
                <span className="text-white font-medium">{focus.currentPosition}</span>
              </div>
              {focus.bestPosition && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Best Position</span>
                  <span className="text-success">{focus.bestPosition}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  unit,
  highlight,
  color,
}: {
  label: string;
  value: string;
  unit?: string;
  highlight?: boolean;
  color?: string;
}) {
  return (
    <div className="bg-space-700 rounded-lg p-3 text-center">
      <div className="text-sm text-gray-400">{label}</div>
      <div className={`text-lg font-medium ${highlight ? 'text-success' : color || 'text-white'}`}>
        {value}
        {unit && <span className="text-xs text-gray-500 ml-1">{unit}</span>}
      </div>
    </div>
  );
}

function EquipmentItem({
  name,
  device,
  onConnect,
  onDisconnect,
}: {
  name: string;
  device: { status: DeviceStatus; name: string };
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const statusColors: Record<DeviceStatus, string> = {
    disconnected: 'bg-gray-600 text-gray-400',
    connecting: 'bg-warning/20 text-warning animate-pulse',
    connected: 'bg-success/20 text-success',
    error: 'bg-error/20 text-error',
  };

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-space-700 rounded-lg">
      <div>
        <span className="text-sm text-gray-300">{name}</span>
        <span className="text-xs text-gray-500 ml-2">({device.name})</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-1 rounded ${statusColors[device.status]}`}>
          {device.status}
        </span>
        {device.status === 'disconnected' && (
          <button
            onClick={onConnect}
            className="text-xs px-2 py-1 bg-nebula-blue/20 text-nebula-blue rounded hover:bg-nebula-blue/30 transition"
          >
            Connect
          </button>
        )}
        {device.status === 'connected' && (
          <button
            onClick={onDisconnect}
            className="text-xs px-2 py-1 bg-gray-600 text-gray-300 rounded hover:bg-gray-500 transition"
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}
