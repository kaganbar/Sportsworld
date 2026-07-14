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
import { seededRandom } from "./rng";
import { bouncedFlightHeight } from "./ballPhysics";

const PLAYER_1_COLOR = "#ffffff";
const PLAYER_2_COLOR = "#1e40af";
// Real ITF singles court, 1 three.js unit = 1 meter.
const COURT_HALF_LENGTH = 11.885; // 23.77m baseline-to-baseline
const COURT_HALF_WIDTH = 4.115; // 8.23m sideline-to-sideline
const SERVICE_LINE_Z = 6.4; // distance from the net to the service line
const LINE_WIDTH = 0.05;
const NET_HEIGHT = 1.0; // real net dips from 1.07m at the posts to 0.914m center
const BALL_RADIUS = 0.034; // ~6.7cm diameter
// Cooler/whiter than football's floodlight GLOW — reads as bright daytime
// broadcast lighting rather than a night stadium, matching the "Grand Slam"
// elegance the redesign brief asks for.
const GLOW = "#eef3ff";
// A deep ivy/hedge green — the signature Wimbledon/Grand-Slam backdrop
// color, replacing the generic slate stadium-wall tone every scene shared
// before this, so tennis reads as its own refined venue rather than a
// re-tinted stadium.
const STAND_COLOR = "#0e3d28";
// A thin royal-purple trim strip along the stand's top edge — paired with
// the green, this is the other half of the iconic Wimbledon/Grand-Slam
// color scheme (see Stadium.tsx's Stand `trimColor` prop).
const STAND_TRIM = "#5b2a86";

// Each player holds a baseline "ready position" (three/formations.ts-style
// slot) and eases toward a new target each rally exchange — replacing the
// old continuous sine-wave sway, which never truly settled or reacted, with
// discrete move-hit-recover positioning (the real shape of a tennis rally):
// the receiver moves toward where the shot is aimed, the hitter recovers
// back toward the center of their baseline.
const PLAYER_BASE_Z = [-COURT_HALF_LENGTH + 1.5, COURT_HALF_LENGTH - 1.5];
const FACING_Y = [0, Math.PI];
const COVERAGE = 2.6; // meters either side of center a receiver moves to cover
const RALLY_SEGMENT = 1.5; // seconds per shot exchange
const CONTACT_HEIGHT = 1.0; // where a racket meets the ball, roughly hip/chest height
const REACTION_DELAY_MIN = 0.15;
const REACTION_DELAY_MAX = 0.4;

// Real ITF singles court markings: baselines, sidelines, service lines
// (6.4m from the net) and the center service line splitting each service
// box — the current court only had a boundary rectangle before this pass.
// Merged into one BufferGeometry (three/markings.ts) instead of separate
// meshes, same fix that took football's markings from ~30fps to 60fps.
function CourtMarkings() {
  const geometry = useMemo(() => {
    const y = -0.49;
    const lines: LineSpec[] = [
      { position: [0, y, -COURT_HALF_LENGTH], size: [COURT_HALF_WIDTH * 2, LINE_WIDTH] },
      { position: [0, y, COURT_HALF_LENGTH], size: [COURT_HALF_WIDTH * 2, LINE_WIDTH] },
      { position: [-COURT_HALF_WIDTH, y, 0], size: [LINE_WIDTH, COURT_HALF_LENGTH * 2] },
      { position: [COURT_HALF_WIDTH, y, 0], size: [LINE_WIDTH, COURT_HALF_LENGTH * 2] },
      { position: [0, y, -SERVICE_LINE_Z], size: [COURT_HALF_WIDTH * 2, LINE_WIDTH] },
      { position: [0, y, SERVICE_LINE_Z], size: [COURT_HALF_WIDTH * 2, LINE_WIDTH] },
      { position: [0, y, -SERVICE_LINE_Z / 2], size: [LINE_WIDTH, SERVICE_LINE_Z] },
      { position: [0, y, SERVICE_LINE_Z / 2], size: [LINE_WIDTH, SERVICE_LINE_Z] },
    ];
    return buildMarkingsGeometry(lines);
  }, []);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#ffffff" />
    </mesh>
  );
}

// Ball travels between each player's current target position (a rally)
// instead of an independent sine wave, triggering "swing" on whichever
// player is about to hit it back at the start of each exchange (delayed by
// a seeded human reaction time, same as football/basketball). `active`
// gates recompute/state updates when this zone isn't docked — see
// FootballScene's Ball for the same pattern and rationale.
function Ball({
  active,
  onSwinger,
}: {
  active: boolean;
  onSwinger: (swinger: number, targets: [number, number]) => void;
}) {
  const ref = useRef<Mesh>(null);
  const lastSegment = useRef(-1);
  const trailRef = useRef<[number, number, number][]>([]);
  const targetsRef = useRef<[number, number]>([0, 0]);
  const pendingSwinger = useRef<number | null>(null);
  const pendingAt = useRef(0);

  useFrame(({ clock }, delta) => {
    if (!active) return;
    const elapsed = clock.getElapsedTime();
    const segment = Math.floor(elapsed / RALLY_SEGMENT);
    const from = segment % 2;
    const to = (segment + 1) % 2;
    if (segment !== lastSegment.current) {
      lastSegment.current = segment;
      // The receiver moves to cover where the shot is aimed; the hitter
      // (who just struck it) recovers back toward the center of their
      // baseline — the real shape of a rally, not a perpetual sine sweep.
      targetsRef.current = [0, 0];
      targetsRef.current[to] = (seededRandom(segment) - 0.5) * 2 * COVERAGE;
      pendingSwinger.current = from;
      pendingAt.current = elapsed + REACTION_DELAY_MIN + seededRandom(elapsed) * (REACTION_DELAY_MAX - REACTION_DELAY_MIN);
    }
    if (pendingSwinger.current !== null && elapsed >= pendingAt.current) {
      onSwinger(pendingSwinger.current, targetsRef.current);
      pendingSwinger.current = null;
    }

    const segStart = segment * RALLY_SEGMENT;
    const progress = (elapsed - segStart) / RALLY_SEGMENT;
    const t = progress * RALLY_SEGMENT;

    const fromPos: [number, number, number] = [targetsRef.current[from], 0, PLAYER_BASE_Z[from]];
    const toPos: [number, number, number] = [targetsRef.current[to], 0, PLAYER_BASE_Z[to]];
    const [x, , z] = lerp3(fromPos, toPos, progress);
    // Real gravity-driven flight with one bounce on the court partway
    // through — the real shape of a tennis exchange: struck at contact
    // height, arcs down, bounces, and rises back to the next player's
    // contact height, instead of a fixed cosine hump that never touched
    // the ground.
    const y = bouncedFlightHeight(t, RALLY_SEGMENT, CONTACT_HEIGHT, BALL_RADIUS, CONTACT_HEIGHT, 0.62);

    ref.current?.position.set(x, y, z);
    if (ref.current) {
      const horizontalSpeed = Math.hypot(toPos[0] - fromPos[0], toPos[2] - fromPos[2]) / RALLY_SEGMENT;
      ref.current.rotation.x += horizontalSpeed * delta * 2.2;
    }
    trailRef.current.push([x, y, z]);
    if (trailRef.current.length > 6) trailRef.current.shift();
  });

  return (
    <>
      <mesh ref={ref}>
        <sphereGeometry args={[BALL_RADIUS, 12, 12]} />
        <meshStandardMaterial color="#d4f04c" />
      </mesh>
      <BallTrail positionsRef={trailRef} />
    </>
  );
}

export default function TennisScene() {
  const [swingerIndex, setSwingerIndex] = useState<number | null>(null);
  const [targets, setTargets] = useState<[number, number]>([0, 0]);
  const active = useActiveZone() === "tennis";

  return (
    <>
      <ambientLight intensity={0.5} />
      {/* Low-intensity cool violet-blue fill — ties the scene into the new
          Galaxy palette without touching the tuned GLOW/directional rig
          below. */}
      <ambientLight intensity={0.1} color="#241b4d" />
      <directionalLight position={[5, 8, 4]} intensity={0.65} />
      <spotLight position={[0, 9, 0]} angle={0.6} penumbra={0.5} intensity={0.7} color={GLOW} />

      {/* grass court — kept as a standard (non-clearcoat) material: a
          gloss coat suits polished wood/wet turf, not grass/clay */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[COURT_HALF_WIDTH * 2 + 5, COURT_HALF_LENGTH * 2 + 6]} />
        <meshStandardMaterial color="#2f6b3c" />
      </mesh>
      <CourtMarkings />

      {/* net — real posts sit ~0.91m outside each sideline, net height
          dips from 1.07m at the posts to 0.914m at the center; a flat
          ~1.0m average is a reasonable stylized middle ground */}
      <mesh position={[0, NET_HEIGHT / 2 - 0.5, 0]}>
        <boxGeometry args={[COURT_HALF_WIDTH * 2 + 1.8, NET_HEIGHT, 0.05]} />
        <meshStandardMaterial color="#e5e7eb" transparent opacity={0.85} />
      </mesh>

      {/* stadium stands along both sides, rotated so their long axis runs
          the length of the court, plus a crowd above each (tiered seating,
          not hidden behind/below the stand wall) */}
      <Stand
        position={[-COURT_HALF_WIDTH - 2.2, 0.55, 0]}
        rotation={[0.25, Math.PI / 2, 0]}
        width={COURT_HALF_LENGTH * 2 + 6}
        color={STAND_COLOR}
        trimColor={STAND_TRIM}
      />
      <Crowd
        position={[-COURT_HALF_WIDTH - 2.8, 1.25, 0]}
        rotation={[0, Math.PI / 2, 0]}
        accentColor={PLAYER_2_COLOR}
        rows={4}
        seatsPerRow={20}
      />
      <Stand
        position={[COURT_HALF_WIDTH + 2.2, 0.55, 0]}
        rotation={[0.25, -Math.PI / 2, 0]}
        width={COURT_HALF_LENGTH * 2 + 6}
        color={STAND_COLOR}
        trimColor={STAND_TRIM}
      />
      <Crowd
        position={[COURT_HALF_WIDTH + 2.8, 1.25, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        accentColor={PLAYER_1_COLOR}
        rows={4}
        seatsPerRow={20}
      />

      <FloodlightPole position={[-COURT_HALF_WIDTH - 3.5, 0, -COURT_HALF_LENGTH - 1.5]} glowColor={GLOW} />
      <FloodlightPole position={[COURT_HALF_WIDTH + 3.5, 0, -COURT_HALF_LENGTH - 1.5]} glowColor={GLOW} />
      <FloodlightPole position={[-COURT_HALF_WIDTH - 3.5, 0, COURT_HALF_LENGTH + 1.5]} glowColor={GLOW} />
      <FloodlightPole position={[COURT_HALF_WIDTH + 3.5, 0, COURT_HALF_LENGTH + 1.5]} glowColor={GLOW} />

      <Player
        color={PLAYER_1_COLOR}
        animation={swingerIndex === 0 ? "swing" : "run"}
        target={{ x: targets[0], z: PLAYER_BASE_Z[0], maxSpeed: 3, facingY: FACING_Y[0] }}
      />
      <Player
        color={PLAYER_2_COLOR}
        animation={swingerIndex === 1 ? "swing" : "run"}
        target={{ x: targets[1], z: PLAYER_BASE_Z[1], maxSpeed: 3, facingY: FACING_Y[1] }}
      />

      <Ball
        active={active}
        onSwinger={(swinger, newTargets) => {
          setSwingerIndex(swinger);
          setTargets(newTargets);
        }}
      />
    </>
  );
}
