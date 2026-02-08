// Milky Way texture mapped onto an inner sphere with additive blending

import { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';

interface MilkyWayProps {
  visible?: boolean;
}

export function MilkyWay({ visible = true }: MilkyWayProps) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      '/milky-way-panoramic.jpg',
      (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        setTexture(tex);
      },
      undefined,
      () => {
        // Texture not available - silently skip
      }
    );
  }, []);

  const material = useMemo(() => {
    if (!texture) return null;
    return new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [texture]);

  if (!visible || !material) return null;

  return (
    <mesh material={material}>
      <sphereGeometry args={[98, 64, 32]} />
    </mesh>
  );
}
