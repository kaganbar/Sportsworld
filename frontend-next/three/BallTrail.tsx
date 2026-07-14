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
//
// `baseSize` defaults to football/basketball's original hardcoded 0.16 (their
// ball radii are 0.11/0.12, so this already reads as a deliberately oversized
// motion-blur streak, not the ball's own size) — tennis's ball is 0.034, over
// 4x smaller, so the same 0.16 would render trail blobs visibly bigger than
// the ball itself. Callers with a much smaller ball should pass a smaller
// baseSize instead of inheriting this default.
export default function BallTrail({
  positionsRef,
  baseSize = 0.16,
}: {
  positionsRef: MutableRefObject<[number, number, number][]>;
  baseSize?: number;
}) {
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
          <sphereGeometry args={[baseSize, 8, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.35 * (1 - i / TRAIL_LENGTH)} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
