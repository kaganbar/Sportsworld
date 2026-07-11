"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Mesh } from "three";
import Player from "./Player";
import Crowd from "./Crowd";
import { Stand, FloodlightPole } from "./Stadium";

const HOME_COLOR = "#ea580c";
const AWAY_COLOR = "#1d4ed8";
const GLOW = "#fff2e0";

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

// Subtle camera drift — a background element, not the focus, so the
// amplitude stays small. Replaces the fully static camera from
// SportBackgroundCanvas's fixed position prop.
function CameraDrift() {
  const { camera } = useThree();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    camera.position.x = Math.sin(t * 0.07) * 1.4;
    camera.position.y = 6 + Math.sin(t * 0.05) * 0.3;
    camera.lookAt(0, 0, 0);
  });
  return null;
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
      <CameraDrift />
      <ambientLight intensity={0.45} />
      <directionalLight position={[5, 8, 4]} intensity={0.6} />
      <spotLight position={[0, 9, 0]} angle={0.65} penumbra={0.5} intensity={0.85} color={GLOW} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[15, 8]} />
        <meshStandardMaterial color="#a9713f" />
      </mesh>
      <Hoop x={-5.5} />
      <Hoop x={5.5} />

      {/* arena stands + crowd along both long sides — crowd rows sit above
          the stand's top edge (tiered seating), not behind/below it */}
      <Stand position={[0, 0.55, -4.9]} width={15} />
      <Crowd position={[0, 1.25, -5.4]} accentColor={HOME_COLOR} rows={4} />
      <Stand position={[0, 0.55, 4.9]} rotation={[0.25, Math.PI, 0]} width={15} />
      <Crowd position={[0, 1.25, 5.4]} rotation={[0, Math.PI, 0]} accentColor={AWAY_COLOR} rows={4} />

      <FloodlightPole position={[-7.8, 0, -4.3]} glowColor={GLOW} />
      <FloodlightPole position={[7.8, 0, -4.3]} glowColor={GLOW} />
      <FloodlightPole position={[-7.8, 0, 4.3]} glowColor={GLOW} />
      <FloodlightPole position={[7.8, 0, 4.3]} glowColor={GLOW} />

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
