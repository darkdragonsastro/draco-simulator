// Custom camera controller for planetarium view
// Camera stays at origin, rotates to look outward at the celestial sphere
// Mouse drag rotates view direction, scroll wheel changes FOV

import { useRef, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlanetariumStore } from '../../stores/planetariumStore';
import { vec3ToRaDec } from '../../utils/celestialMath';

const DEG2RAD = Math.PI / 180;

interface SkyControlsProps {
  enabled?: boolean;
  onContextMenu?: (x: number, y: number, ra: number, dec: number) => void;
}

export function SkyControls({ enabled = true, onContextMenu }: SkyControlsProps) {
  const { camera, gl } = useThree();
  const setView = usePlanetariumStore((s) => s.setView);
  const view = usePlanetariumStore((s) => s.view);

  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const targetRA = useRef(view.centerRA);
  const targetDec = useRef(view.centerDec);
  const targetFov = useRef(view.fov);
  const currentRA = useRef(view.centerRA);
  const currentDec = useRef(view.centerDec);
  const currentFov = useRef(view.fov);

  // Sync from store on mount
  useEffect(() => {
    targetRA.current = view.centerRA;
    targetDec.current = view.centerDec;
    targetFov.current = view.fov;
  }, [view.centerRA, view.centerDec, view.fov]);

  const updateCamera = useCallback(() => {
    const raRad = currentRA.current * DEG2RAD;
    const decRad = currentDec.current * DEG2RAD;

    // Look direction from origin toward RA/Dec on sphere
    const lookDir = new THREE.Vector3(
      Math.cos(decRad) * Math.cos(raRad),
      Math.cos(decRad) * Math.sin(raRad),
      Math.sin(decRad)
    );

    camera.position.set(0, 0, 0);
    camera.lookAt(lookDir);

    // Up vector: toward celestial north pole
    camera.up.set(0, 0, 1);

    if ((camera as THREE.PerspectiveCamera).fov !== currentFov.current) {
      (camera as THREE.PerspectiveCamera).fov = currentFov.current;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }
  }, [camera]);

  // Smooth animation toward target
  useFrame((_, delta) => {
    if (!enabled) return;

    const speed = Math.min(delta * 12, 1);
    currentRA.current += (targetRA.current - currentRA.current) * speed;
    currentDec.current += (targetDec.current - currentDec.current) * speed;
    currentFov.current += (targetFov.current - currentFov.current) * speed;

    updateCamera();
  });

  // Mouse event handlers
  useEffect(() => {
    if (!enabled) return;

    const domElement = gl.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        domElement.style.cursor = 'grabbing';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };

      // Scale rotation by FOV for consistent feel
      const sensitivity = currentFov.current / domElement.clientHeight;
      targetRA.current = (targetRA.current - dx * sensitivity + 360) % 360;
      targetDec.current = Math.max(-90, Math.min(90, targetDec.current + dy * sensitivity));

      setView({ centerRA: targetRA.current, centerDec: targetDec.current });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      domElement.style.cursor = 'grab';
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      targetFov.current = Math.max(5, Math.min(120, targetFov.current * zoomFactor));
      setView({ fov: targetFov.current });
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if (!onContextMenu) return;

      // Convert mouse position to normalized device coordinates
      const rect = domElement.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Raycast from camera — camera is at origin, so ray direction = sky position
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const dir = raycaster.ray.direction.clone().normalize();
      const { ra, dec } = vec3ToRaDec(dir);

      onContextMenu(e.clientX, e.clientY, ra, dec);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      const panStep = currentFov.current * 0.1;
      switch (e.key) {
        case 'ArrowLeft':
          targetRA.current = (targetRA.current + panStep + 360) % 360;
          setView({ centerRA: targetRA.current });
          e.preventDefault();
          break;
        case 'ArrowRight':
          targetRA.current = (targetRA.current - panStep + 360) % 360;
          setView({ centerRA: targetRA.current });
          e.preventDefault();
          break;
        case 'ArrowUp':
          targetDec.current = Math.min(90, targetDec.current + panStep);
          setView({ centerDec: targetDec.current });
          e.preventDefault();
          break;
        case 'ArrowDown':
          targetDec.current = Math.max(-90, targetDec.current - panStep);
          setView({ centerDec: targetDec.current });
          e.preventDefault();
          break;
        case '=':
        case '+':
          targetFov.current = Math.max(5, targetFov.current * 0.85);
          setView({ fov: targetFov.current });
          e.preventDefault();
          break;
        case '-':
          targetFov.current = Math.min(120, targetFov.current * 1.15);
          setView({ fov: targetFov.current });
          e.preventDefault();
          break;
        case ' ':
          targetRA.current = 0;
          targetDec.current = 45;
          targetFov.current = 60;
          setView({ centerRA: 0, centerDec: 45, fov: 60 });
          e.preventDefault();
          break;
      }
    };

    domElement.style.cursor = 'grab';
    domElement.addEventListener('mousedown', handleMouseDown);
    domElement.addEventListener('mousemove', handleMouseMove);
    domElement.addEventListener('mouseup', handleMouseUp);
    domElement.addEventListener('mouseleave', handleMouseUp);
    domElement.addEventListener('wheel', handleWheel, { passive: false });
    domElement.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      domElement.removeEventListener('mousedown', handleMouseDown);
      domElement.removeEventListener('mousemove', handleMouseMove);
      domElement.removeEventListener('mouseup', handleMouseUp);
      domElement.removeEventListener('mouseleave', handleMouseUp);
      domElement.removeEventListener('wheel', handleWheel);
      domElement.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, gl, camera, setView, updateCamera, onContextMenu]);

  return null;
}
