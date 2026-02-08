// Telescope mount reticle/crosshair rendered on the celestial sphere

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { raDecToVec3, horizontalToEquatorial } from '../../utils/celestialMath';

interface MountReticleProps {
  mountAlt?: number;
  mountAz?: number;
  isSlewing?: boolean;
  visible?: boolean;
  lst: number;      // Local sidereal time in hours
  latitude: number;  // Observer latitude in degrees
}

export function MountReticle({
  mountAlt,
  mountAz,
  isSlewing = false,
  visible = true,
  lst,
  latitude,
}: MountReticleProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Convert alt/az to RA/Dec to get position on equatorial sphere
  const position = useMemo(() => {
    if (mountAlt == null || mountAz == null) return null;
    const { ra, dec } = horizontalToEquatorial(mountAlt, mountAz, lst, latitude);
    return raDecToVec3(ra, dec, 97);
  }, [mountAlt, mountAz, lst, latitude]);

  // Pulse animation during slewing
  useFrame((state) => {
    if (!groupRef.current || !isSlewing) return;
    const alpha = 0.4 + 0.6 * Math.abs(Math.sin(state.clock.elapsedTime * 3));
    groupRef.current.children.forEach((child) => {
      if ((child as THREE.Mesh).material) {
        ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = alpha;
      }
    });
  });

  if (!visible || !position) return null;

  return (
    <group ref={groupRef} position={position}>
      {/* Crosshair circle */}
      <mesh>
        <ringGeometry args={[1.5, 1.8, 32]} />
        <meshBasicMaterial
          color="#00BCA6"
          transparent
          opacity={1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Crosshair lines - 4 arms */}
      {[0, 90, 180, 270].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const innerR = 2.2;
        const outerR = 3.5;
        return (
          <line key={angle}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array([
                  Math.cos(rad) * innerR, Math.sin(rad) * innerR, 0,
                  Math.cos(rad) * outerR, Math.sin(rad) * outerR, 0,
                ]), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#00BCA6" transparent opacity={1} />
          </line>
        );
      })}
      <Html position={[4, 1, 0]} style={{ pointerEvents: 'none' }} zIndexRange={[0, 0]}>
        <div
          className="text-[9px] font-bold whitespace-nowrap"
          style={{ color: '#00BCA6', textShadow: '0 0 4px rgba(0,0,0,0.9)' }}
        >
          Scope
        </div>
      </Html>
    </group>
  );
}
