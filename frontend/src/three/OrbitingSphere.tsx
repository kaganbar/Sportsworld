import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

// Shared building block for both scenes: a sphere drifting on a simple
// circular path. Varying radius/speed/offset per instance is enough to fake
// "players moving around" without any real animation/skeleton assets.
export default function OrbitingSphere({
  radius,
  speed,
  color,
  offset,
  size = 0.3,
  y = 0.3,
}: {
  radius: number;
  speed: number;
  color: string;
  offset: number;
  size?: number;
  y?: number;
}) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + offset;
    ref.current?.position.set(Math.cos(t) * radius, y, Math.sin(t) * radius * 0.55);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
