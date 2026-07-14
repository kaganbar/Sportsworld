"use client";

import { MutableRefObject, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const RIPPLE_DURATION = 0.7;

// A cheap real net reaction: a plane's own vertices are displaced by a
// decaying sine wave for ~0.7s after `hitAtRef` is set to the current
// elapsed time (the caller's Ball component does this the instant a shot/
// goal lands) — a real per-vertex ripple, not a swapped sprite or a scale
// pulse. Rest pose is restored with one final write once the ripple ends,
// not rewritten every frame afterward.
export default function Net({
  width,
  height,
  hitAtRef,
  position,
  rotation,
}: {
  width: number;
  height: number;
  hitAtRef: MutableRefObject<number>;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => new THREE.PlaneGeometry(width, height, 6, 8), [width, height]);
  const basePositions = useMemo(() => Float32Array.from(geometry.attributes.position.array), [geometry]);
  const settledRef = useRef(true);

  useFrame(({ clock }) => {
    const pos = geometry.attributes.position;
    const t = clock.getElapsedTime() - hitAtRef.current;
    if (t >= 0 && t < RIPPLE_DURATION) {
      settledRef.current = false;
      const decay = 1 - t / RIPPLE_DURATION;
      for (let i = 0; i < pos.count; i++) {
        const by = basePositions[i * 3 + 1];
        const distFromTop = height / 2 - by; // 0 at the rim, `height` at the net's bottom
        const wave = Math.sin(distFromTop * 3 - t * 18) * decay * (distFromTop / height) * 0.18;
        pos.setZ(i, basePositions[i * 3 + 2] + wave);
      }
      pos.needsUpdate = true;
    } else if (!settledRef.current) {
      for (let i = 0; i < pos.count; i++) pos.setZ(i, basePositions[i * 3 + 2]);
      pos.needsUpdate = true;
      settledRef.current = true;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={position} rotation={rotation}>
      <meshStandardMaterial color="#e5e7eb" transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
}
