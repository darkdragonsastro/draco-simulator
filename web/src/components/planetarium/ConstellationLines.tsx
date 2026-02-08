// Constellation stick figure line renderer

import { useMemo } from 'react';
import * as THREE from 'three';
import type { ConstellationData, BrightStar } from '../../stores/planetariumStore';
import { raDecToVec3 } from '../../utils/celestialMath';

interface ConstellationLinesProps {
  constellations: ConstellationData[];
  stars: BrightStar[];
  visible?: boolean;
}

export function ConstellationLines({ constellations, stars, visible = true }: ConstellationLinesProps) {
  const geometry = useMemo(() => {
    // Build a lookup map from HIP -> star position
    const starMap = new Map<number, BrightStar>();
    for (const star of stars) {
      starMap.set(star.hip, star);
    }

    const positions: number[] = [];

    for (const constellation of constellations) {
      for (const pair of constellation.lines) {
        if (pair.length !== 2) continue;
        const star1 = starMap.get(pair[0]);
        const star2 = starMap.get(pair[1]);
        if (!star1 || !star2) continue;

        const v1 = raDecToVec3(star1.ra, star1.dec, 99.5);
        const v2 = raDecToVec3(star2.ra, star2.dec, 99.5);

        positions.push(v1.x, v1.y, v1.z);
        positions.push(v2.x, v2.y, v2.z);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, [constellations, stars]);

  if (!visible || constellations.length === 0 || stars.length === 0) return null;

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        color="#2a6e6e"
        transparent
        opacity={0.35}
        depthWrite={false}
      />
    </lineSegments>
  );
}
