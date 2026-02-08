// GPU-accelerated star field renderer using THREE.Points with custom shaders

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { BrightStar } from '../../stores/planetariumStore';
import { bvToRgb } from '../../utils/starColors';
import { raDecToVec3 } from '../../utils/celestialMath';

interface StarFieldProps {
  stars: BrightStar[];
  visible?: boolean;
}

const starVertexShader = `
  attribute float size;
  attribute float mag;
  attribute float extinction;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSize;

  void main() {
    vColor = color;
    vAlpha = extinction;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    // Scale point size with distance and magnitude
    float s = size * (300.0 / -mvPosition.z);
    gl_PointSize = max(s, 1.0);
    vSize = gl_PointSize;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const starFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSize;

  void main() {
    // Circular point with soft edges
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    // Soft circle falloff
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);

    // Brighter core for larger stars
    float core = exp(-dist * dist * 8.0);
    vec3 finalColor = mix(vColor, vec3(1.0), core * 0.3);

    // Apply atmospheric extinction
    gl_FragColor = vec4(finalColor, alpha * vAlpha);
    if (gl_FragColor.a < 0.01) discard;
  }
`;

export function StarField({ stars, visible = true }: StarFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, material } = useMemo(() => {
    const count = stars.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const mags = new Float32Array(count);
    const extinctions = new Float32Array(count);

    const minMag = -1.5;

    for (let i = 0; i < count; i++) {
      const star = stars[i];
      const pos = raDecToVec3(star.ra, star.dec, 100);

      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const [r, g, b] = bvToRgb(star.bv);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;

      // Size from magnitude: brighter = larger
      sizes[i] = Math.max(0.5, 6.0 * Math.pow(10, -0.15 * (star.vmag - minMag)));
      mags[i] = star.vmag;

      // Atmospheric extinction placeholder (set to 1.0 = no extinction for equatorial frame)
      // The actual extinction will be computed based on altitude in the scene
      extinctions[i] = 1.0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('mag', new THREE.BufferAttribute(mags, 1));
    geo.setAttribute('extinction', new THREE.BufferAttribute(extinctions, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geo, material: mat };
  }, [stars]);

  // Dispose on unmount
  useFrame(() => {
    // Could add twinkling animation here
  });

  if (!visible || stars.length === 0) return null;

  return (
    <points ref={pointsRef} geometry={geometry} material={material} />
  );
}
