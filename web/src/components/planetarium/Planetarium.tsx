// Main Planetarium component - drop-in replacement for SkyMap
// Wraps Three.js Canvas with HTML overlay for toolbar and tooltip

import { useEffect, useCallback, useState, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import type { VisibleObject, MoonInfo, SunInfo } from '../../api/client';
import { usePlanetariumStore } from '../../stores/planetariumStore';
import { angularDistance } from '../../utils/celestialMath';
import { PlanetariumScene } from './PlanetariumScene';
import { PlanetariumToolbar } from './PlanetariumToolbar';
import { SkyContextMenu } from './SkyContextMenu';

interface PlanetariumProps {
  // Same props as SkyMap for drop-in compatibility
  visibleObjects: VisibleObject[];
  moon?: MoonInfo | null;
  sun?: SunInfo | null;
  selectedTarget?: VisibleObject | null;
  onSelectTarget?: (target: VisibleObject) => void;
  width?: number;
  height?: number;
  showGrid?: boolean;
  showLabels?: boolean;
  // Mount integration
  mountAlt?: number;
  mountAz?: number;
  isSlewing?: boolean;
  showReticle?: boolean;
  onSlewToTarget?: (ra: number, dec: number) => void;
  // Planetarium extras
  lst?: number;       // Local sidereal time in hours
  latitude?: number;  // Observer latitude in degrees
  showToolbar?: boolean;
  className?: string;
}

export function Planetarium({
  visibleObjects,
  moon,
  sun,
  selectedTarget,
  onSelectTarget,
  width = 600,
  height = 400,
  mountAlt,
  mountAz,
  isSlewing = false,
  showReticle = false,
  onSlewToTarget,
  lst = 0,
  latitude = 34.0522,
  showToolbar = true,
  className = '',
}: PlanetariumProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { toggleLayer, setView } = usePlanetariumStore();

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    ra: number;
    dec: number;
    nearbyObject?: VisibleObject | null;
  } | null>(null);

  const handleContextMenu = useCallback(
    (screenX: number, screenY: number, ra: number, dec: number) => {
      // Convert screen coords to container-relative coords
      const rect = containerRef.current?.getBoundingClientRect();
      const x = rect ? screenX - rect.left : screenX;
      const y = rect ? screenY - rect.top : screenY;

      // Find nearest DSO within 1 degree
      let nearbyObject: VisibleObject | null = null;
      let minDist = 1; // threshold in degrees
      for (const obj of visibleObjects) {
        const dist = angularDistance(ra, dec, obj.object.ra, obj.object.dec);
        if (dist < minDist) {
          minDist = dist;
          nearbyObject = obj;
        }
      }
      setContextMenu({ x, y, ra, dec, nearbyObject });
    },
    [visibleObjects]
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleCenterView = useCallback(
    (ra: number, dec: number) => {
      setView({ centerRA: ra, centerDec: dec });
    },
    [setView]
  );

  const mountConnected = showReticle;
  const mountParked = !onSlewToTarget && mountConnected;

  // Keyboard shortcuts for layer toggles
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.key.toUpperCase()) {
        case 'C':
          toggleLayer('constellationLines');
          break;
        case 'L':
          toggleLayer('constellationLabels');
          break;
        case 'G':
          toggleLayer('altAzGrid');
          break;
        case 'E':
          toggleLayer('equatorialGrid');
          break;
        case 'M':
          toggleLayer('milkyWay');
          break;
        case 'A':
          toggleLayer('atmosphere');
          break;
        case 'I':
          toggleLayer('dsoImages');
          break;
      }
    },
    [toggleLayer]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-nina-bg rounded ${className}`}
      style={{ width, height }}
    >
      <Canvas
        camera={{ fov: 60, near: 0.1, far: 500, position: [0, 0, 0] }}
        style={{ background: '#0a0a14' }}
        gl={{ antialias: true, alpha: false }}
        onClick={contextMenu ? handleCloseContextMenu : undefined}
      >
        <Suspense fallback={null}>
          <PlanetariumScene
            visibleObjects={visibleObjects}
            moon={moon}
            sun={sun}
            selectedTarget={selectedTarget}
            onSelectTarget={onSelectTarget}
            onSlewToTarget={onSlewToTarget}
            mountAlt={mountAlt}
            mountAz={mountAz}
            isSlewing={isSlewing}
            showReticle={showReticle}
            mountConnected={mountConnected}
            lst={lst}
            latitude={latitude}
            onContextMenu={handleContextMenu}
          />
        </Suspense>
      </Canvas>

      {/* Context menu overlay */}
      {contextMenu && (
        <SkyContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          ra={contextMenu.ra}
          dec={contextMenu.dec}
          nearbyObject={contextMenu.nearbyObject}
          mountConnected={mountConnected}
          mountParked={mountParked}
          onSlewTo={(ra, dec) => {
            onSlewToTarget?.(ra, dec);
          }}
          onCenterView={handleCenterView}
          onSelectTarget={onSelectTarget}
          onClose={handleCloseContextMenu}
        />
      )}

      {/* Toolbar overlay */}
      {showToolbar && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <PlanetariumToolbar />
        </div>
      )}
    </div>
  );
}
