// Three.js scene orchestrator for the planetarium

import { useEffect } from 'react';
import { usePlanetariumStore } from '../../stores/planetariumStore';
import type { VisibleObject, MoonInfo, SunInfo } from '../../api/client';
import { StarField } from './StarField';
import { ConstellationLines } from './ConstellationLines';
import { ConstellationLabels } from './ConstellationLabels';
import { SkyGradient } from './SkyGradient';
import { SkyControls } from './SkyControls';
import { DSOMarkers } from './DSOMarkers';
import { Planets } from './Planets';
import { CelestialBodies } from './CelestialBodies';
import { MountReticle } from './MountReticle';
import { AltAzGrid } from './AltAzGrid';
import { EquatorialGrid, EclipticLine } from './EquatorialGrid';
import { MilkyWay } from './MilkyWay';

interface PlanetariumSceneProps {
  visibleObjects: VisibleObject[];
  moon?: MoonInfo | null;
  sun?: SunInfo | null;
  selectedTarget?: VisibleObject | null;
  onSelectTarget?: (target: VisibleObject) => void;
  onSlewToTarget?: (ra: number, dec: number) => void;
  mountAlt?: number;
  mountAz?: number;
  isSlewing?: boolean;
  showReticle?: boolean;
  mountConnected?: boolean;
  lst?: number;
  latitude?: number;
  onContextMenu?: (x: number, y: number, ra: number, dec: number) => void;
}

export function PlanetariumScene({
  visibleObjects,
  moon,
  sun,
  selectedTarget,
  onSelectTarget,
  onSlewToTarget,
  mountAlt,
  mountAz,
  isSlewing = false,
  showReticle = false,
  mountConnected = false,
  lst = 0,
  latitude = 34.0522,
  onContextMenu,
}: PlanetariumSceneProps) {
  const {
    brightStars,
    constellations,
    planets,
    layers,
    fetchBrightStars,
    fetchConstellations,
    fetchPlanets,
  } = usePlanetariumStore();

  // Fetch data on mount
  useEffect(() => {
    fetchBrightStars();
    fetchConstellations();
    fetchPlanets();
  }, [fetchBrightStars, fetchConstellations, fetchPlanets]);

  // Refresh planets periodically
  useEffect(() => {
    const interval = setInterval(fetchPlanets, 60000); // Every minute
    return () => clearInterval(interval);
  }, [fetchPlanets]);

  const sunAltitude = sun?.altitude ?? -30;

  return (
    <>
      {/* Camera controls */}
      <SkyControls onContextMenu={onContextMenu} />

      {/* Background sky gradient (outermost sphere) */}
      <SkyGradient sunAltitude={sunAltitude} visible={layers.atmosphere} />

      {/* Milky Way texture */}
      <MilkyWay visible={layers.milkyWay} />

      {/* Coordinate grids */}
      <AltAzGrid
        visible={layers.altAzGrid}
        showCardinals={layers.cardinals}
        lst={lst}
        latitude={latitude}
      />
      <EquatorialGrid visible={layers.equatorialGrid} />
      <EclipticLine visible={layers.ecliptic} />

      {/* Constellation lines */}
      <ConstellationLines
        constellations={constellations}
        stars={brightStars}
        visible={layers.constellationLines}
      />

      {/* Star field (GPU points) */}
      <StarField stars={brightStars} visible={layers.stars} />

      {/* Constellation labels (HTML overlay) */}
      <ConstellationLabels
        constellations={constellations}
        visible={layers.constellationLabels}
      />

      {/* Deep sky objects */}
      <DSOMarkers
        visibleObjects={visibleObjects}
        selectedTarget={selectedTarget}
        onSelectTarget={onSelectTarget}
        onSlewToTarget={onSlewToTarget}
        mountConnected={mountConnected}
        visible={layers.dsos}
        showImages={layers.dsoImages}
      />

      {/* Planets */}
      <Planets planets={planets} visible={layers.planets} />

      {/* Sun and Moon */}
      <CelestialBodies moon={moon} sun={sun} visible={true} />

      {/* Mount reticle */}
      {showReticle && (
        <MountReticle
          mountAlt={mountAlt}
          mountAz={mountAz}
          isSlewing={isSlewing}
          visible={showReticle}
          lst={lst}
          latitude={latitude}
        />
      )}
    </>
  );
}
