"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Mesh } from "three";
import Player from "./Player";
import Crowd from "./Crowd";
import { Stand, FloodlightPole } from "./Stadium";

const PLAYER_1_COLOR = "#ffffff";
const PLAYER_2_COLOR = "#1e40af";
const COURT_HALF_LENGTH = 7;
const COURT_HALF_WIDTH = 3.5;
const GLOW = "#eef3ff";

// Subtle camera drift — a background element, not the focus, so the
// amplitude stays small. Replaces the fully static camera from
// SportBackgroundCanvas's fixed position prop.
function CameraDrift() {
  const { camera } = useThree();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    camera.position.x = Math.sin(t * 0.06) * 1.2;
    camera.position.y = 6 + Math.sin(t * 0.05) * 0.3;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function TennisScene() {
  const ballRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!ballRef.current) return;
    // volleys back and forth over the net, roughly following each rally swing
    ballRef.current.position.z = Math.sin(t * 0.5) * COURT_HALF_LENGTH * 0.8;
    ballRef.current.position.x = Math.sin(t * 0.5 + Math.PI / 2) * 1.5;
    ballRef.current.position.y = 0.5 + Math.abs(Math.sin(t * 1.0)) * 1.4;
  });

  return (
    <>
      <CameraDrift />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 4]} intensity={0.65} />
      <spotLight position={[0, 9, 0]} angle={0.6} penumbra={0.5} intensity={0.7} color={GLOW} />

      {/* grass court */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[COURT_HALF_WIDTH * 2 + 3, COURT_HALF_LENGTH * 2 + 3]} />
        <meshStandardMaterial color="#2f6b3c" />
      </mesh>
      {/* court boundary lines */}
      <mesh position={[0, -0.49, -COURT_HALF_LENGTH]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[COURT_HALF_WIDTH * 2, 0.08]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, -0.49, COURT_HALF_LENGTH]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[COURT_HALF_WIDTH * 2, 0.08]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-COURT_HALF_WIDTH, -0.49, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.08, COURT_HALF_LENGTH * 2]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[COURT_HALF_WIDTH, -0.49, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.08, COURT_HALF_LENGTH * 2]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* net */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[COURT_HALF_WIDTH * 2 + 0.6, 0.5, 0.05]} />
        <meshStandardMaterial color="#e5e7eb" transparent opacity={0.85} />
      </mesh>

      {/* stadium stands along both sides, rotated so their long axis runs
          the length of the court, plus a crowd above each (tiered seating,
          not hidden behind/below the stand wall) */}
      <Stand position={[-COURT_HALF_WIDTH - 1.4, 0.55, 0]} rotation={[0.25, Math.PI / 2, 0]} width={COURT_HALF_LENGTH * 2 + 3} />
      <Crowd
        position={[-COURT_HALF_WIDTH - 1.9, 1.25, 0]}
        rotation={[0, Math.PI / 2, 0]}
        accentColor={PLAYER_2_COLOR}
        rows={4}
        seatsPerRow={20}
      />
      <Stand position={[COURT_HALF_WIDTH + 1.4, 0.55, 0]} rotation={[0.25, -Math.PI / 2, 0]} width={COURT_HALF_LENGTH * 2 + 3} />
      <Crowd
        position={[COURT_HALF_WIDTH + 1.9, 1.25, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        accentColor={PLAYER_1_COLOR}
        rows={4}
        seatsPerRow={20}
      />

      <FloodlightPole position={[-COURT_HALF_WIDTH - 2.5, 0, -COURT_HALF_LENGTH - 1]} glowColor={GLOW} />
      <FloodlightPole position={[COURT_HALF_WIDTH + 2.5, 0, -COURT_HALF_LENGTH - 1]} glowColor={GLOW} />
      <FloodlightPole position={[-COURT_HALF_WIDTH - 2.5, 0, COURT_HALF_LENGTH + 1]} glowColor={GLOW} />
      <FloodlightPole position={[COURT_HALF_WIDTH + 2.5, 0, COURT_HALF_LENGTH + 1]} glowColor={GLOW} />

      <Player
        color={PLAYER_1_COLOR}
        animation="run"
        scale={0.55}
        sway={{ base: [0, 0, -COURT_HALF_LENGTH + 1.2], axis: "x", amplitude: 1.6, speed: 0.5, offset: 0, facingY: 0 }}
      />
      <Player
        color={PLAYER_2_COLOR}
        animation="run"
        scale={0.55}
        sway={{
          base: [0, 0, COURT_HALF_LENGTH - 1.2],
          axis: "x",
          amplitude: 1.6,
          speed: 0.5,
          offset: Math.PI,
          facingY: Math.PI,
        }}
      />

      <mesh ref={ballRef}>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshStandardMaterial color="#d4f04c" />
      </mesh>
    </>
  );
}
