"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import Player from "./Player";
import Crowd from "./Crowd";
import { Stand, FloodlightPole } from "./Stadium";
import { lerp3 } from "./orbitMath";
import BallTrail from "./BallTrail";
import { useActiveZone } from "@/lib/world-zone";
import { BASEBALL_SLOTS } from "./formations";
import { seededRandom } from "./rng";
import { singleArcHeight, bouncedFlightHeight } from "./ballPhysics";

const HOME_COLOR = "#0c2340";
const AWAY_COLOR = "#bd3039";
const GLOW = "#fff8e1";
const STAND_COLOR = "#2d3b2d";

// Real MLB dimensions, 1 three.js unit = 1 meter. Home plate at the origin;
// the field extends toward +Z (center field). First base sits on the +X
// side, third base on the -X side — the diamond is a square rotated 45°
// from the home-to-second axis, exactly like a real infield.
const HOME_TO_BASE = 27.43; // 90ft base paths
const BASE_OFFSET = HOME_TO_BASE * Math.SQRT1_2; // first/third base's X and Z offset from home
const MOUND_DIST = 18.44; // 60.5ft, home plate to the pitching rubber
const FOUL_LINE_LENGTH = 110; // home plate to the outfield fence along each line
const BALL_RADIUS = 0.037; // ~7.3cm diameter

const FIRST_BASE: [number, number, number] = [BASE_OFFSET, 0, BASE_OFFSET];
const SECOND_BASE: [number, number, number] = [0, 0, HOME_TO_BASE * Math.SQRT2];
const THIRD_BASE: [number, number, number] = [-BASE_OFFSET, 0, BASE_OFFSET];

const PITCH_DURATION = 0.6; // seconds, mound to plate
const HIT_DURATION = 1.6; // seconds, plate out into the field
const CYCLE = PITCH_DURATION + HIT_DURATION;
const REACTION_DELAY_MIN = 0.1;
const REACTION_DELAY_MAX = 0.25;
// Where a batted ball travels to this cycle — a single fixed gap (between
// the two ambient infielders) rather than a different spot each cycle; real
// variety would need per-cycle randomized landing spots, but a fixed target
// keeps the choreography readable at a glance from background-canvas
// distance, the same call FootballScene's fixed 3-passer loop makes.
const HIT_TARGET: [number, number, number] = [24, 0, 74];

// A single real dirt patch under the whole infield (home plate through just
// past the bases) — real MLB fields separate a grass "cutout" from the dirt
// skin per-base, a level of geometric detail not worth the extra draw calls
// for a background scene; one merged dirt disc reads correctly from this
// camera distance.
function InfieldDirt() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 17]}>
      <circleGeometry args={[26, 48]} />
      <meshStandardMaterial color="#8a5a3c" roughness={0.95} />
    </mesh>
  );
}

function Mound() {
  return (
    <mesh position={[0, -0.37, MOUND_DIST]}>
      <cylinderGeometry args={[2.7, 3, 0.25, 24]} />
      <meshStandardMaterial color="#8a5a3c" roughness={0.95} />
    </mesh>
  );
}

function Base({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={[position[0], -0.44, position[2]]}>
      <boxGeometry args={[0.4, 0.08, 0.4]} />
      <meshStandardMaterial color="#f5f5f4" />
    </mesh>
  );
}

// Foul lines run diagonally from home plate through first/third base out to
// the fence — markings.ts's LineSpec builder only supports axis-aligned
// lines (no per-line rotation), so these two are their own thin rotated
// boxes instead of going through the shared merged-geometry helper (two
// extra draw calls, an acceptable cost next to the 15-30-line pitches/
// courts that optimization specifically targeted).
function FoulLines() {
  const half = FOUL_LINE_LENGTH / 2;
  const offset = half * Math.SQRT1_2;
  return (
    <>
      <mesh position={[offset, -0.48, offset]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.12, 0.02, FOUL_LINE_LENGTH]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.55} />
      </mesh>
      <mesh position={[-offset, -0.48, offset]} rotation={[0, -Math.PI / 4, 0]}>
        <boxGeometry args={[0.12, 0.02, FOUL_LINE_LENGTH]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.55} />
      </mesh>
    </>
  );
}

// Pitch (mound -> plate) then a batted ball out into the field (plate ->
// HIT_TARGET, one bounce) — the same two-phase real-physics choreography as
// FootballScene/BasketballScene's Ball, just with a pitcher/batter cast
// instead of passers. `active` gates recompute when this zone isn't
// docked — see FootballScene's Ball for the same pattern and rationale.
function Ball({ active, onSwing }: { active: boolean; onSwing: (swinging: boolean) => void }) {
  const ref = useRef<Mesh>(null);
  const lastPhase = useRef(-1);
  const trailRef = useRef<[number, number, number][]>([]);
  const pendingSwing = useRef<boolean | null>(null);
  const pendingAt = useRef(0);

  useFrame(({ clock }, delta) => {
    if (!active) return;
    const elapsed = clock.getElapsedTime();
    const cycleStart = Math.floor(elapsed / CYCLE) * CYCLE;
    const local = elapsed - cycleStart;

    let x: number, y: number, z: number;

    if (local < PITCH_DURATION) {
      if (lastPhase.current !== 0) {
        lastPhase.current = 0;
        // The batter resets to idle immediately at the start of a new
        // pitch, no reaction delay needed for going back to a rest pose.
        pendingSwing.current = null;
        onSwing(false);
      }
      const progress = local / PITCH_DURATION;
      [x, , z] = lerp3([0, 0, MOUND_DIST], [0, 0, 1], progress);
      y = singleArcHeight(local, PITCH_DURATION, 1.8, 0.9);
    } else {
      if (lastPhase.current !== 1) {
        lastPhase.current = 1;
        pendingSwing.current = true;
        pendingAt.current = elapsed + REACTION_DELAY_MIN + seededRandom(elapsed) * (REACTION_DELAY_MAX - REACTION_DELAY_MIN);
      }
      const t = local - PITCH_DURATION;
      const progress = t / HIT_DURATION;
      [x, , z] = lerp3([0, 0, 1], HIT_TARGET, progress);
      y = bouncedFlightHeight(t, HIT_DURATION, 0.9, BALL_RADIUS, BALL_RADIUS, 0.6);
    }

    if (pendingSwing.current !== null && elapsed >= pendingAt.current) {
      onSwing(pendingSwing.current);
      pendingSwing.current = null;
    }

    if (ref.current) {
      const speed = local < PITCH_DURATION ? (MOUND_DIST - 1) / PITCH_DURATION : Math.hypot(HIT_TARGET[0], HIT_TARGET[2] - 1) / HIT_DURATION;
      ref.current.rotation.x += speed * delta * 1.3;
    }

    ref.current?.position.set(x, y, z);
    trailRef.current.push([x, y, z]);
    if (trailRef.current.length > 6) trailRef.current.shift();
  });

  return (
    <>
      <mesh ref={ref}>
        <sphereGeometry args={[BALL_RADIUS, 12, 12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <BallTrail positionsRef={trailRef} baseSize={0.05} />
    </>
  );
}

export default function BaseballScene() {
  const [swinging, setSwinging] = useState(false);
  const active = useActiveZone() === "baseball";

  return (
    <>
      <ambientLight intensity={0.45} />
      <ambientLight intensity={0.1} color="#241b4d" />
      <directionalLight position={[5, 8, 4]} intensity={0.6} />
      <spotLight position={[0, 12, 40]} angle={0.65} penumbra={0.5} intensity={0.8} color={GLOW} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 52]}>
        <planeGeometry args={[210, 145]} />
        <meshPhysicalMaterial color="#1e5e2e" clearcoat={0.2} clearcoatRoughness={0.5} roughness={0.9} />
      </mesh>
      <InfieldDirt />
      <Mound />
      <FoulLines />
      <Base position={FIRST_BASE} />
      <Base position={SECOND_BASE} />
      <Base position={THIRD_BASE} />
      <mesh position={[0, -0.44, 0]}>
        <boxGeometry args={[0.43, 0.06, 0.43]} />
        <meshStandardMaterial color="#f5f5f4" />
      </mesh>

      {/* backstop grandstand behind home plate, deep-outfield bleachers
          facing back toward it — mirrors FootballScene's behind-each-goal
          two-stand treatment, scaled to baseball's much larger field */}
      <Stand position={[0, 0.6, -23]} width={70} color={STAND_COLOR} />
      <Crowd position={[0, 1.3, -23.5]} accentColor={HOME_COLOR} rows={5} />
      <Stand position={[0, 0.6, 130]} rotation={[0.25, Math.PI, 0]} width={110} color={STAND_COLOR} />
      <Crowd position={[0, 1.3, 130.5]} rotation={[0, Math.PI, 0]} accentColor={AWAY_COLOR} rows={5} />

      <FloodlightPole position={[-108, 0, -18]} glowColor={GLOW} />
      <FloodlightPole position={[108, 0, -18]} glowColor={GLOW} />
      <FloodlightPole position={[-108, 0, 118]} glowColor={GLOW} />
      <FloodlightPole position={[108, 0, 118]} glowColor={GLOW} />

      <Player color={AWAY_COLOR} animation="idle" position={[0, 0, MOUND_DIST]} rotationY={Math.PI} active={active} />
      <Player
        color={HOME_COLOR}
        animation={swinging ? "swing" : "idle"}
        position={[1, 0, -1]}
        rotationY={0}
        active={active}
      />
      <Player color={AWAY_COLOR} animation="idle" position={[0, 0, -2.5]} rotationY={0} active={active} />

      {BASEBALL_SLOTS.map((slot, i) => (
        <Player
          key={i}
          color={AWAY_COLOR}
          animation="idle"
          position={[slot.x, 0, slot.z]}
          rotationY={Math.atan2(-slot.x, -slot.z)}
          active={active}
        />
      ))}

      <Ball active={active} onSwing={setSwinging} />
    </>
  );
}
