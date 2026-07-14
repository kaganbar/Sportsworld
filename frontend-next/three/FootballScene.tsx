"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import Player from "./Player";
import Crowd from "./Crowd";
import { Stand, FloodlightPole } from "./Stadium";
import { lerp3 } from "./orbitMath";
import BallTrail from "./BallTrail";
import { useActiveZone } from "@/lib/world-zone";
import { buildMarkingsGeometry, LineSpec } from "./markings";
import { FOOTBALL_SLOTS, FOOTBALL_SHIFT_PER_SLOT } from "./formations";
import { seededRandom } from "./rng";
import { bouncedFlightHeight } from "./ballPhysics";

const HOME_COLOR = "#f3f6f3";
const AWAY_COLOR = "#1e3a8a";
const GLOW = "#fff8e1";

// Real FIFA pitch dimensions, 1 three.js unit = 1 meter (the player rig's
// own native scale — see Player.tsx). Previously this pitch was [20, 12]
// (wider than long) — backward from every real pitch, which is longer
// goal-to-goal than it is wide. LENGTH runs along Z (goal-to-goal), WIDTH
// runs along X (sideline-to-sideline).
const PITCH_LENGTH = 105;
const PITCH_WIDTH = 68;
const HALF_LENGTH = PITCH_LENGTH / 2;
const HALF_WIDTH = PITCH_WIDTH / 2;
const CENTER_CIRCLE_RADIUS = 9.15;
const PENALTY_BOX_WIDTH = 40.32;
const PENALTY_BOX_DEPTH = 16.5;
const GOAL_BOX_WIDTH = 18.32;
const GOAL_BOX_DEPTH = 5.5;
const LINE_WIDTH = 0.12;
const GOAL_WIDTH = 7.32;
const GOAL_HEIGHT = 2.44;
const BALL_RADIUS = 0.11; // FIFA size-5 ball, ~22cm diameter

// Three outfield passers, each holding a formation slot (three/formations.ts)
// instead of orbiting on a circular ellipse — the direct fix for "players
// must not run around randomly."
const PASSERS = [
  { color: HOME_COLOR },
  { color: AWAY_COLOR },
  { color: HOME_COLOR },
];
const SEGMENT_DURATION = 2.2; // seconds per pass between two players
// Human reaction time before a receiving player's animation responds to
// the ball's arrival — the ball's own flight is unaffected (real physics,
// on schedule), only the visible reaction is delayed, fixing the
// previous same-frame "robotic instant tracking."
const REACTION_DELAY_MIN = 0.15;
const REACTION_DELAY_MAX = 0.4;

const GOALKEEPER_BASE_NEAR: [number, number, number] = [0, 0, -HALF_LENGTH + 1.5];
const GOALKEEPER_BASE_FAR: [number, number, number] = [0, 0, HALF_LENGTH - 1.5];
const DIVE_CYCLE = 5; // seconds between dives
const DIVE_DURATION = 0.95; // matches the dive AnimationClip's own duration (Player.tsx)

function Goal({ z }: { z: number }) {
  const facing = z < 0 ? 1 : -1; // crossbar sits on the pitch-facing side
  const halfWidth = GOAL_WIDTH / 2;
  return (
    <group position={[0, 0, z + facing * 0.05]}>
      <mesh position={[-halfWidth, GOAL_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[0.06, 0.06, GOAL_HEIGHT, 8]} />
        <meshStandardMaterial color="#f5f5f4" />
      </mesh>
      <mesh position={[halfWidth, GOAL_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[0.06, 0.06, GOAL_HEIGHT, 8]} />
        <meshStandardMaterial color="#f5f5f4" />
      </mesh>
      <mesh position={[0, GOAL_HEIGHT, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, GOAL_WIDTH, 8]} />
        <meshStandardMaterial color="#f5f5f4" />
      </mesh>
    </group>
  );
}

// A single real-width pitch marking line (touchline, goal line, penalty box
// edge, etc.) — every marking on a real pitch is drawn from this one
// primitive so line thickness stays consistent (12cm, the real width of a
// pitch marking) instead of each line hand-tuning its own opacity/size.

// Real pitch markings: outer boundary, halfway line, center circle, and a
// penalty box + six-yard box at each end — the "penalty boxes... exact
// real-world dimensions" rule 1 explicitly asks for, entirely absent from
// the pitch before this pass (it only had a center circle). All lines are
// baked into ONE merged BufferGeometry (three/markings.ts) instead of 18
// separate meshes — measured cost of the naive per-line-mesh approach was
// ~30fps (confirmed via the project's FPS check, isolated by disabling this
// component and re-measuring), down from a clean 60fps.
function PitchMarkings() {
  const geometry = useMemo(() => {
    const y = -0.49;
    const lines: LineSpec[] = [
      { position: [-HALF_WIDTH, y, 0], size: [LINE_WIDTH, PITCH_LENGTH] },
      { position: [HALF_WIDTH, y, 0], size: [LINE_WIDTH, PITCH_LENGTH] },
      { position: [0, y, -HALF_LENGTH], size: [PITCH_WIDTH, LINE_WIDTH] },
      { position: [0, y, HALF_LENGTH], size: [PITCH_WIDTH, LINE_WIDTH] },
      { position: [0, y, 0], size: [PITCH_WIDTH, LINE_WIDTH] },
    ];
    for (const sign of [-1, 1]) {
      const goalLine = sign * HALF_LENGTH;
      const penaltyBack = goalLine - sign * PENALTY_BOX_DEPTH;
      const penaltyMid = (goalLine + penaltyBack) / 2;
      const goalBoxBack = goalLine - sign * GOAL_BOX_DEPTH;
      const goalBoxMid = (goalLine + goalBoxBack) / 2;
      lines.push(
        { position: [0, y, penaltyBack], size: [PENALTY_BOX_WIDTH, LINE_WIDTH] },
        { position: [-PENALTY_BOX_WIDTH / 2, y, penaltyMid], size: [LINE_WIDTH, PENALTY_BOX_DEPTH] },
        { position: [PENALTY_BOX_WIDTH / 2, y, penaltyMid], size: [LINE_WIDTH, PENALTY_BOX_DEPTH] },
        { position: [0, y, goalBoxBack], size: [GOAL_BOX_WIDTH, LINE_WIDTH] },
        { position: [-GOAL_BOX_WIDTH / 2, y, goalBoxMid], size: [LINE_WIDTH, GOAL_BOX_DEPTH] },
        { position: [GOAL_BOX_WIDTH / 2, y, goalBoxMid], size: [LINE_WIDTH, GOAL_BOX_DEPTH] },
      );
    }
    return buildMarkingsGeometry(lines, [{ position: [0, y, 0], inner: CENTER_CIRCLE_RADIUS - 0.06, outer: CENTER_CIRCLE_RADIUS + 0.06, segments: 48 }]);
  }, []);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#ffffff" transparent opacity={0.55} />
    </mesh>
  );
}

// Drives the ball along an explicit waypoint path between the two passers
// currently exchanging it (rather than an independent ellipse), and flags
// which passer should play "kick" at the moment the ball departs them.
// `active` gates the expensive part (waypoint recompute + the state
// update that retriggers a player's kick animation) — when this zone isn't
// the docked one, the ball just holds its last position instead of
// continuing to recompute every frame, since nobody's watching it fly.
function Ball({ active, onKicker }: { active: boolean; onKicker: (i: number) => void }) {
  const ref = useRef<Mesh>(null);
  const lastSegment = useRef(-1);
  const trailRef = useRef<[number, number, number][]>([]);

  const pendingKicker = useRef<number | null>(null);
  const pendingKickAt = useRef(0);

  useFrame(({ clock }, delta) => {
    if (!active) return;
    const elapsed = clock.getElapsedTime();
    const segment = Math.floor(elapsed / SEGMENT_DURATION);
    const from = segment % PASSERS.length;
    const to = (segment + 1) % PASSERS.length;
    if (segment !== lastSegment.current) {
      lastSegment.current = segment;
      // Seeded reaction delay — the kick pose fires a beat after the ball
      // mathematically departs, not on the same frame, so it reads as a
      // response rather than an instantly-tracking reflex.
      pendingKicker.current = from;
      pendingKickAt.current = elapsed + REACTION_DELAY_MIN + seededRandom(elapsed) * (REACTION_DELAY_MAX - REACTION_DELAY_MIN);
    }
    if (pendingKicker.current !== null && elapsed >= pendingKickAt.current) {
      onKicker(pendingKicker.current);
      pendingKicker.current = null;
    }

    // The whole formation shifts along the pitch depending on who
    // currently has the ball (three/formations.ts) — this is what the
    // ball's own waypoints read from, so a pass always travels between
    // where the passers actually are, shift included.
    const shiftZ = (from - 1) * FOOTBALL_SHIFT_PER_SLOT;
    const fromSlot = FOOTBALL_SLOTS[from];
    const toSlot = FOOTBALL_SLOTS[to];
    const fromPos: [number, number, number] = [fromSlot.x, 0, fromSlot.z + shiftZ];
    const toPos: [number, number, number] = [toSlot.x, 0, toSlot.z + shiftZ];

    const segStart = segment * SEGMENT_DURATION;
    const progress = (elapsed - segStart) / SEGMENT_DURATION;
    const t = progress * SEGMENT_DURATION;

    const [x, , z] = lerp3(fromPos, toPos, progress);
    // Real gravity-driven flight (g=9.81m/s^2) instead of a fixed cosine
    // arc — the main pass covers 85% of the segment, then a small
    // decaying bounce (real, not scripted: the same closed-form parabola
    // solve, just over a short window) settles the ball at the receiver's
    // feet exactly as the next segment begins.
    const y = bouncedFlightHeight(t, SEGMENT_DURATION, BALL_RADIUS, BALL_RADIUS, BALL_RADIUS, 0.85);

    ref.current?.position.set(x, y, z);
    if (ref.current) {
      // Visible spin proportional to ground speed covered this pass — a
      // faster/longer pass spins the ball faster, a real (if simplified)
      // relationship rather than a constant spin rate.
      const horizontalSpeed = Math.hypot(toPos[0] - fromPos[0], toPos[2] - fromPos[2]) / SEGMENT_DURATION;
      ref.current.rotation.x += horizontalSpeed * delta * 1.4;
    }
    trailRef.current.push([x, y, z]);
    if (trailRef.current.length > 6) trailRef.current.shift();
  });

  return (
    <>
      <mesh ref={ref}>
        <sphereGeometry args={[BALL_RADIUS, 16, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <BallTrail positionsRef={trailRef} />
    </>
  );
}

// Two goals, two keepers — a single hardcoded instance previously only
// guarded the near goal (z=-HALF_LENGTH), leaving the far one completely
// undefended. Same component, just parameterized by which end/color it
// guards, plus a `phaseOffset` so the two don't dive/sway in perfect
// mirrored sync (each still reads as reacting independently).
function Goalkeeper({
  active,
  color,
  base,
  phaseOffset = 0,
}: {
  active: boolean;
  color: string;
  base: [number, number, number];
  phaseOffset?: number;
}) {
  const [diving, setDiving] = useState(false);
  const lastPhase = useRef(false);

  useFrame(({ clock }) => {
    if (!active) return;
    const phase = ((clock.getElapsedTime() + phaseOffset) % DIVE_CYCLE) < DIVE_DURATION;
    if (phase !== lastPhase.current) {
      lastPhase.current = phase;
      setDiving(phase);
    }
  });

  return (
    <Player
      color={color}
      animation={diving ? "dive" : "idle"}
      sway={{ base, axis: "x", amplitude: GOAL_WIDTH / 2 - 0.5, speed: 0.5, offset: phaseOffset, facingY: 0 }}
    />
  );
}

export default function FootballScene() {
  const [kickerIndex, setKickerIndex] = useState(0);
  const active = useActiveZone() === "football";

  return (
    <>
      <ambientLight intensity={0.45} />
      {/* Low-intensity cool violet-blue fill — ties the scene into the new
          Galaxy palette without touching the tuned warm GLOW/directional
          rig below. */}
      <ambientLight intensity={0.1} color="#241b4d" />
      <directionalLight position={[5, 8, 4]} intensity={0.6} />
      <spotLight position={[0, 9, 0]} angle={0.6} penumbra={0.5} intensity={0.8} color={GLOW} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[PITCH_WIDTH, PITCH_LENGTH]} />
        {/* clearcoat gives a subtle wet-grass sheen — a real, procedural
            fidelity step (no texture asset needed), see three/zones.ts-era
            plan notes for why photoreal turf textures aren't achievable
            here. */}
        <meshPhysicalMaterial color="#1e5e2e" clearcoat={0.3} clearcoatRoughness={0.4} roughness={0.85} />
      </mesh>
      <PitchMarkings />

      <Goal z={-HALF_LENGTH} />
      <Goal z={HALF_LENGTH} />

      {/* end stands + crowd, just behind each goal line — crowd rows sit
          above the stand's top edge (tiered seating), not behind/below it,
          or the stand wall fully occludes them from this elevated camera */}
      <Stand position={[0, 0.6, -HALF_LENGTH - 3]} width={PITCH_WIDTH + 6} />
      <Crowd position={[0, 1.3, -HALF_LENGTH - 3.5]} accentColor={HOME_COLOR} />
      <Stand position={[0, 0.6, HALF_LENGTH + 3]} rotation={[0.25, Math.PI, 0]} width={PITCH_WIDTH + 6} />
      <Crowd position={[0, 1.3, HALF_LENGTH + 3.5]} rotation={[0, Math.PI, 0]} accentColor={AWAY_COLOR} />

      <FloodlightPole position={[-HALF_WIDTH - 4, 0, -HALF_LENGTH - 2]} glowColor={GLOW} />
      <FloodlightPole position={[HALF_WIDTH + 4, 0, -HALF_LENGTH - 2]} glowColor={GLOW} />
      <FloodlightPole position={[-HALF_WIDTH - 4, 0, HALF_LENGTH + 2]} glowColor={GLOW} />
      <FloodlightPole position={[HALF_WIDTH + 4, 0, HALF_LENGTH + 2]} glowColor={GLOW} />

      {PASSERS.map((p, i) => {
        const shiftZ = (kickerIndex - 1) * FOOTBALL_SHIFT_PER_SLOT;
        const slot = FOOTBALL_SLOTS[i];
        return (
          <Player
            key={i}
            color={p.color}
            animation={kickerIndex === i ? "kick" : "run"}
            target={{ x: slot.x, z: slot.z + shiftZ, maxSpeed: 2.6 }}
          />
        );
      })}
      <Goalkeeper active={active} color={AWAY_COLOR} base={GOALKEEPER_BASE_NEAR} />
      <Goalkeeper active={active} color={HOME_COLOR} base={GOALKEEPER_BASE_FAR} phaseOffset={2.3} />

      <Ball active={active} onKicker={setKickerIndex} />
    </>
  );
}
