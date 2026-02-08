// Hover tooltip for celestial objects in the planetarium

interface PlanetariumTooltipProps {
  name: string;
  type?: string;
  magnitude?: number;
  ra?: number;
  dec?: number;
  altitude?: number;
  azimuth?: number;
  x: number;
  y: number;
  containerWidth: number;
  containerHeight: number;
}

export function PlanetariumTooltip({
  name,
  type,
  magnitude,
  ra,
  dec,
  altitude,
  azimuth,
  x,
  y,
  containerWidth,
  containerHeight,
}: PlanetariumTooltipProps) {
  // Position tooltip to avoid going off-screen
  const left = Math.min(x + 15, containerWidth - 180);
  const top = Math.min(y + 15, containerHeight - 100);

  return (
    <div
      className="absolute pointer-events-none bg-nina-elevated/95 backdrop-blur-sm rounded p-2.5 shadow-lg border border-nina-border z-20"
      style={{ left, top }}
    >
      <div className="font-medium text-nina-text-bright text-sm">{name}</div>
      {type && (
        <div className="text-[10px] text-nina-text-dim capitalize">{type}</div>
      )}
      <div className="text-[10px] text-nina-text-dim mt-0.5 space-y-0.5">
        {magnitude != null && <div>Mag: {magnitude.toFixed(1)}</div>}
        {ra != null && dec != null && (
          <div>
            RA: {(ra / 15).toFixed(2)}h Dec: {dec >= 0 ? '+' : ''}{dec.toFixed(1)}°
          </div>
        )}
        {altitude != null && azimuth != null && (
          <div>
            Alt: {altitude.toFixed(1)}° Az: {azimuth.toFixed(1)}°
          </div>
        )}
      </div>
    </div>
  );
}
