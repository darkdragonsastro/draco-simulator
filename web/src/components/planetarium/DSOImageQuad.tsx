// Stellarium-style DSO image quad rendered as a textured mesh on the celestial sphere
// Uses additive blending so black backgrounds become transparent

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { DSOImageEntry } from '../../stores/dsoImageStore';
import type { VisibleObject } from '../../api/client';
import { createDSOQuadPositions } from '../../utils/celestialMath';

// Shared texture cache and loader (same pattern as DSOMarkers)
const textureCache = new Map<string, THREE.Texture>();
const loader = new THREE.TextureLoader();

function getCachedTexture(url: string): Promise<THREE.Texture> {
  const cached = textureCache.get(url);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (tex) => {
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        textureCache.set(url, tex);
        resolve(tex);
      },
      undefined,
      reject
    );
  });
}

interface DSOImageQuadProps {
  imageData: DSOImageEntry;
  obj: VisibleObject;
  onSelect?: (target: VisibleObject) => void;
}

export function DSOImageQuad({ imageData, obj, onSelect }: DSOImageQuadProps) {
  const { camera, size: viewportSize } = useThree();
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const loadingRef = useRef(false);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);

  // Load texture
  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    getCachedTexture(imageData.imageUrl)
      .then(setTex)
      .catch(() => setTex(null))
      .finally(() => { loadingRef.current = false; });
  }, [imageData.imageUrl]);

  // Build geometry from corner coordinates
  const geometry = useMemo(() => {
    const corners = [
      imageData.corners.bottomLeft,
      imageData.corners.bottomRight,
      imageData.corners.topRight,
      imageData.corners.topLeft,
    ];
    const { positions, uvs, indices } = createDSOQuadPositions(corners, 98);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geom.setIndex(new THREE.BufferAttribute(indices, 1));
    geom.computeVertexNormals();

    // Clean up previous
    if (geometryRef.current) geometryRef.current.dispose();
    geometryRef.current = geom;
    return geom;
  }, [imageData.corners]);

  // Compute quad center for frustum culling
  const quadCenter = useMemo(() => {
    const corners = [
      imageData.corners.bottomLeft,
      imageData.corners.bottomRight,
      imageData.corners.topRight,
      imageData.corners.topLeft,
    ];
    const avgRa = corners.reduce((s, c) => s + c.ra, 0) / 4;
    const avgDec = corners.reduce((s, c) => s + c.dec, 0) / 4;
    const DEG2RAD = Math.PI / 180;
    const raRad = avgRa * DEG2RAD;
    const decRad = avgDec * DEG2RAD;
    const cosDec = Math.cos(decRad);
    return new THREE.Vector3(
      cosDec * Math.cos(raRad),
      cosDec * Math.sin(raRad),
      Math.sin(decRad)
    ).normalize();
  }, [imageData.corners]);

  const handleClick = useCallback(() => {
    onSelect?.(obj);
  }, [onSelect, obj]);

  if (!tex) return null;

  // Frustum culling: check if quad center is visible
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  const dot = quadCenter.dot(camDir);
  if (dot < -0.1) return null;

  // LOD check: only show when zoomed in enough
  // cameraFOV in degrees / viewport width in pixels = degrees per pixel
  const perspCam = camera as THREE.PerspectiveCamera;
  const degreesPerPixel = perspCam.fov / viewportSize.height;
  if (degreesPerPixel > imageData.minResolution) return null;

  return (
    <mesh geometry={geometry} onClick={handleClick}>
      <meshBasicMaterial
        map={tex}
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
