// Constellation name labels rendered as HTML overlays

import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { ConstellationData } from '../../stores/planetariumStore';
import { raDecToVec3 } from '../../utils/celestialMath';

interface ConstellationLabelsProps {
  constellations: ConstellationData[];
  visible?: boolean;
}

interface LabelData {
  position: THREE.Vector3;
  name: string;
  abbreviation: string;
}

export function ConstellationLabels({ constellations, visible = true }: ConstellationLabelsProps) {
  const labels = useMemo<LabelData[]>(() => {
    return constellations.map((c) => ({
      position: raDecToVec3(c.label_ra, c.label_dec, 98),
      name: c.name,
      abbreviation: c.abbreviation,
    }));
  }, [constellations]);

  if (!visible || constellations.length === 0) return null;

  return (
    <>
      {labels.map((label) => (
        <ConstellationLabel key={label.abbreviation} label={label} />
      ))}
    </>
  );
}

function ConstellationLabel({ label }: { label: LabelData }) {
  const { camera } = useThree();

  // Check if label is roughly in front of camera
  const dir = label.position.clone().normalize();
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  const dot = dir.dot(camDir);

  // Only show if within ~90 degrees of camera direction
  if (dot < 0.1) return null;

  return (
    <Html
      position={label.position}
      center
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
      }}
      zIndexRange={[0, 0]}
    >
      <div
        className="text-[10px] font-medium tracking-wide uppercase whitespace-nowrap"
        style={{
          color: 'rgba(120, 144, 156, 0.6)',
          textShadow: '0 0 4px rgba(0,0,0,0.8)',
        }}
      >
        {label.name}
      </div>
    </Html>
  );
}
