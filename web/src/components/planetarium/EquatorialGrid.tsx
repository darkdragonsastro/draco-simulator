// Equatorial coordinate grid overlay (RA/Dec lines fixed in the celestial frame)

import { useMemo } from 'react';
import * as THREE from 'three';
import { raDecToVec3 } from '../../utils/celestialMath';

interface EquatorialGridProps {
  visible?: boolean;
}

export function EquatorialGrid({ visible = true }: EquatorialGridProps) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const radius = 99;
    const step = 2; // degrees per segment

    // Declination circles every 30 degrees
    for (let dec = -60; dec <= 60; dec += 30) {
      for (let ra = 0; ra < 360; ra += step) {
        const v1 = raDecToVec3(ra, dec, radius);
        const v2 = raDecToVec3(ra + step, dec, radius);
        positions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
      }
    }

    // RA hour lines every 2 hours (30 degrees)
    for (let ra = 0; ra < 360; ra += 30) {
      for (let dec = -80; dec < 80; dec += step) {
        const v1 = raDecToVec3(ra, dec, radius);
        const v2 = raDecToVec3(ra, dec + step, radius);
        positions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
      }
    }

    // Celestial equator (dec=0) with slightly more segments
    for (let ra = 0; ra < 360; ra += 1) {
      const v1 = raDecToVec3(ra, 0, radius);
      const v2 = raDecToVec3(ra + 1, 0, radius);
      positions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, []);

  if (!visible) return null;

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#2a2a5a" transparent opacity={0.25} depthWrite={false} />
    </lineSegments>
  );
}

// Ecliptic line as a separate component
interface EclipticLineProps {
  visible?: boolean;
}

export function EclipticLine({ visible = true }: EclipticLineProps) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const radius = 99;
    const obliquity = 23.4393; // degrees
    const oblRad = obliquity * Math.PI / 180;

    // Ecliptic is a great circle tilted by obliquity from the equator
    for (let lon = 0; lon < 360; lon += 1) {
      const lonRad = lon * Math.PI / 180;
      const lonRad2 = (lon + 1) * Math.PI / 180;

      // Convert ecliptic longitude to RA/Dec
      const ra1 = Math.atan2(Math.sin(lonRad) * Math.cos(oblRad), Math.cos(lonRad)) * 180 / Math.PI;
      const dec1 = Math.asin(Math.sin(lonRad) * Math.sin(oblRad)) * 180 / Math.PI;
      const ra2 = Math.atan2(Math.sin(lonRad2) * Math.cos(oblRad), Math.cos(lonRad2)) * 180 / Math.PI;
      const dec2 = Math.asin(Math.sin(lonRad2) * Math.sin(oblRad)) * 180 / Math.PI;

      const v1 = raDecToVec3((ra1 + 360) % 360, dec1, radius);
      const v2 = raDecToVec3((ra2 + 360) % 360, dec2, radius);
      positions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, []);

  if (!visible) return null;

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#6a4a2a" transparent opacity={0.4} depthWrite={false} />
    </lineSegments>
  );
}
