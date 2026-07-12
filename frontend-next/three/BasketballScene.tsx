"use client";

import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Mesh } from "three";
import Player from "./Player";
import Crowd from "./Crowd";
import { Stand, FloodlightPole } from "./Stadium";
import { orbitPosition, lerp3 } from "./orbitMath";

const HOME_COLOR = "#ea580c";
const AWAY_COLOR = "#1d4ed8";
const GLOW = "#fff2e0";

const PLAYERS = [
  { radius: 2.2, speed: 0.5, offset: 0, color: HOME_COLOR },
  { radius: 1.6, speed: 0.65, offset: 2.5, color: AWAY_COLOR },
];
const HOOP_Y = 2.1;
const HOOP_Z = -3;
const PASS_DURATION = 1.8;
const SHOT_DURATION = 1.0;
const CYCLE = PASS_DURATION + SHOT_DURATION;
const PASS_ARC = 0.5;
const SHOT_ARC = 2.2;

function Hoop({ x }: { x: number }) {
  return (
    <group position={[x, 0, HOOP_Z]}>
      <mesh position={[0, 2.6, 0]}>
        <boxGeometry args={[1.2, 1, 0.05]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>
      <mesh position={[0, HOOP_Y, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
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

// Ball alternates a pass between the two orbiting players, then arcs toward
// whichever hoop is nearest the receiving player (a "shot"), triggering
// that player's "shoot" clip at release — replacing the old fully
// independent sine/cosine bounce path.
function Ball({ onShooter }: { onShooter: (i: number | null) => void }) {
  const ref = useRef<Mesh>(null);
  const lastPhase = useRef(-1);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    const cycleStart = Math.floor(elapsed / CYCLE) * CYCLE;
    const local = elapsed - cycleStart;

    if (local < PASS_DURATION) {
      if (lastPhase.current !== 0) {
        lastPhase.current = 0;
        onShooter(null);
      }
      const progress = local / PASS_DURATION;
      const from = orbitPosition(cycleStart, PLAYERS[0].radius, PLAYERS[0].speed, PLAYERS[0].offset, 0.5);
      const to = orbitPosition(cycleStart + PASS_DURATION, PLAYERS[1].radius, PLAYERS[1].speed, PLAYERS[1].offset, 0.5);
      const [x, , z] = lerp3(from, to, progress);
      ref.current?.position.set(x, 0.4 + Math.sin(progress * Math.PI) * PASS_ARC, z);
      return;
    }

    if (lastPhase.current !== 1) {
      lastPhase.current = 1;
      onShooter(1);
    }
    const shotStart = cycleStart + PASS_DURATION;
    const progress = (local - PASS_DURATION) / SHOT_DURATION;
    const from = orbitPosition(shotStart, PLAYERS[1].radius, PLAYERS[1].speed, PLAYERS[1].offset, 0.5);
    const hoopX = from[0] >= 0 ? 5.5 : -5.5;
    const to: [number, number, number] = [hoopX, HOOP_Y, HOOP_Z];
    const [x, , z] = lerp3(from, to, progress);
    ref.current?.position.set(x, from[1] + 0.4 + Math.sin(progress * Math.PI) * SHOT_ARC, z);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial color="#ea580c" />
    </mesh>
  );
}

export default function BasketballScene() {
  const [shooterIndex, setShooterIndex] = useState<number | null>(null);

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

      {PLAYERS.map((p, i) => (
        <Player
          key={i}
          color={p.color}
          animation={shooterIndex === i ? "shoot" : "run"}
          scale={0.5}
          orbit={{ radius: p.radius, speed: p.speed, offset: p.offset, y: 0, zScale: 0.5 }}
        />
      ))}
      <Player color={HOME_COLOR} animation="idle" scale={0.5} position={[4.6, 0, -2.6]} rotationY={Math.PI} />

      <Ball onShooter={setShooterIndex} />
    </>
  );
}
