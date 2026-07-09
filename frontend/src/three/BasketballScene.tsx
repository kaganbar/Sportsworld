import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

export default function BasketballScene() {
  const ballRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!ballRef.current) return;
    ballRef.current.position.x = Math.sin(t * 0.4) * 4;
    ballRef.current.position.z = Math.cos(t * 0.25) * 2;
    ballRef.current.position.y = 0.4 + Math.abs(Math.sin(t * 3)) * 0.6; // bounce
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 4]} intensity={1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[15, 8]} />
        <meshStandardMaterial color="#a9713f" />
      </mesh>
      <mesh ref={ballRef}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#ea580c" />
      </mesh>
    </>
  );
}
