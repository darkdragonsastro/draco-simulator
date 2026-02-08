import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useMountStore } from '../../stores/mountStore';

const DEG2RAD = Math.PI / 180;

// NINA theme colors
const COLORS = {
  pier: '#455A64',
  head: '#2A2C31',
  accent: '#00BCA6',
  tube: '#E0E0E0',
  weight: '#37474F',
  saddle: '#3E4147',
  dewShield: '#B0BEC5',
  guideScope: '#78909C',
};

function PierColumn() {
  return (
    <mesh position={[0, 0.6, 0]}>
      <cylinderGeometry args={[0.06, 0.07, 0.7, 16]} />
      <meshStandardMaterial color={COLORS.pier} />
    </mesh>
  );
}

function MountHead() {
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[0.16, 0.14, 0.14]} />
      <meshStandardMaterial color={COLORS.head} />
    </mesh>
  );
}

function RAShaft() {
  return (
    <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.035, 0.035, 0.15, 12]} />
      <meshStandardMaterial color={COLORS.pier} />
    </mesh>
  );
}

function SettingCircle() {
  return (
    <mesh position={[0, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.07, 0.008, 8, 32]} />
      <meshStandardMaterial color={COLORS.accent} />
    </mesh>
  );
}

function CounterweightBar() {
  return (
    <group>
      {/* Bar */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.4, 8]} />
        <meshStandardMaterial color={COLORS.pier} />
      </mesh>
      {/* Weight */}
      <mesh position={[0, -0.45, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.08, 16]} />
        <meshStandardMaterial color={COLORS.weight} />
      </mesh>
    </group>
  );
}

function DecHousing() {
  return (
    <mesh position={[0, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.05, 0.05, 0.12, 12]} />
      <meshStandardMaterial color={COLORS.head} />
    </mesh>
  );
}

function DovetailSaddle() {
  return (
    <mesh position={[0, 0.14, 0]}>
      <boxGeometry args={[0.08, 0.02, 0.2]} />
      <meshStandardMaterial color={COLORS.saddle} />
    </mesh>
  );
}

function TelescopeTube() {
  return (
    <group position={[0, 0.22, 0]}>
      {/* Main tube */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.5, 16]} />
        <meshStandardMaterial color={COLORS.tube} />
      </mesh>
      {/* Dew shield */}
      <mesh position={[0, 0, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.065, 0.055, 0.08, 16]} />
        <meshStandardMaterial color={COLORS.dewShield} />
      </mesh>
      {/* Camera body */}
      <mesh position={[0, 0, -0.3]}>
        <boxGeometry args={[0.162, 0.162, 0.108]} />
        <meshStandardMaterial color={COLORS.head} />
      </mesh>
    </group>
  );
}

function GuideScope() {
  return (
    <mesh position={[0.06, 0.18, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.015, 0.015, 0.15, 8]} />
      <meshStandardMaterial color={COLORS.guideScope} />
    </mesh>
  );
}

function GEMModel({ latitudeDeg }: { latitudeDeg: number }) {
  const raAxisRef = useRef<THREE.Group>(null!);
  const decAxisRef = useRef<THREE.Group>(null!);
  const currentRA = useRef(0);
  const currentDec = useRef(0);

  const status = useMountStore((s) => s.status);

  useFrame((_, delta) => {
    if (!raAxisRef.current || !decAxisRef.current) return;

    const targetRA = status.ra_axis_deg * DEG2RAD;
    const targetDec = status.dec_axis_deg * DEG2RAD;

    // Smooth interpolation for 60fps from 10Hz WS data
    const speed = delta * 8;
    currentRA.current += (targetRA - currentRA.current) * Math.min(speed, 1);
    currentDec.current += (targetDec - currentDec.current) * Math.min(speed, 1);

    raAxisRef.current.rotation.y = currentRA.current;
    decAxisRef.current.rotation.x = currentDec.current;
  });

  return (
    <group>
      <PierColumn />
      {/* Polar tilt group */}
      <group position={[0, 0.95, 0]} rotation={[latitudeDeg * DEG2RAD, 0, 0]}>
        {/* RA rotation group */}
        <group ref={raAxisRef}>
          <MountHead />
          <RAShaft />
          <SettingCircle />
          <CounterweightBar />
          {/* DEC rotation group */}
          <group ref={decAxisRef} position={[0, 0.08, 0]}>
            <DecHousing />
            <DovetailSaddle />
            <TelescopeTube />
            <GuideScope />
          </group>
        </group>
      </group>
    </group>
  );
}

export function TelescopeMount3D() {
  const connected = useMountStore((s) => s.status.connected);

  return (
    <div className="w-full h-full min-h-[280px] bg-nina-bg rounded border border-nina-border">
      {connected ? (
        <Canvas
          camera={{ position: [2, 1.5, 2], fov: 45 }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <directionalLight position={[-3, 2, -2]} intensity={0.3} />
          <OrbitControls
            enablePan={false}
            minDistance={1.5}
            maxDistance={5}
            target={[0, 0.7, 0]}
          />
          <GEMModel latitudeDeg={34.0522} />
        </Canvas>
      ) : (
        <div className="flex items-center justify-center h-full text-nina-text-dim text-sm">
          Connect mount to view 3D model
        </div>
      )}
    </div>
  );
}
