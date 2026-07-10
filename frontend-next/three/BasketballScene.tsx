"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import Player from "./Player";

const HOME_COLOR = "#ea580c";
const AWAY_COLOR = "#1d4ed8";

function Hoop({ x }: { x: number }) {
  return (
    <group position={[x, 0, -3]}>
      <mesh position={[0, 2.6, 0]}>
        <boxGeometry args={[1.2, 1, 0.05]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>
      <mesh position={[0, 2.1, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.3, 0.03, 8, 24]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
    </group>
  );
}

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
      <Hoop x={-5.5} />
      <Hoop x={5.5} />
      <Player
        color={HOME_COLOR}
        animation="run"
        scale={0.5}
        orbit={{ radius: 2.2, speed: 0.5, offset: 0, y: 0, zScale: 0.5 }}
      />
      <Player
        color={AWAY_COLOR}
        animation="run"
        scale={0.5}
        orbit={{ radius: 1.6, speed: 0.65, offset: 2.5, y: 0, zScale: 0.5 }}
      />
      <Player color={HOME_COLOR} animation="idle" scale={0.5} position={[4.6, 0, -2.6]} rotationY={Math.PI} />
      <mesh ref={ballRef}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#ea580c" />
      </mesh>
    </>
  );
}
