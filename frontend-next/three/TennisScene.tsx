"use client";

import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Mesh } from "three";
import Player from "./Player";
import Crowd from "./Crowd";
import { Stand, FloodlightPole } from "./Stadium";
import { swayPosition, lerp3 } from "./orbitMath";

const PLAYER_1_COLOR = "#ffffff";
const PLAYER_2_COLOR = "#1e40af";
const COURT_HALF_LENGTH = 7;
const COURT_HALF_WIDTH = 3.5;
const GLOW = "#eef3ff";

const PLAYERS = [
  { base: [0, 0, -COURT_HALF_LENGTH + 1.2] as [number, number, number], axis: "x" as const, amplitude: 1.6, speed: 0.5, offset: 0 },
  { base: [0, 0, COURT_HALF_LENGTH - 1.2] as [number, number, number], axis: "x" as const, amplitude: 1.6, speed: 0.5, offset: Math.PI },
];
const RALLY_SEGMENT = 1.5; // seconds per shot exchange
const RALLY_ARC = 1.3;

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

// Ball alternates toward each player's current sway position (a rally)
// instead of an independent sine wave, triggering "swing" on whichever
// player is about to hit it back at the start of each exchange.
function Ball({ onSwinger }: { onSwinger: (i: number) => void }) {
  const ref = useRef<Mesh>(null);
  const lastSegment = useRef(-1);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    const segment = Math.floor(elapsed / RALLY_SEGMENT);
    const from = segment % 2;
    const to = (segment + 1) % 2;
    if (segment !== lastSegment.current) {
      lastSegment.current = segment;
      onSwinger(from);
    }

    const segStart = segment * RALLY_SEGMENT;
    const segEnd = segStart + RALLY_SEGMENT;
    const progress = (elapsed - segStart) / RALLY_SEGMENT;

    const p1 = PLAYERS[from];
    const p2 = PLAYERS[to];
    const fromPos = swayPosition(segStart, p1.base, p1.axis, p1.amplitude, p1.speed, p1.offset);
    const toPos = swayPosition(segEnd, p2.base, p2.axis, p2.amplitude, p2.speed, p2.offset);
    const [x, , z] = lerp3(fromPos, toPos, progress);
    ref.current?.position.set(x, 0.3 + Math.sin(progress * Math.PI) * RALLY_ARC, z);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.15, 12, 12]} />
      <meshStandardMaterial color="#d4f04c" />
    </mesh>
  );
}

export default function TennisScene() {
  const [swingerIndex, setSwingerIndex] = useState<number | null>(null);

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
        animation={swingerIndex === 0 ? "swing" : "run"}
        scale={0.55}
        sway={{ ...PLAYERS[0], facingY: 0 }}
      />
      <Player
        color={PLAYER_2_COLOR}
        animation={swingerIndex === 1 ? "swing" : "run"}
        scale={0.55}
        sway={{ ...PLAYERS[1], facingY: Math.PI }}
      />

      <Ball onSwinger={setSwingerIndex} />
    </>
  );
}
