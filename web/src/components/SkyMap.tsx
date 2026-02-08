// Interactive Sky Map visualization component

import { useEffect, useRef, useState } from 'react';
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
}: SkyMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredObject, setHoveredObject] = useState<VisibleObject | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Convert altitude/azimuth to canvas coordinates (stereographic projection)
  const altAzToXY = (alt: number, azimuth: number): { x: number; y: number } => {
    // Normalize altitude (0-90) to radius (1-0)
    const r = ((90 - alt) / 90) * (Math.min(width, height) / 2 - 20);
    // Azimuth: 0=N, 90=E, 180=S, 270=W
    const theta = ((azimuth - 90) * Math.PI) / 180;
    return {
      x: width / 2 + r * Math.cos(theta),
      y: height / 2 + r * Math.sin(theta),
    };
  };

  // Find object at position
  const findObjectAtPos = (x: number, y: number): VisibleObject | null => {
    for (const obj of visibleObjects) {
      const pos = altAzToXY(obj.visibility.coords.altitude, obj.visibility.coords.azimuth);
      const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (dist < 15) return obj;
    }
    return null;
  };

  // Draw the sky map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 20;

    // Draw altitude circles (grid)
    if (showGrid) {
      ctx.strokeStyle = '#252535';
      ctx.lineWidth = 1;
      for (let alt = 0; alt <= 90; alt += 30) {
        const r = ((90 - alt) / 90) * maxRadius;
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();

        // Altitude labels
        if (showLabels && alt > 0) {
          ctx.fillStyle = '#4a4a5a';
          ctx.font = '10px sans-serif';
          ctx.fillText(`${alt}°`, centerX + 5, centerY - r + 12);
        }
      }

      // Draw azimuth lines
      for (let az = 0; az < 360; az += 45) {
        const theta = ((az - 90) * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + maxRadius * Math.cos(theta), centerY + maxRadius * Math.sin(theta));
        ctx.stroke();
      }

      // Cardinal direction labels
      if (showLabels) {
        ctx.fillStyle = '#6a6a7a';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('N', centerX, 15);
        ctx.fillText('S', centerX, height - 5);
        ctx.fillText('E', width - 10, centerY + 4);
        ctx.fillText('W', 10, centerY + 4);
      }
    }

    // Draw horizon circle
    ctx.strokeStyle = '#3a3a4a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw sun (if above horizon)
    if (sun && sun.altitude > 0) {
      const sunPos = altAzToXY(sun.altitude, sun.azimuth);
      const gradient = ctx.createRadialGradient(sunPos.x, sunPos.y, 0, sunPos.x, sunPos.y, 20);
      gradient.addColorStop(0, '#ffdd00');
      gradient.addColorStop(0.5, '#ffaa00');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(sunPos.x, sunPos.y, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffdd00';
      ctx.beginPath();
      ctx.arc(sunPos.x, sunPos.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw moon (if above horizon)
    if (moon && moon.altitude > 0) {
      const moonPos = altAzToXY(moon.altitude, moon.azimuth);
      const brightness = Math.round(100 + moon.illumination * 1.55);
      ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${Math.round(brightness * 0.95)})`;
      ctx.beginPath();
      ctx.arc(moonPos.x, moonPos.y, 8, 0, Math.PI * 2);
      ctx.fill();

      if (showLabels) {
        ctx.fillStyle = '#aaa';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Moon ${Math.round(moon.illumination)}%`, moonPos.x, moonPos.y + 18);
      }
    }

    // Draw deep sky objects
    for (const obj of visibleObjects) {
      const pos = altAzToXY(obj.visibility.coords.altitude, obj.visibility.coords.azimuth);
      const isSelected = selectedTarget?.object.id === obj.object.id;
      const isHovered = hoveredObject?.object.id === obj.object.id;

      // Size based on magnitude (brighter = larger)
      const size = Math.max(3, 8 - obj.object.vmag / 2);

      // Color based on type
      let color = '#4dabf7'; // Default blue
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

      // Draw object
      ctx.fillStyle = color;
      ctx.globalAlpha = isSelected || isHovered ? 1 : 0.7;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
      ctx.fill();

      // Selection/hover ring
      if (isSelected || isHovered) {
        ctx.strokeStyle = isSelected ? '#fff' : '#aaa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, size + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Label
      if (showLabels && (obj.object.vmag < 8 || isSelected || isHovered)) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = isSelected || isHovered ? '#fff' : '#888';
        ctx.font = isSelected || isHovered ? 'bold 11px sans-serif' : '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(obj.object.name || obj.object.id, pos.x + size + 5, pos.y + 3);
      }

      ctx.globalAlpha = 1;
    }
  }, [visibleObjects, moon, sun, selectedTarget, hoveredObject, width, height, showGrid, showLabels]);

  // Handle mouse events
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    const obj = findObjectAtPos(x, y);
    setHoveredObject(obj);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const obj = findObjectAtPos(x, y);
    if (obj && onSelectTarget) {
      onSelectTarget(obj);
    }
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-lg cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredObject(null)}
        onClick={handleClick}
      />

      {/* Tooltip */}
      {hoveredObject && (
        <div
          className="absolute pointer-events-none bg-space-700 rounded-lg p-3 shadow-lg border border-space-500 z-10"
          style={{
            left: Math.min(mousePos.x + 15, width - 180),
            top: Math.min(mousePos.y + 15, height - 100),
          }}
        >
          <div className="font-medium text-white">
            {hoveredObject.object.name || hoveredObject.object.id}
          </div>
          <div className="text-xs text-gray-400 capitalize">{hoveredObject.object.type}</div>
          <div className="text-xs text-gray-400 mt-1">
            Mag: {hoveredObject.object.vmag.toFixed(1)} | Alt:{' '}
            {hoveredObject.visibility.coords.altitude.toFixed(0)}°
          </div>
        </div>
      )}
    </div>
  );
}
