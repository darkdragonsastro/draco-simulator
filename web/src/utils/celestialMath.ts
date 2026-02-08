// Celestial coordinate math utilities for the planetarium

import * as THREE from 'three';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Convert RA/Dec (degrees) to a Three.js Vector3 on a sphere.
 * RA increases eastward, Dec is +90 at north pole.
 * In our coordinate system: +Z = north celestial pole, +X = RA=0, +Y = RA=90.
 */
export function raDecToVec3(ra: number, dec: number, radius: number = 100): THREE.Vector3 {
  const raRad = ra * DEG2RAD;
  const decRad = dec * DEG2RAD;
  const cosDec = Math.cos(decRad);
  return new THREE.Vector3(
    radius * cosDec * Math.cos(raRad),
    radius * cosDec * Math.sin(raRad),
    radius * Math.sin(decRad)
  );
}

/**
 * Convert equatorial coordinates (RA/Dec in degrees) to horizontal (Alt/Az in degrees).
 * @param ra  Right ascension in degrees
 * @param dec Declination in degrees
 * @param lst Local sidereal time in hours
 * @param lat Observer latitude in degrees
 * @returns { altitude, azimuth } in degrees
 */
export function equatorialToHorizontal(
  ra: number,
  dec: number,
  lst: number,
  lat: number
): { altitude: number; azimuth: number } {
  // Hour angle in degrees
  const ha = (lst * 15 - ra + 360) % 360;
  const haRad = ha * DEG2RAD;
  const decRad = dec * DEG2RAD;
  const latRad = lat * DEG2RAD;

  // Altitude
  const sinAlt = Math.sin(decRad) * Math.sin(latRad) +
    Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
  const altitude = Math.asin(sinAlt) * RAD2DEG;

  // Azimuth
  const cosA = (Math.sin(decRad) - Math.sin(latRad) * sinAlt) /
    (Math.cos(latRad) * Math.cos(Math.asin(sinAlt)));
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosA))) * RAD2DEG;
  if (Math.sin(haRad) > 0) {
    azimuth = 360 - azimuth;
  }

  return { altitude, azimuth };
}

/**
 * Convert horizontal coordinates (Alt/Az) back to equatorial (RA/Dec).
 * @param alt Altitude in degrees
 * @param az  Azimuth in degrees (0=N, 90=E)
 * @param lst Local sidereal time in hours
 * @param lat Observer latitude in degrees
 * @returns { ra, dec } in degrees
 */
export function horizontalToEquatorial(
  alt: number,
  az: number,
  lst: number,
  lat: number
): { ra: number; dec: number } {
  const altRad = alt * DEG2RAD;
  const azRad = az * DEG2RAD;
  const latRad = lat * DEG2RAD;

  // Declination
  const sinDec = Math.sin(altRad) * Math.sin(latRad) +
    Math.cos(altRad) * Math.cos(latRad) * Math.cos(azRad);
  const dec = Math.asin(sinDec) * RAD2DEG;

  // Hour angle
  const cosHA = (Math.sin(altRad) - Math.sin(latRad) * sinDec) /
    (Math.cos(latRad) * Math.cos(Math.asin(sinDec)));
  let ha = Math.acos(Math.max(-1, Math.min(1, cosHA))) * RAD2DEG;
  if (Math.sin(azRad) > 0) {
    ha = 360 - ha;
  }

  // RA from hour angle and LST
  const ra = (lst * 15 - ha + 360) % 360;

  return { ra, dec };
}

/**
 * Convert Alt/Az to a Three.js Vector3 on a sphere.
 * Used for rendering grid overlays in the horizontal frame.
 */
export function altAzToVec3(alt: number, az: number, radius: number = 100): THREE.Vector3 {
  const altRad = alt * DEG2RAD;
  const azRad = az * DEG2RAD;
  const cosAlt = Math.cos(altRad);
  // Azimuth: 0=N(+Z), 90=E(+X), 180=S(-Z), 270=W(-X)
  return new THREE.Vector3(
    radius * cosAlt * Math.sin(azRad),
    radius * Math.sin(altRad),
    radius * cosAlt * Math.cos(azRad)
  );
}

/**
 * Calculate angular distance between two points on the sky (in degrees).
 */
export function angularDistance(ra1: number, dec1: number, ra2: number, dec2: number): number {
  const ra1Rad = ra1 * DEG2RAD;
  const dec1Rad = dec1 * DEG2RAD;
  const ra2Rad = ra2 * DEG2RAD;
  const dec2Rad = dec2 * DEG2RAD;
  const dra = ra2Rad - ra1Rad;
  const ddec = dec2Rad - dec1Rad;
  const a = Math.sin(ddec / 2) ** 2 +
    Math.cos(dec1Rad) * Math.cos(dec2Rad) * Math.sin(dra / 2) ** 2;
  return 2 * Math.asin(Math.sqrt(a)) * RAD2DEG;
}

/**
 * Compute the rotation quaternion to align the equatorial frame
 * with the horizontal frame for a given LST and latitude.
 * This rotates from equatorial (RA/Dec on sphere) to alt-az oriented.
 */
export function getEquatorialToHorizontalRotation(lst: number, lat: number): THREE.Quaternion {
  // First rotate by -LST around the Z axis (pole) to align RA=0 with the meridian
  // Then tilt by -(90-lat) around the X axis to put the pole at the correct altitude
  const q = new THREE.Quaternion();
  const euler = new THREE.Euler(
    -(90 - lat) * DEG2RAD,  // Tilt for latitude
    0,
    -lst * 15 * DEG2RAD,   // Rotate for sidereal time
    'ZXY'
  );
  q.setFromEuler(euler);
  return q;
}

/**
 * Create positions and UVs for a DSO image quad from four corner RA/Dec coordinates.
 * Corners are [bottomLeft, bottomRight, topRight, topLeft] in RA/Dec degrees.
 * Returns { positions, uvs, indices } for a BufferGeometry with 2 triangles.
 */
export function createDSOQuadPositions(
  corners: { ra: number; dec: number }[],
  radius: number = 98
): { positions: Float32Array; uvs: Float32Array; indices: Uint16Array } {
  // BL=0, BR=1, TR=2, TL=3
  const positions = new Float32Array(4 * 3);
  const uvs = new Float32Array([
    0, 0,  // BL
    1, 0,  // BR
    1, 1,  // TR
    0, 1,  // TL
  ]);
  // Two triangles: BL-BR-TR and BL-TR-TL
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

  for (let i = 0; i < 4; i++) {
    const v = raDecToVec3(corners[i].ra, corners[i].dec, radius);
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
  }

  return { positions, uvs, indices };
}

/**
 * Convert a Three.js Vector3 direction back to RA/Dec (degrees).
 * Inverse of raDecToVec3. Follows the same convention: +Z = north pole, +X = RA 0, +Y = RA 90.
 */
export function vec3ToRaDec(v: THREE.Vector3): { ra: number; dec: number } {
  const r = v.length();
  const dec = Math.asin(v.z / r) * RAD2DEG;
  let ra = Math.atan2(v.y, v.x) * RAD2DEG;
  if (ra < 0) ra += 360;
  return { ra, dec };
}

/**
 * Format RA (degrees) as HHh MMm SSs string.
 */
export function formatRA(raDeg: number): string {
  const hours = ((raDeg % 360) + 360) % 360 / 15;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = ((hours - h) * 60 - m) * 60;
  return `${h}h ${m}m ${s.toFixed(0)}s`;
}

/**
 * Format Dec (degrees) as ±DD° MM' SS" string.
 */
export function formatDec(decDeg: number): string {
  const sign = decDeg >= 0 ? '+' : '-';
  const abs = Math.abs(decDeg);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = ((abs - d) * 60 - m) * 60;
  return `${sign}${d}° ${m}' ${s.toFixed(0)}"`;
}

/**
 * Magnitude to point size scaling.
 * Brighter stars (lower magnitude) get larger points.
 */
export function magnitudeToSize(mag: number, minMag: number = -1.5, maxSize: number = 6): number {
  return maxSize * Math.pow(10, -0.15 * (mag - minMag));
}
