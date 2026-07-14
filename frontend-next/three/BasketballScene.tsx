"use client";

import { useMemo, useRef, useState, MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import Player from "./Player";
import Crowd from "./Crowd";
import { Stand, FloodlightPole } from "./Stadium";
import { lerp3 } from "./orbitMath";
import BallTrail from "./BallTrail";
import { useActiveZone } from "@/lib/world-zone";
import { buildMarkingsGeometry, LineSpec, RingSpec } from "./markings";
import { BASKETBALL_SLOTS, BASKETBALL_SHIFT_PER_SLOT } from "./formations";
import { seededRandom } from "./rng";
import { singleArcHeight } from "./ballPhysics";
import Net from "./Net";

const HOME_COLOR = "#ea580c";
const AWAY_COLOR = "#1d4ed8";
const GLOW = "#fff2e0";

// Real NBA court dimensions, 1 three.js unit = 1 meter. The court's long
// axis (basket-to-basket) already ran along X before this pass — unlike
// football's pitch, this one wasn't backward, just built at an arbitrary
// (if coincidentally close to correct) 15x8 ratio instead of real meters.
const COURT_LENGTH = 28.65; // X, basket-to-basket
const COURT_WIDTH = 15.24; // Z, sideline-to-sideline
const HALF_LENGTH = COURT_LENGTH / 2;
const HALF_WIDTH = COURT_WIDTH / 2;
const THREE_PT_RADIUS = 7.24;
const PAINT_WIDTH = 4.88; // Z extent (the "key")
const PAINT_DEPTH = 5.8; // X extent, baseline to free-throw line
const FT_CIRCLE_RADIUS = 1.8;
const LINE_WIDTH = 0.08;
const RIM_HEIGHT = 3.05;
const RIM_RADIUS = 0.23; // 18in rim diameter
const BACKBOARD_WIDTH = 1.8;
const BACKBOARD_HEIGHT = 1.05;
const BALL_RADIUS = 0.12; // ~24cm diameter

// Two players holding formation slots (three/formations.ts) instead of
// orbiting on ellipses — same fix as football's passers.
const PLAYERS = [{ color: HOME_COLOR }, { color: AWAY_COLOR }];
const BACKBOARD_X = HALF_LENGTH - 1.2;
const HOOP_X = BACKBOARD_X - 0.15;
const PASS_DURATION = 1.8;
const SHOT_DURATION = 1.0;
const CYCLE = PASS_DURATION + SHOT_DURATION;
const REACTION_DELAY_MIN = 0.15;
const REACTION_DELAY_MAX = 0.4;

function Hoop({ sign, hitAtRef }: { sign: 1 | -1; hitAtRef: MutableRefObject<number> }) {
  const x = sign * HOOP_X;
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[sign * (BACKBOARD_X - HOOP_X + 0.03), RIM_HEIGHT + 0.45, 0]}>
        <boxGeometry args={[0.04, BACKBOARD_HEIGHT, BACKBOARD_WIDTH]} />
        <meshStandardMaterial color="#e5e7eb" transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, RIM_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[RIM_RADIUS, 0.02, 8, 24]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
      {/* Real per-vertex net ripple on score (three/Net.tsx), not a
          scale-pulse or swapped sprite — triggered by Ball the instant the
          shot lands. */}
      <Net width={RIM_RADIUS * 2} height={0.4} position={[0, RIM_HEIGHT - 0.2, 0]} hitAtRef={hitAtRef} />
    </group>
  );
}

// Real court markings — boundary, half-court line/circle, and per-basket
// paint/free-throw circle/three-point arc. The three-point arc is drawn as
// a clean semicircle at the real 7.24m radius centered on the basket (NBA
// arcs also straighten into corner segments — a simplification, but the
// radius, the number rule 1 actually asks for, is exact). Merged into one
// BufferGeometry (three/markings.ts) instead of separate meshes — same fix
// that took football's PitchMarkings from ~30fps to a clean 60fps.
function CourtMarkings() {
  const geometry = useMemo(() => {
    const y = -0.49;
    const lines: LineSpec[] = [
      { position: [-HALF_LENGTH, y, 0], size: [LINE_WIDTH, COURT_WIDTH] },
      { position: [HALF_LENGTH, y, 0], size: [LINE_WIDTH, COURT_WIDTH] },
      { position: [0, y, -HALF_WIDTH], size: [COURT_LENGTH, LINE_WIDTH] },
      { position: [0, y, HALF_WIDTH], size: [COURT_LENGTH, LINE_WIDTH] },
      { position: [0, y, 0], size: [LINE_WIDTH, COURT_WIDTH] },
    ];
    const rings: RingSpec[] = [{ position: [0, y, 0], inner: FT_CIRCLE_RADIUS - 0.05, outer: FT_CIRCLE_RADIUS + 0.05, segments: 32 }];
    for (const sign of [-1, 1] as const) {
      const baseline = sign * HALF_LENGTH;
      const ftLineX = baseline - sign * PAINT_DEPTH;
      lines.push(
        { position: [ftLineX, y, 0], size: [LINE_WIDTH, PAINT_WIDTH] },
        { position: [(baseline + ftLineX) / 2, y, -PAINT_WIDTH / 2], size: [PAINT_DEPTH, LINE_WIDTH] },
        { position: [(baseline + ftLineX) / 2, y, PAINT_WIDTH / 2], size: [PAINT_DEPTH, LINE_WIDTH] },
      );
      const thetaStart = sign > 0 ? Math.PI / 2 : -Math.PI / 2;
      rings.push(
        { position: [ftLineX, y, 0], inner: FT_CIRCLE_RADIUS - 0.05, outer: FT_CIRCLE_RADIUS + 0.05, segments: 24, thetaStart, thetaLength: Math.PI },
        { position: [HOOP_X * sign, y, 0], inner: THREE_PT_RADIUS - 0.05, outer: THREE_PT_RADIUS + 0.05, segments: 32, thetaStart, thetaLength: Math.PI },
      );
    }
    return buildMarkingsGeometry(lines, rings);
  }, []);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#ffffff" transparent opacity={0.55} />
    </mesh>
  );
}

// Ball alternates a pass between the two orbiting players, then arcs toward
// whichever hoop is nearest the receiving player (a "shot"), triggering
// that player's "shoot" clip at release. `active` gates recompute/state
// updates when this zone isn't docked — see FootballScene's Ball for the
// same pattern and rationale.
function Ball({
  active,
  onShooter,
  hitAtLeft,
  hitAtRight,
}: {
  active: boolean;
  onShooter: (i: number | null) => void;
  hitAtLeft: MutableRefObject<number>;
  hitAtRight: MutableRefObject<number>;
}) {
  const ref = useRef<Mesh>(null);
  const lastPhase = useRef(-1);
  const trailRef = useRef<[number, number, number][]>([]);
  const shotHoopSign = useRef<1 | -1>(1);

  const pendingShooter = useRef<number | null | "unset">("unset");
  const pendingAt = useRef(0);
  const lastCycleStart = useRef(-1);

  useFrame(({ clock }, delta) => {
    if (!active) return;
    const elapsed = clock.getElapsedTime();
    const cycleStart = Math.floor(elapsed / CYCLE) * CYCLE;
    const local = elapsed - cycleStart;

    // A new cycle starting means the previous cycle's shot just landed —
    // trigger that hoop's net ripple (three/Net.tsx) right as it happens.
    if (cycleStart !== lastCycleStart.current) {
      if (lastCycleStart.current >= 0) {
        (shotHoopSign.current === 1 ? hitAtRight : hitAtLeft).current = elapsed;
      }
      lastCycleStart.current = cycleStart;
    }

    let x: number, y: number, z: number;
    // The formation shifts toward whichever player currently has the ball
    // (three/formations.ts) — player 0 during the pass phase, player 1
    // once they receive it and shoot.
    const holder = local < PASS_DURATION ? 0 : 1;
    const shiftX = (holder - 0.5) * BASKETBALL_SHIFT_PER_SLOT;
    const slot0: [number, number, number] = [BASKETBALL_SLOTS[0].x + shiftX, 0, BASKETBALL_SLOTS[0].z];
    const slot1: [number, number, number] = [BASKETBALL_SLOTS[1].x + shiftX, 0, BASKETBALL_SLOTS[1].z];

    // Real gravity-driven flight, replacing the fixed cosine arcs — both
    // the pass and the shot stay airborne the whole way (a real chest
    // pass/jump shot doesn't bounce), so no ground-bounce phase is added
    // here (contrast football/tennis's Ball, which do bounce).
    if (local < PASS_DURATION) {
      if (lastPhase.current !== 0) {
        lastPhase.current = 0;
        pendingShooter.current = null;
        pendingAt.current = elapsed + REACTION_DELAY_MIN + seededRandom(elapsed) * (REACTION_DELAY_MAX - REACTION_DELAY_MIN);
      }
      const progress = local / PASS_DURATION;
      [x, , z] = lerp3(slot0, slot1, progress);
      y = singleArcHeight(local, PASS_DURATION, BALL_RADIUS, BALL_RADIUS);
    } else {
      if (lastPhase.current !== 1) {
        lastPhase.current = 1;
        pendingShooter.current = 1;
        pendingAt.current = elapsed + REACTION_DELAY_MIN + seededRandom(elapsed) * (REACTION_DELAY_MAX - REACTION_DELAY_MIN);
        shotHoopSign.current = slot1[0] >= 0 ? 1 : -1;
      }
      const progress = (local - PASS_DURATION) / SHOT_DURATION;
      const from = slot1;
      const hoopX = shotHoopSign.current * HOOP_X;
      const to: [number, number, number] = [hoopX, RIM_HEIGHT, 0];
      [x, , z] = lerp3(from, to, progress);
      y = singleArcHeight(local - PASS_DURATION, SHOT_DURATION, from[1] + BALL_RADIUS, RIM_HEIGHT);
    }

    if (ref.current) {
      const speed = local < PASS_DURATION ? Math.hypot(slot1[0] - slot0[0], slot1[2] - slot0[2]) / PASS_DURATION : 4;
      ref.current.rotation.x += speed * delta * 1.2;
    }

    if (pendingShooter.current !== "unset" && elapsed >= pendingAt.current) {
      onShooter(pendingShooter.current);
      pendingShooter.current = "unset";
    }

    ref.current?.position.set(x, y, z);
    trailRef.current.push([x, y, z]);
    if (trailRef.current.length > 6) trailRef.current.shift();
  });

  return (
    <>
      <mesh ref={ref}>
        <sphereGeometry args={[BALL_RADIUS, 16, 16]} />
        <meshStandardMaterial color="#ea580c" />
      </mesh>
      <BallTrail positionsRef={trailRef} />
    </>
  );
}

export default function BasketballScene() {
  const [shooterIndex, setShooterIndex] = useState<number | null>(null);
  const active = useActiveZone() === "basketball";
  const hitAtLeft = useRef(-Infinity);
  const hitAtRight = useRef(-Infinity);

  return (
    <>
      <ambientLight intensity={0.45} />
      {/* Low-intensity cool violet-blue fill — ties the scene into the new
          Galaxy palette without touching the tuned warm GLOW/directional
          rig below. */}
      <ambientLight intensity={0.1} color="#241b4d" />
      <directionalLight position={[5, 8, 4]} intensity={0.6} />
      <spotLight position={[0, 9, 0]} angle={0.65} penumbra={0.5} intensity={0.85} color={GLOW} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[COURT_LENGTH, COURT_WIDTH]} />
        {/* clearcoat + low roughness for a glossy varnished-wood response —
            same real-but-procedural fidelity step as football's pitch. */}
        <meshPhysicalMaterial color="#a9713f" clearcoat={0.6} clearcoatRoughness={0.15} roughness={0.4} />
      </mesh>
      <CourtMarkings />
      <Hoop sign={-1} hitAtRef={hitAtLeft} />
      <Hoop sign={1} hitAtRef={hitAtRight} />

      {/* arena stands + crowd along both long sides — crowd rows sit above
          the stand's top edge (tiered seating), not behind/below it */}
      <Stand position={[0, 0.55, -HALF_WIDTH - 2.5]} width={COURT_LENGTH + 6} />
      <Crowd position={[0, 1.25, -HALF_WIDTH - 3]} accentColor={HOME_COLOR} rows={4} />
      <Stand position={[0, 0.55, HALF_WIDTH + 2.5]} rotation={[0.25, Math.PI, 0]} width={COURT_LENGTH + 6} />
      <Crowd position={[0, 1.25, HALF_WIDTH + 3]} rotation={[0, Math.PI, 0]} accentColor={AWAY_COLOR} rows={4} />

      <FloodlightPole position={[-HALF_LENGTH - 3, 0, -HALF_WIDTH - 1.5]} glowColor={GLOW} />
      <FloodlightPole position={[HALF_LENGTH + 3, 0, -HALF_WIDTH - 1.5]} glowColor={GLOW} />
      <FloodlightPole position={[-HALF_LENGTH - 3, 0, HALF_WIDTH + 1.5]} glowColor={GLOW} />
      <FloodlightPole position={[HALF_LENGTH + 3, 0, HALF_WIDTH + 1.5]} glowColor={GLOW} />

      {PLAYERS.map((p, i) => {
        const holder = shooterIndex === 1 ? 1 : 0;
        const shiftX = (holder - 0.5) * BASKETBALL_SHIFT_PER_SLOT;
        const slot = BASKETBALL_SLOTS[i];
        return (
          <Player
            key={i}
            color={p.color}
            animation={shooterIndex === i ? "shoot" : "run"}
            target={{ x: slot.x + shiftX, z: slot.z, maxSpeed: 2.6 }}
          />
        );
      })}
      <Player color={HOME_COLOR} animation="idle" position={[HALF_LENGTH - 6, 0, -3]} rotationY={Math.PI} />

      <Ball active={active} onShooter={setShooterIndex} hitAtLeft={hitAtLeft} hitAtRight={hitAtRight} />
    </>
  );
}
