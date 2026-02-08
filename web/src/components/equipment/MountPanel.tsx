import { useState, useEffect } from 'react';
import { PanelChrome } from '../ui/PanelChrome';
import {
  Telescope,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Square,
  Crosshair,
  ParkingCircle,
  Map,
} from 'lucide-react';
import { useMountStore } from '../../stores/mountStore';
import { useSkyStore } from '../../stores/skyStore';
import { DeviceConnector } from './DeviceConnector';
import { TelescopeMount3D } from './TelescopeMount3D';
import { Planetarium } from '../planetarium/Planetarium';
import { formatRA, formatDec, formatDeg, formatHA, parseRA, parseDec } from '../../utils/coordinates';
import type { TrackingMode, VisibleObject } from '../../api/client';

export function MountPanel() {
  const { status, jogRate, setJogRate, connect, disconnect, slewTo, stopSlew, setTracking, jog, park, unpark } =
    useMountStore();
  const { visibleObjects, moon, sun, fetchVisibleObjects, fetchCelestialBodies } = useSkyStore();

  const [targetRAInput, setTargetRAInput] = useState('');
  const [targetDecInput, setTargetDecInput] = useState('');
  const [slewError, setSlewError] = useState('');
  const [skyMapTarget, setSkyMapTarget] = useState<VisibleObject | null>(null);

  const connected = status.connected;

  // Fetch visible objects when mount connects
  useEffect(() => {
    if (connected) {
      fetchVisibleObjects();
      fetchCelestialBodies();
    }
  }, [connected, fetchVisibleObjects, fetchCelestialBodies]);

  const handleSlew = async () => {
    setSlewError('');
    const ra = parseRA(targetRAInput);
    const dec = parseDec(targetDecInput);
    if (ra === null || dec === null) {
      setSlewError('Invalid RA or Dec format');
      return;
    }
    try {
      await slewTo(ra, dec);
    } catch {
      setSlewError('Slew failed');
    }
  };

  const handleSkyMapSelect = (target: VisibleObject) => {
    setSkyMapTarget(target);
    // Auto-fill RA/Dec slew inputs
    setTargetRAInput(formatRA(target.object.ra));
    setTargetDecInput(formatDec(target.object.dec));
  };

  const handleSkyMapSlew = async (ra: number, dec: number) => {
    setSlewError('');
    try {
      await slewTo(ra, dec);
    } catch {
      setSlewError('Slew failed');
    }
  };

  const connStatus = connected ? 'connected' : 'disconnected';

  return (
    <div className="space-y-3">
      <DeviceConnector
        deviceName="Virtual Mount"
        status={connStatus}
        onConnect={connect}
        onDisconnect={disconnect}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* 3D View */}
        <PanelChrome title="3D View" icon={<Telescope size={12} />} noPad>
          <TelescopeMount3D />
        </PanelChrome>

        {/* Properties */}
        <PanelChrome title="Mount Properties" icon={<Telescope size={12} />}>
          {connected ? (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <PropRow label="RA" value={formatRA(status.ra)} />
              <PropRow label="Dec" value={formatDec(status.dec)} />
              <PropRow label="Alt" value={formatDeg(status.alt)} />
              <PropRow label="Az" value={formatDeg(status.az)} />
              <PropRow label="Hour Angle" value={formatHA(status.hour_angle)} />
              <PropRow label="LST" value={formatRA(status.lst)} />
              <PropRow label="Pier Side" value={status.pier_side} />
              <PropRow label="Tracking" value={status.tracking_mode} />
              <PropRow
                label="Status"
                value={status.is_parked ? 'Parked' : status.is_slewing ? 'Slewing' : status.is_tracking ? 'Tracking' : 'Idle'}
              />
            </div>
          ) : (
            <div className="text-nina-text-dim text-sm py-4 text-center">
              Connect mount to view properties
            </div>
          )}
        </PanelChrome>
      </div>

      {/* Sky Map - always show when connected */}
      {connected && (
        <PanelChrome title="Sky Map" icon={<Map size={12} />} noPad>
          <Planetarium
            visibleObjects={visibleObjects}
            moon={moon}
            sun={sun}
            selectedTarget={skyMapTarget}
            onSelectTarget={handleSkyMapSelect}
            width={600}
            height={300}
            mountAlt={status.alt}
            mountAz={status.az}
            isSlewing={status.is_slewing}
            showReticle={true}
            onSlewToTarget={status.is_parked ? undefined : handleSkyMapSlew}
          />
        </PanelChrome>
      )}

      {connected && (
        <>
          {/* Slew Controls */}
          <PanelChrome title="Slew Controls" icon={<Crosshair size={12} />}>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[120px]">
                <label className="block text-xs text-nina-text-dim mb-1">Target RA</label>
                <input
                  type="text"
                  placeholder="e.g. 14h 23m 12s"
                  value={targetRAInput}
                  onChange={(e) => setTargetRAInput(e.target.value)}
                  className="w-full bg-nina-surface border border-nina-border rounded px-2 py-1.5 text-sm text-nina-text"
                />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="block text-xs text-nina-text-dim mb-1">Target Dec</label>
                <input
                  type="text"
                  placeholder="e.g. +27 12 45"
                  value={targetDecInput}
                  onChange={(e) => setTargetDecInput(e.target.value)}
                  className="w-full bg-nina-surface border border-nina-border rounded px-2 py-1.5 text-sm text-nina-text"
                />
              </div>
              <button
                onClick={handleSlew}
                disabled={status.is_parked}
                className="px-4 py-1.5 bg-nina-primary text-nina-text-bright rounded text-sm font-medium hover:bg-nina-active disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Go To
              </button>
              <button
                onClick={stopSlew}
                className="px-4 py-1.5 bg-error/20 text-error rounded text-sm font-medium hover:bg-error/30"
              >
                <Square size={14} />
              </button>
            </div>
            {slewError && (
              <p className="text-error text-xs mt-1">{slewError}</p>
            )}
          </PanelChrome>

          {/* Jog + Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Jog Pad */}
            <PanelChrome title="Jog Pad" icon={<Crosshair size={12} />}>
              <div className="flex flex-col items-center gap-1">
                <JogButton direction="north" icon={<ChevronUp size={18} />} onClick={() => jog('north')} disabled={status.is_parked} />
                <div className="flex gap-1">
                  <JogButton direction="west" icon={<ChevronLeft size={18} />} onClick={() => jog('west')} disabled={status.is_parked} />
                  <div className="w-9 h-9 flex items-center justify-center text-nina-text-dim text-xs">+</div>
                  <JogButton direction="east" icon={<ChevronRight size={18} />} onClick={() => jog('east')} disabled={status.is_parked} />
                </div>
                <JogButton direction="south" icon={<ChevronDown size={18} />} onClick={() => jog('south')} disabled={status.is_parked} />
                <div className="flex gap-1 mt-2">
                  {[1, 2, 4, 8].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setJogRate(rate)}
                      className={`px-2 py-1 text-xs rounded border ${
                        jogRate === rate
                          ? 'bg-nina-primary border-nina-active text-nina-text-bright'
                          : 'bg-nina-surface border-nina-border text-nina-text-dim hover:text-nina-text'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            </PanelChrome>

            {/* Actions */}
            <PanelChrome title="Actions" icon={<Telescope size={12} />}>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-nina-text-dim mb-1">Tracking</label>
                  <div className="flex gap-1">
                    {(['off', 'sidereal', 'lunar', 'solar'] as TrackingMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setTracking(mode)}
                        disabled={status.is_parked}
                        className={`flex-1 px-2 py-1.5 text-xs rounded border capitalize ${
                          status.tracking_mode === mode
                            ? 'bg-nina-primary border-nina-active text-nina-text-bright'
                            : 'bg-nina-surface border-nina-border text-nina-text-dim hover:text-nina-text disabled:opacity-50'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={status.is_parked ? unpark : park}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-nina-surface border border-nina-border rounded text-sm text-nina-text-dim hover:text-nina-text"
                  >
                    <ParkingCircle size={14} />
                    {status.is_parked ? 'Unpark' : 'Park'}
                  </button>
                </div>
              </div>
            </PanelChrome>
          </div>
        </>
      )}
    </div>
  );
}

function PropRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-nina-text-dim">{label}</span>
      <span className="text-nina-text-bright font-medium capitalize">{value}</span>
    </div>
  );
}

function JogButton({
  icon,
  onClick,
  disabled,
}: {
  direction: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-9 h-9 flex items-center justify-center bg-nina-surface border border-nina-border rounded hover:bg-nina-elevated text-nina-text-dim hover:text-nina-text disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {icon}
    </button>
  );
}
