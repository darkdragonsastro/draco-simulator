// Sky gradient sphere with atmosphere/twilight shader driven by sun altitude

import { useMemo } from 'react';
import * as THREE from 'three';

interface SkyGradientProps {
  sunAltitude: number; // degrees, negative = below horizon
  visible?: boolean;
}

const skyVertexShader = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragmentShader = `
  uniform float sunAltitude;
  varying vec3 vWorldPosition;

  vec3 nightSky = vec3(0.01, 0.01, 0.03);
  vec3 twilightHorizon = vec3(0.6, 0.3, 0.1);
  vec3 twilightZenith = vec3(0.05, 0.05, 0.15);
  vec3 daySkyZenith = vec3(0.15, 0.35, 0.7);
  vec3 daySkyHorizon = vec3(0.5, 0.65, 0.85);

  void main() {
    // Normalize position to get direction from center
    vec3 dir = normalize(vWorldPosition);

    // Elevation: z component in equatorial frame maps roughly to alt
    // (not exact since we're in equatorial frame, but good enough for the gradient)
    float elevation = dir.z; // -1 to 1 (south pole to north pole)

    // Normalized sun altitude: -18 to +20 degrees mapped to 0-1
    float sunFactor = clamp((sunAltitude + 18.0) / 38.0, 0.0, 1.0);

    vec3 color;

    if (sunAltitude < -18.0) {
      // Full night: near black with slight blue tint
      color = nightSky;
    } else if (sunAltitude < -6.0) {
      // Astronomical/nautical twilight: dark blue deepening
      float t = (sunAltitude + 18.0) / 12.0; // 0 at -18, 1 at -6
      vec3 horizonColor = mix(nightSky, twilightHorizon * 0.3, t);
      vec3 zenithColor = mix(nightSky, twilightZenith, t * 0.5);
      float horizonFade = 1.0 - abs(elevation);
      horizonFade = pow(horizonFade, 3.0);
      color = mix(zenithColor, horizonColor, horizonFade);
    } else if (sunAltitude < 0.0) {
      // Civil twilight: orange/pink at horizon
      float t = (sunAltitude + 6.0) / 6.0; // 0 at -6, 1 at 0
      vec3 horizonColor = mix(twilightHorizon * 0.3, twilightHorizon, t);
      vec3 zenithColor = mix(twilightZenith, daySkyZenith * 0.3, t);
      float horizonFade = 1.0 - abs(elevation);
      horizonFade = pow(horizonFade, 2.0);
      color = mix(zenithColor, horizonColor, horizonFade);
    } else {
      // Daytime: blue sky
      float t = clamp(sunAltitude / 20.0, 0.0, 1.0);
      vec3 zenithColor = mix(daySkyZenith * 0.3, daySkyZenith, t);
      vec3 horizonColor = mix(twilightHorizon, daySkyHorizon, t);
      float horizonFade = 1.0 - abs(elevation);
      horizonFade = pow(horizonFade, 1.5);
      color = mix(zenithColor, horizonColor, horizonFade);
    }

    // Below-horizon darkening (ground)
    if (elevation < -0.02) {
      float groundFade = clamp(-elevation * 5.0, 0.0, 1.0);
      color = mix(color, vec3(0.02, 0.02, 0.03), groundFade);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function SkyGradient({ sunAltitude, visible = true }: SkyGradientProps) {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
      uniforms: {
        sunAltitude: { value: sunAltitude },
      },
      side: THREE.BackSide,
      depthWrite: false,
    });
  }, []);

  // Update uniform when sun altitude changes
  useMemo(() => {
    material.uniforms.sunAltitude.value = sunAltitude;
  }, [material, sunAltitude]);

  if (!visible) return null;

  return (
    <mesh material={material}>
      <sphereGeometry args={[200, 64, 32]} />
    </mesh>
  );
}
