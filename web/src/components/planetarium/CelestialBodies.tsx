// Sun and Moon rendering on the celestial sphere

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { MoonInfo, SunInfo } from '../../api/client';
import { raDecToVec3 } from '../../utils/celestialMath';

interface CelestialBodiesProps {
  moon?: MoonInfo | null;
  sun?: SunInfo | null;
  visible?: boolean;
}

export function CelestialBodies({ moon, sun, visible = true }: CelestialBodiesProps) {
  if (!visible) return null;

  return (
    <>
      {sun && <SunBody sun={sun} />}
      {moon && <MoonBody moon={moon} />}
    </>
  );
}

function SunBody({ sun }: { sun: SunInfo }) {
  const glowRef = useRef<THREE.Mesh>(null);
  const position = useMemo(() => raDecToVec3(sun.ra, sun.dec, 96), [sun.ra, sun.dec]);

  useFrame((state) => {
    if (glowRef.current) {
      const scale = 1 + 0.05 * Math.sin(state.clock.elapsedTime * 2);
      glowRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={position}>
      {/* Glow */}
      <mesh ref={glowRef}>
        <circleGeometry args={[6, 32]} />
        <meshBasicMaterial
          color="#ffaa00"
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Disk */}
      <mesh>
        <circleGeometry args={[3, 32]} />
        <meshBasicMaterial
          color="#ffdd00"
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <Html position={[4, 2, 0]} style={{ pointerEvents: 'none' }} zIndexRange={[0, 0]}>
        <div
          className="text-[10px] font-bold whitespace-nowrap"
          style={{ color: '#ffdd00', textShadow: '0 0 4px rgba(0,0,0,0.9)' }}
        >
          Sun
        </div>
      </Html>
    </group>
  );
}

function MoonBody({ moon }: { moon: MoonInfo }) {
  const position = useMemo(() => raDecToVec3(moon.ra, moon.dec, 96), [moon.ra, moon.dec]);
  const brightness = Math.round(150 + moon.illumination * 1.05);
  const moonColor = useMemo(
    () => `rgb(${brightness}, ${brightness}, ${Math.round(brightness * 0.95)})`,
    [brightness]
  );

  return (
    <group position={position}>
      {/* Moon disk */}
      <mesh>
        <circleGeometry args={[2.5, 32]} />
        <meshBasicMaterial
          color={moonColor}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <Html position={[3.5, 1.5, 0]} style={{ pointerEvents: 'none' }} zIndexRange={[0, 0]}>
        <div
          className="text-[10px] whitespace-nowrap"
          style={{ color: '#BDC3C7', textShadow: '0 0 4px rgba(0,0,0,0.9)' }}
        >
          Moon {Math.round(moon.illumination)}%
        </div>
      </Html>
    </group>
  );
}
