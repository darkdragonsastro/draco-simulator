// Planet rendering on the celestial sphere

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { PlanetInfo } from '../../stores/planetariumStore';
import { raDecToVec3 } from '../../utils/celestialMath';

interface PlanetsProps {
  planets: PlanetInfo[];
  visible?: boolean;
}

const PLANET_COLORS: Record<string, string> = {
  mercury: '#b0b0b0',
  venus: '#ffffc8',
  mars: '#ff6644',
  jupiter: '#ddc080',
  saturn: '#d4a050',
  uranus: '#a0d8e8',
  neptune: '#4040c0',
};

const PLANET_SIZES: Record<string, number> = {
  mercury: 1.2,
  venus: 1.8,
  mars: 1.5,
  jupiter: 2.5,
  saturn: 2.2,
  uranus: 1.0,
  neptune: 0.8,
};

export function Planets({ planets, visible = true }: PlanetsProps) {
  const markers = useMemo(() => {
    return planets
      .filter((p) => p.is_visible)
      .map((p) => ({
        planet: p,
        position: raDecToVec3(p.ra, p.dec, 97),
        color: PLANET_COLORS[p.body] || '#ffffff',
        size: PLANET_SIZES[p.body] || 1,
      }));
  }, [planets]);

  if (!visible || markers.length === 0) return null;

  return (
    <>
      {markers.map((m) => (
        <group key={m.planet.body} position={m.position}>
          <mesh>
            <circleGeometry args={[m.size, 16]} />
            <meshBasicMaterial
              color={m.color}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <Html
            position={[m.size + 1, 0.5, 0]}
            style={{ pointerEvents: 'none' }}
            zIndexRange={[0, 0]}
          >
            <div
              className="text-[10px] font-medium capitalize whitespace-nowrap"
              style={{
                color: m.color,
                textShadow: '0 0 4px rgba(0,0,0,0.9)',
              }}
            >
              {m.planet.body}
            </div>
          </Html>
        </group>
      ))}
    </>
  );
}
