"use client";

import { MutableRefObject, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

const TRAIL_LENGTH = 6;

// A cheap fake motion-blur: a short chain of fading, shrinking spheres
// following the ball's last few positions. `positionsRef` is a plain
// mutable ref array the parent scene's own ball useFrame pushes recent
// positions onto — read directly here (not via React state/props) so
// updating the trail every frame doesn't trigger a re-render.
export default function BallTrail({ positionsRef }: { positionsRef: MutableRefObject<[number, number, number][]> }) {
  const groupRef = useRef<Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const positions = positionsRef.current;
    const children = groupRef.current.children;
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const child = children[i];
      if (!child) continue;
      const posIndex = positions.length - 1 - i;
      if (posIndex >= 0) {
        child.visible = true;
        const [x, y, z] = positions[posIndex];
        child.position.set(x, y, z);
        const scale = (1 - i / TRAIL_LENGTH) * 0.8;
        child.scale.setScalar(scale);
      } else {
        child.visible = false;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: TRAIL_LENGTH }).map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.16, 8, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.35 * (1 - i / TRAIL_LENGTH)} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
