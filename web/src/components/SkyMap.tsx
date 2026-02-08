// Interactive Sky Map visualization component with pan/zoom and telescope reticle

import { useEffect, useRef, useState, useCallback } from 'react';
import type { VisibleObject, MoonInfo, SunInfo } from '../api/client';

interface SkyMapProps {
  visibleObjects: VisibleObject[];
  moon?: MoonInfo | null;
  sun?: SunInfo | null;
  selectedTarget?: VisibleObject | null;
  onSelectTarget?: (target: VisibleObject) => void;
  width?: number;
  height?: number;
  showGrid?: boolean;
  showLabels?: boolean;
  // Mount integration (optional - backward compatible)
  mountAlt?: number;
  mountAz?: number;
  isSlewing?: boolean;
  showReticle?: boolean;
  onSlewToTarget?: (ra: number, dec: number) => void;
}

export function SkyMap({
  visibleObjects,
  moon,
  sun,
  selectedTarget,
  onSelectTarget,
  width = 600,
  height = 400,
  showGrid = true,
  showLabels = true,
  mountAlt,
  mountAz,
  isSlewing = false,
  showReticle = false,
  onSlewToTarget,
}: SkyMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredObject, setHoveredObject] = useState<VisibleObject | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Viewport state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOffsetStart = useRef({ x: 0, y: 0 });

  // Animation frame ref for reticle pulse
  const animFrameRef = useRef<number>(0);

  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) / 2 - 20;

  // Viewport-aware projection
  const altAzToXY = useCallback(
    (alt: number, az: number) => {
      const r = ((90 - alt) / 90) * maxRadius * zoom;
      const theta = ((az - 90) * Math.PI) / 180;
      return {
        x: centerX + r * Math.cos(theta) + panOffset.x,
        y: centerY + r * Math.sin(theta) + panOffset.y,
      };
    },
    [centerX, centerY, maxRadius, zoom, panOffset]
  );

  // Find object at canvas position
  const findObjectAtPos = useCallback(
    (x: number, y: number): VisibleObject | null => {
      const hitRadius = 15 / Math.sqrt(zoom); // Scale hit zone with zoom
      for (const obj of visibleObjects) {
        const pos = altAzToXY(obj.visibility.coords.altitude, obj.visibility.coords.azimuth);
        const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
        if (dist < Math.max(hitRadius, 8)) return obj;
      }
      return null;
    },
    [visibleObjects, altAzToXY, zoom]
  );

  // Draw the sky map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const draw = (timestamp: number) => {
      if (!running) return;

      // Clear canvas
      ctx.fillStyle = '#263238';
      ctx.fillRect(0, 0, width, height);

      // Clip to canvas
      ctx.save();

      // --- Grid ---
      if (showGrid) {
        // Altitude circles
        const altStep = zoom >= 2.5 ? 10 : 30;
        ctx.strokeStyle = '#37474F';
        ctx.lineWidth = 1;
        for (let alt = 0; alt <= 90; alt += altStep) {
          const r = ((90 - alt) / 90) * maxRadius * zoom;
          ctx.beginPath();
          ctx.arc(centerX + panOffset.x, centerY + panOffset.y, r, 0, Math.PI * 2);
          ctx.stroke();

          if (showLabels && alt > 0 && alt % 30 === 0) {
            ctx.fillStyle = '#78909C';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${alt}°`, centerX + panOffset.x + 5, centerY + panOffset.y - r + 12);
          }
        }

        // Azimuth lines
        const azStep = zoom >= 2.5 ? 15 : 45;
        for (let az = 0; az < 360; az += azStep) {
          const theta = ((az - 90) * Math.PI) / 180;
          const outerR = maxRadius * zoom;
          ctx.strokeStyle = az % 45 === 0 ? '#37474F' : '#2C3A42';
          ctx.lineWidth = az % 45 === 0 ? 1 : 0.5;
          ctx.beginPath();
          ctx.moveTo(centerX + panOffset.x, centerY + panOffset.y);
          ctx.lineTo(
            centerX + panOffset.x + outerR * Math.cos(theta),
            centerY + panOffset.y + outerR * Math.sin(theta)
          );
          ctx.stroke();
        }

        // Cardinal direction labels
        if (showLabels) {
          ctx.fillStyle = '#78909C';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const labelR = maxRadius * zoom + 14;
          const dirs = [
            { label: 'N', az: 0 },
            { label: 'NE', az: 45 },
            { label: 'E', az: 90 },
            { label: 'SE', az: 135 },
            { label: 'S', az: 180 },
            { label: 'SW', az: 225 },
            { label: 'W', az: 270 },
            { label: 'NW', az: 315 },
          ];
          for (const d of dirs) {
            const theta = ((d.az - 90) * Math.PI) / 180;
            const lx = centerX + panOffset.x + labelR * Math.cos(theta);
            const ly = centerY + panOffset.y + labelR * Math.sin(theta);
            if (lx > -20 && lx < width + 20 && ly > -20 && ly < height + 20) {
              ctx.fillText(d.label, lx, ly);
            }
          }
        }
      }

      // Horizon circle
      ctx.strokeStyle = '#455A64';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX + panOffset.x, centerY + panOffset.y, maxRadius * zoom, 0, Math.PI * 2);
      ctx.stroke();

      // --- Sun ---
      if (sun && sun.altitude > 0) {
        const sunPos = altAzToXY(sun.altitude, sun.azimuth);
        const gradient = ctx.createRadialGradient(sunPos.x, sunPos.y, 0, sunPos.x, sunPos.y, 20 * zoom);
        gradient.addColorStop(0, '#ffdd00');
        gradient.addColorStop(0.5, '#ffaa00');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(sunPos.x, sunPos.y, 20 * zoom, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffdd00';
        ctx.beginPath();
        ctx.arc(sunPos.x, sunPos.y, 8 * zoom, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- Moon ---
      if (moon && moon.altitude > 0) {
        const moonPos = altAzToXY(moon.altitude, moon.azimuth);
        const brightness = Math.round(100 + moon.illumination * 1.55);
        ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${Math.round(brightness * 0.95)})`;
        ctx.beginPath();
        ctx.arc(moonPos.x, moonPos.y, 8 * Math.max(1, zoom * 0.6), 0, Math.PI * 2);
        ctx.fill();

        if (showLabels) {
          ctx.fillStyle = '#BDC3C7';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(`Moon ${Math.round(moon.illumination)}%`, moonPos.x, moonPos.y + 12);
        }
      }

      // --- Deep sky objects ---
      for (const obj of visibleObjects) {
        const pos = altAzToXY(obj.visibility.coords.altitude, obj.visibility.coords.azimuth);

        // Skip if off screen
        if (pos.x < -20 || pos.x > width + 20 || pos.y < -20 || pos.y > height + 20) continue;

        const isSelected = selectedTarget?.object.id === obj.object.id;
        const isHovered = hoveredObject?.object.id === obj.object.id;
        const size = Math.max(3, 8 - obj.object.vmag / 2) * Math.min(zoom * 0.5 + 0.5, 2);

        let color = '#4dabf7';
        switch (obj.object.type) {
          case 'galaxy':
            color = '#ff6b6b';
            break;
          case 'nebula':
          case 'emission':
          case 'planetary':
            color = '#9775fa';
            break;
          case 'open_cluster':
          case 'globular':
            color = '#fcc419';
            break;
        }

        ctx.fillStyle = color;
        ctx.globalAlpha = isSelected || isHovered ? 1 : 0.7;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
        ctx.fill();

        if (isSelected || isHovered) {
          ctx.strokeStyle = isSelected ? '#00BCA6' : '#BDC3C7';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, size + 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (showLabels && (obj.object.vmag < 8 || isSelected || isHovered || zoom >= 2)) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = isSelected || isHovered ? '#ECEFF1' : '#78909C';
          ctx.font = isSelected || isHovered ? 'bold 11px sans-serif' : '10px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(obj.object.name || obj.object.id, pos.x + size + 5, pos.y + 1);
        }

        ctx.globalAlpha = 1;
      }

      // --- Telescope Reticle ---
      if (showReticle && mountAlt != null && mountAz != null) {
        const rPos = altAzToXY(mountAlt, mountAz);

        // Pulse opacity during slewing
        let alpha = 1;
        if (isSlewing) {
          alpha = 0.4 + 0.6 * Math.abs(Math.sin(timestamp / 300));
        }

        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#00BCA6';
        ctx.lineWidth = 2;

        // Crosshair circle
        ctx.beginPath();
        ctx.arc(rPos.x, rPos.y, 12, 0, Math.PI * 2);
        ctx.stroke();

        // Crosshair lines
        const arm = 20;
        ctx.beginPath();
        ctx.moveTo(rPos.x - arm, rPos.y);
        ctx.lineTo(rPos.x - 6, rPos.y);
        ctx.moveTo(rPos.x + 6, rPos.y);
        ctx.lineTo(rPos.x + arm, rPos.y);
        ctx.moveTo(rPos.x, rPos.y - arm);
        ctx.lineTo(rPos.x, rPos.y - 6);
        ctx.moveTo(rPos.x, rPos.y + 6);
        ctx.lineTo(rPos.x, rPos.y + arm);
        ctx.stroke();

        // Label
        ctx.fillStyle = '#00BCA6';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('Scope', rPos.x + arm + 3, rPos.y - 5);

        ctx.globalAlpha = 1;
      }

      // --- Zoom indicator ---
      if (zoom !== 1) {
        ctx.fillStyle = '#78909C';
        ctx.font = '11px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${zoom.toFixed(1)}x`, width - 8, height - 8);
      }

      ctx.restore();

      // Continue animation if slewing (for reticle pulse)
      if (isSlewing && showReticle) {
        animFrameRef.current = requestAnimationFrame(draw);
      }
    };

    // Start drawing
    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    visibleObjects,
    moon,
    sun,
    selectedTarget,
    hoveredObject,
    width,
    height,
    showGrid,
    showLabels,
    zoom,
    panOffset,
    altAzToXY,
    maxRadius,
    centerX,
    centerY,
    mountAlt,
    mountAz,
    isSlewing,
    showReticle,
  ]);

  // --- Mouse handlers ---

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.min(5, Math.max(0.5, zoom * zoomFactor));

    // Zoom toward cursor
    const scale = newZoom / zoom;
    const newPanX = cursorX - scale * (cursorX - panOffset.x - centerX) - centerX;
    const newPanY = cursorY - scale * (cursorY - panOffset.y - centerY) - centerY;

    setZoom(newZoom);
    setPanOffset({ x: newPanX, y: newPanY });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // If no object under cursor, begin panning
    const obj = findObjectAtPos(x, y);
    if (!obj) {
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      panOffsetStart.current = { ...panOffset };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    if (isPanning.current) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPanOffset({
        x: panOffsetStart.current.x + dx,
        y: panOffsetStart.current.y + dy,
      });
    } else {
      setHoveredObject(findObjectAtPos(x, y));
    }
  };

  const handleMouseUp = () => {
    isPanning.current = false;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const obj = findObjectAtPos(x, y);
    if (obj && onSelectTarget) onSelectTarget(obj);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSlewToTarget) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const obj = findObjectAtPos(x, y);
    if (obj) {
      onSlewToTarget(obj.object.ra, obj.object.dec);
    }
  };

  const handleMouseLeave = () => {
    setHoveredObject(null);
    isPanning.current = false;
  };

  // Compute selected target position for slew button
  const selectedPos =
    selectedTarget && onSlewToTarget
      ? altAzToXY(selectedTarget.visibility.coords.altitude, selectedTarget.visibility.coords.azimuth)
      : null;

  return (
    <div className="relative overflow-hidden" style={{ width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded cursor-crosshair"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      />

      {/* Tooltip */}
      {hoveredObject && !isPanning.current && (
        <div
          className="absolute pointer-events-none bg-nina-elevated rounded p-2.5 shadow-lg border border-nina-border z-10"
          style={{
            left: Math.min(mousePos.x + 15, width - 180),
            top: Math.min(mousePos.y + 15, height - 100),
          }}
        >
          <div className="font-medium text-nina-text-bright text-sm">
            {hoveredObject.object.name || hoveredObject.object.id}
          </div>
          <div className="text-[10px] text-nina-text-dim capitalize">{hoveredObject.object.type}</div>
          <div className="text-[10px] text-nina-text-dim mt-0.5">
            Mag: {hoveredObject.object.vmag.toFixed(1)} | Alt:{' '}
            {hoveredObject.visibility.coords.altitude.toFixed(0)}°
          </div>
        </div>
      )}

      {/* Slew button near selected target */}
      {selectedPos && onSlewToTarget && selectedTarget && (
        <button
          onClick={() => onSlewToTarget(selectedTarget.object.ra, selectedTarget.object.dec)}
          className="absolute px-2 py-0.5 bg-nina-primary text-nina-text-bright text-xs rounded font-medium hover:bg-nina-active shadow-lg z-10"
          style={{
            left: Math.min(Math.max(selectedPos.x + 12, 4), width - 60),
            top: Math.min(Math.max(selectedPos.y - 24, 4), height - 28),
          }}
        >
          Slew
        </button>
      )}
    </div>
  );
}
