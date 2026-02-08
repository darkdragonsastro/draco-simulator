// Alt-Az coordinate grid overlay with cardinal direction labels

import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface AltAzGridProps {
  visible?: boolean;
  showCardinals?: boolean;
  lst: number;  // Local sidereal time in hours
  latitude: number; // Observer latitude in degrees
}

const DEG2RAD = Math.PI / 180;

/**
 * Convert alt/az to equatorial-frame Vector3 for the grid.
 * We need to rotate the horizontal grid into the equatorial frame
 * based on LST and latitude.
 */
function altAzToEquatorialVec3(
  alt: number,
  az: number,
  lst: number,
  lat: number,
  radius: number
): THREE.Vector3 {
  const altRad = alt * DEG2RAD;
  const azRad = az * DEG2RAD;

  // Position in horizontal frame (Y=up, X=east, Z=north)
  const cosAlt = Math.cos(altRad);
  const x = -cosAlt * Math.sin(azRad); // East
  const y = Math.sin(altRad);           // Up (toward zenith)
  const z = cosAlt * Math.cos(azRad);   // North

  // Rotate from horizontal to equatorial:
  // 1. Rotate around X by -(90-lat) to align zenith with pole
  // 2. Rotate around Z (pole) by LST to align meridian
  const coLat = (90 - lat) * DEG2RAD;
  const lstRad = lst * 15 * DEG2RAD;

  // Rotation: first tilt by co-latitude around X axis
  const x1 = x;
  const y1 = y * Math.cos(coLat) - z * Math.sin(coLat);
  const z1 = y * Math.sin(coLat) + z * Math.cos(coLat);

  // Then rotate by LST around Z axis
  const x2 = x1 * Math.cos(lstRad) - y1 * Math.sin(lstRad);
  const y2 = x1 * Math.sin(lstRad) + y1 * Math.cos(lstRad);
  const z2 = z1;

  return new THREE.Vector3(x2 * radius, y2 * radius, z2 * radius);
}

export function AltAzGrid({ visible = true, showCardinals = true, lst, latitude }: AltAzGridProps) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const radius = 99;
    const step = 2; // degrees per segment for smoothness

    // Altitude circles at 0, 30, 60 degrees
    for (const alt of [0, 30, 60]) {
      for (let az = 0; az < 360; az += step) {
        const v1 = altAzToEquatorialVec3(alt, az, lst, latitude, radius);
        const v2 = altAzToEquatorialVec3(alt, az + step, lst, latitude, radius);
        positions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
      }
    }

    // Azimuth lines every 30 degrees
    for (let az = 0; az < 360; az += 30) {
      for (let alt = 0; alt < 90; alt += step) {
        const v1 = altAzToEquatorialVec3(alt, az, lst, latitude, radius);
        const v2 = altAzToEquatorialVec3(alt + step, az, lst, latitude, radius);
        positions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, [lst, latitude]);

  const cardinalPositions = useMemo(() => {
    if (!showCardinals) return [];
    const radius = 99;
    return [
      { label: 'N', pos: altAzToEquatorialVec3(2, 0, lst, latitude, radius) },
      { label: 'E', pos: altAzToEquatorialVec3(2, 90, lst, latitude, radius) },
      { label: 'S', pos: altAzToEquatorialVec3(2, 180, lst, latitude, radius) },
      { label: 'W', pos: altAzToEquatorialVec3(2, 270, lst, latitude, radius) },
    ];
  }, [lst, latitude, showCardinals]);

  if (!visible) return null;

  return (
    <group>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color="#2a4a3a" transparent opacity={0.3} depthWrite={false} />
      </lineSegments>

      {showCardinals && cardinalPositions.map((c) => (
        <Html key={c.label} position={c.pos} center style={{ pointerEvents: 'none' }} zIndexRange={[0, 0]}>
          <div
            className="text-xs font-bold"
            style={{
              color: c.label === 'N' ? '#ff6666' : '#66aa66',
              textShadow: '0 0 4px rgba(0,0,0,0.9)',
            }}
          >
            {c.label}
          </div>
        </Html>
      ))}
    </group>
  );
}
