// Deep sky object markers rendered on the celestial sphere
// Renders Stellarium-style image quads when available, falls back to colored circles

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { VisibleObject } from '../../api/client';
import { raDecToVec3 } from '../../utils/celestialMath';
import { useDSOImageStore } from '../../stores/dsoImageStore';
import { DSOImageQuad } from './DSOImageQuad';

interface DSOMarkersProps {
  visibleObjects: VisibleObject[];
  selectedTarget?: VisibleObject | null;
  onSelectTarget?: (target: VisibleObject) => void;
  onSlewToTarget?: (ra: number, dec: number) => void;
  mountConnected?: boolean;
  visible?: boolean;
  showImages?: boolean;
}

const DSO_COLORS: Record<string, string> = {
  galaxy: '#ff6b6b',
  nebula: '#9775fa',
  emission: '#9775fa',
  planetary_nebula: '#da77f2',
  open_cluster: '#fcc419',
  globular_cluster: '#fab005',
  cluster_nebula: '#ffa94d',
  unknown: '#4dabf7',
};

function getDSOColor(type: string): string {
  return DSO_COLORS[type] || DSO_COLORS.unknown;
}

// Texture cache for fallback sprite images
const textureCache = new Map<string, THREE.Texture>();
const loader = new THREE.TextureLoader();

function getCachedTexture(url: string): Promise<THREE.Texture> {
  const cached = textureCache.get(url);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (tex) => {
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        textureCache.set(url, tex);
        resolve(tex);
      },
      undefined,
      reject
    );
  });
}

export function DSOMarkers({
  visibleObjects,
  selectedTarget,
  onSelectTarget,
  onSlewToTarget,
  mountConnected = false,
  visible = true,
  showImages = true,
}: DSOMarkersProps) {
  const { camera } = useThree();
  const getImageData = useDSOImageStore((s) => s.getImageData);
  const manifestLoaded = useDSOImageStore((s) => s.loaded);
  const fetchManifest = useDSOImageStore((s) => s.fetchManifest);

  // Load manifest on mount
  useEffect(() => {
    fetchManifest();
  }, [fetchManifest]);

  const markers = useMemo(() => {
    return visibleObjects.map((obj) => ({
      obj,
      position: raDecToVec3(obj.object.ra, obj.object.dec, 98),
      color: getDSOColor(obj.object.type),
      size: Math.max(0.5, 2 - obj.object.vmag / 6),
    }));
  }, [visibleObjects]);

  if (!visible || visibleObjects.length === 0) return null;

  return (
    <>
      {markers.map((marker) => {
        const imageData = manifestLoaded ? getImageData(marker.obj.object.id) : undefined;
        const shouldShowQuad = showImages && imageData !== undefined;

        return (
          <group key={marker.obj.object.id}>
            {/* Stellarium-style image quad when available and enabled */}
            {shouldShowQuad && imageData && (
              <DSOImageQuad
                imageData={imageData}
                obj={marker.obj}
                onSelect={onSelectTarget}
              />
            )}

            {/* Fallback colored circle marker (always shown when no quad, or when images disabled) */}
            {!shouldShowQuad && (
              <FallbackMarker
                marker={marker}
                isSelected={selectedTarget?.object.id === marker.obj.object.id}
                onSelect={onSelectTarget}
                camera={camera}
                showImages={showImages}
              />
            )}

            {/* Label and selection ring always rendered */}
            <MarkerOverlay
              marker={marker}
              isSelected={selectedTarget?.object.id === marker.obj.object.id}
              hasImageQuad={shouldShowQuad}
              camera={camera}
              imageCredit={imageData?.credit}
              onSlewToTarget={onSlewToTarget}
              mountConnected={mountConnected}
            />
          </group>
        );
      })}
    </>
  );
}

interface MarkerData {
  obj: VisibleObject;
  position: THREE.Vector3;
  color: string;
  size: number;
}

// Colored circle fallback marker (for objects without Stellarium images or when images toggled off)
function FallbackMarker({
  marker,
  isSelected,
  onSelect,
  camera,
  showImages,
}: {
  marker: MarkerData;
  isSelected: boolean;
  onSelect?: (target: VisibleObject) => void;
  camera: THREE.Camera;
  showImages: boolean;
}) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const loadingRef = useRef(false);

  // Load old-style sprite texture when images are enabled and available
  useEffect(() => {
    if (showImages && marker.obj.object.image_url && !loadingRef.current) {
      loadingRef.current = true;
      getCachedTexture(marker.obj.object.image_url)
        .then(setTex)
        .catch(() => setTex(null))
        .finally(() => { loadingRef.current = false; });
    }
    if (!showImages) {
      setTex(null);
    }
  }, [showImages, marker.obj.object.image_url]);

  const handleClick = useCallback(() => {
    onSelect?.(marker.obj);
  }, [onSelect, marker.obj]);

  // Frustum culling
  const dir = marker.position.clone().normalize();
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  const dot = dir.dot(camDir);
  if (dot < -0.1) return null;

  const majorArcmin = marker.obj.object.size_major || 5;
  const minorArcmin = marker.obj.object.size_minor || majorArcmin;
  const spriteScale = 0.06;
  const spriteW = Math.max(1.5, majorArcmin * spriteScale);
  const spriteH = Math.max(1.5, minorArcmin * spriteScale);

  const showTexturedSprite = tex && showImages;

  return (
    <group position={marker.position}>
      {showTexturedSprite ? (
        <mesh onClick={handleClick}>
          <planeGeometry args={[spriteW, spriteH]} />
          <meshBasicMaterial
            map={tex}
            transparent
            opacity={isSelected ? 0.95 : 0.8}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ) : (
        <mesh onClick={handleClick}>
          <circleGeometry args={[marker.size, 8]} />
          <meshBasicMaterial
            color={marker.color}
            transparent
            opacity={isSelected ? 1 : 0.7}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

// Label and selection ring overlay (rendered for all DSOs regardless of image mode)
function MarkerOverlay({
  marker,
  isSelected,
  hasImageQuad,
  camera,
  imageCredit,
  onSlewToTarget,
  mountConnected,
}: {
  marker: MarkerData;
  isSelected: boolean;
  hasImageQuad: boolean;
  camera: THREE.Camera;
  imageCredit?: string;
  onSlewToTarget?: (ra: number, dec: number) => void;
  mountConnected?: boolean;
}) {
  // Frustum culling
  const dir = marker.position.clone().normalize();
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  const dot = dir.dot(camDir);
  if (dot < -0.1) return null;

  const majorArcmin = marker.obj.object.size_major || 5;
  const minorArcmin = marker.obj.object.size_minor || majorArcmin;
  const spriteScale = 0.06;
  const spriteW = Math.max(1.5, majorArcmin * spriteScale);
  const spriteH = Math.max(1.5, minorArcmin * spriteScale);

  const ringRadius = hasImageQuad
    ? Math.max(spriteW, spriteH) / 2 + 0.3
    : marker.size + 0.3;
  const ringOuterRadius = hasImageQuad
    ? Math.max(spriteW, spriteH) / 2 + 0.6
    : marker.size + 0.6;

  return (
    <group position={marker.position}>
      {isSelected && (
        <mesh>
          <ringGeometry args={[ringRadius, ringOuterRadius, 16]} />
          <meshBasicMaterial
            color="#00BCA6"
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
      {(isSelected || marker.obj.object.vmag < 7) && (
        <Html
          position={[
            (hasImageQuad ? spriteW / 2 : marker.size) + 1,
            0.5,
            0,
          ]}
          style={{ pointerEvents: isSelected && mountConnected && onSlewToTarget ? 'auto' : 'none' }}
          zIndexRange={[0, 0]}
        >
          <div
            className="text-[10px] whitespace-nowrap"
            style={{
              color: isSelected ? '#ECEFF1' : '#78909C',
              fontWeight: isSelected ? 600 : 400,
              textShadow: '0 0 4px rgba(0,0,0,0.9)',
            }}
          >
            <span className="flex items-center gap-1">
              {marker.obj.object.name || marker.obj.object.id}
              {isSelected && mountConnected && onSlewToTarget && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSlewToTarget(marker.obj.object.ra, marker.obj.object.dec);
                  }}
                  className="inline-flex items-center px-1 py-0.5 rounded text-[9px] bg-nina-accent/30 hover:bg-nina-accent/50 text-nina-accent"
                  style={{ pointerEvents: 'auto', textShadow: 'none' }}
                  title={`Slew to ${marker.obj.object.name || marker.obj.object.id}`}
                >
                  Slew
                </button>
              )}
            </span>
            {isSelected && imageCredit && (
              <div className="text-[8px] text-nina-text-dim mt-0.5">
                Image: {imageCredit}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
