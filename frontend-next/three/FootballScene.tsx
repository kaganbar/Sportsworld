"use client";

import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Mesh } from "three";
import Player from "./Player";
import Crowd from "./Crowd";
import { Stand, FloodlightPole } from "./Stadium";
import { orbitPosition, lerp3 } from "./orbitMath";
import GalaxyBackdrop from "./GalaxyBackdrop";

const HOME_COLOR = "#f3f6f3";
const AWAY_COLOR = "#1e3a8a";
const GLOW = "#fff8e1";

// The three outfield passers the ball cycles between (round-robin) — a
// 4th former "orbiting player" is now the goalkeeper below instead.
const PASSERS = [
  { radius: 3, speed: 0.4, offset: 0, color: HOME_COLOR },
  { radius: 2.2, speed: 0.55, offset: 2, color: AWAY_COLOR },
  { radius: 3.5, speed: 0.3, offset: 4, color: HOME_COLOR },
];
const SEGMENT_DURATION = 2.2; // seconds per pass between two players
const ARC_HEIGHT = 0.7;

const GOALKEEPER_BASE: [number, number, number] = [0, 0, -6.3];
const DIVE_CYCLE = 5; // seconds between dives
const DIVE_DURATION = 0.8;

function Goal({ z }: { z: number }) {
  const facing = z < 0 ? 1 : -1; // crossbar sits on the pitch-facing side
  return (
    <group position={[0, 0, z + facing * 0.05]}>
      <mesh position={[-1.2, 0.6, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.2, 8]} />
        <meshStandardMaterial color="#f5f5f4" />
      </mesh>
      <mesh position={[1.2, 0.6, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.2, 8]} />
        <meshStandardMaterial color="#f5f5f4" />
      </mesh>
      <mesh position={[0, 1.18, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 2.4, 8]} />
        <meshStandardMaterial color="#f5f5f4" />
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
    camera.position.x = Math.sin(t * 0.08) * 1.2;
    camera.position.y = 6 + Math.sin(t * 0.05) * 0.3;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// Drives the ball along an explicit waypoint path between the two passers
// currently exchanging it (rather than an independent ellipse), and flags
// which passer should play "kick" at the moment the ball departs them.
function Ball({ onKicker }: { onKicker: (i: number) => void }) {
  const ref = useRef<Mesh>(null);
  const lastSegment = useRef(-1);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    const segment = Math.floor(elapsed / SEGMENT_DURATION);
    const from = segment % PASSERS.length;
    const to = (segment + 1) % PASSERS.length;
    if (segment !== lastSegment.current) {
      lastSegment.current = segment;
      onKicker(from);
    }

    const segStart = segment * SEGMENT_DURATION;
    const segEnd = segStart + SEGMENT_DURATION;
    const progress = (elapsed - segStart) / SEGMENT_DURATION;

    const fromPos = orbitPosition(segStart, PASSERS[from].radius, PASSERS[from].speed, PASSERS[from].offset);
    const toPos = orbitPosition(segEnd, PASSERS[to].radius, PASSERS[to].speed, PASSERS[to].offset);
    const [x, , z] = lerp3(fromPos, toPos, progress);
    const arc = Math.sin(progress * Math.PI) * ARC_HEIGHT;

    ref.current?.position.set(x, 0.2 + arc, z);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.18, 16, 16]} />
      <meshStandardMaterial color="#ffffff" />
    </mesh>
  );
}

function Goalkeeper() {
  const [diving, setDiving] = useState(false);
  const lastPhase = useRef(false);

  useFrame(({ clock }) => {
    const phase = (clock.getElapsedTime() % DIVE_CYCLE) < DIVE_DURATION;
    if (phase !== lastPhase.current) {
      lastPhase.current = phase;
      setDiving(phase);
    }
  });

  return (
    <Player
      color={AWAY_COLOR}
      animation={diving ? "dive" : "idle"}
      scale={0.55}
      sway={{ base: GOALKEEPER_BASE, axis: "x", amplitude: 1.0, speed: 0.5, offset: 0, facingY: 0 }}
    />
  );
}

export default function FootballScene() {
  const [kickerIndex, setKickerIndex] = useState(0);

  return (
    <>
      <CameraDrift />
      <GalaxyBackdrop />
      <ambientLight intensity={0.45} />
      {/* Low-intensity cool violet-blue fill — ties the scene into the new
          Galaxy palette without touching the tuned warm GLOW/directional
          rig below. */}
      <ambientLight intensity={0.1} color="#241b4d" />
      <directionalLight position={[5, 8, 4]} intensity={0.6} />
      <spotLight position={[0, 9, 0]} angle={0.6} penumbra={0.5} intensity={0.8} color={GLOW} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[20, 12]} />
        <meshStandardMaterial color="#1e5e2e" />
      </mesh>
      {/* pitch markings: center line + center circle, mirrors a real pitch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.49, 0]}>
        <ringGeometry args={[1.4, 1.5, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
      </mesh>

      <Goal z={-6} />
      <Goal z={6} />

      {/* end stands + crowd, just behind each goal line — crowd rows sit
          above the stand's top edge (tiered seating), not behind/below it,
          or the stand wall fully occludes them from this elevated camera */}
      <Stand position={[0, 0.6, -7.4]} width={20} />
      <Crowd position={[0, 1.3, -7.9]} accentColor={HOME_COLOR} />
      <Stand position={[0, 0.6, 7.4]} rotation={[0.25, Math.PI, 0]} width={20} />
      <Crowd position={[0, 1.3, 7.9]} rotation={[0, Math.PI, 0]} accentColor={AWAY_COLOR} />

      <FloodlightPole position={[-10.5, 0, -6.5]} glowColor={GLOW} />
      <FloodlightPole position={[10.5, 0, -6.5]} glowColor={GLOW} />
      <FloodlightPole position={[-10.5, 0, 6.5]} glowColor={GLOW} />
      <FloodlightPole position={[10.5, 0, 6.5]} glowColor={GLOW} />

      {PASSERS.map((p, i) => (
        <Player
          key={i}
          color={p.color}
          animation={kickerIndex === i ? "kick" : "run"}
          scale={0.55}
          orbit={{ radius: p.radius, speed: p.speed, offset: p.offset, y: 0, zScale: 0.55 }}
        />
      ))}
      <Goalkeeper />

      <Ball onKicker={setKickerIndex} />
    </>
  );
}
