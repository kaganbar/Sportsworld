"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide, type Mesh } from "three";
import Player from "./Player";
import Crowd from "./Crowd";
import { Stand, ArenaRig } from "./Stadium";
import { lerp3 } from "./orbitMath";
import BallTrail from "./BallTrail";
import { useActiveZone } from "@/lib/world-zone";
import { buildMarkingsGeometry, LineSpec } from "./markings";
import { seededRandom } from "./rng";
import { singleArcHeight } from "./ballPhysics";

const HOME_COLOR = "#ca8a04";
const AWAY_COLOR = "#1e3a8a";
// Warm indoor-arena glow, same family as basketball's — volleyball is
// played indoors under bright overhead lighting just like basketball.
const GLOW = "#fff2e0";
const STAND_COLOR = "#2a2438";

// Real FIVB indoor court, 1 three.js unit = 1 meter.
const COURT_HALF_LENGTH = 9; // 18m baseline-to-baseline
const COURT_HALF_WIDTH = 4.5; // 9m sideline-to-sideline
const ATTACK_LINE_Z = 3; // 3m from the center/net line
const LINE_WIDTH = 0.05;
const NET_HEIGHT = 2.43; // men's regulation height (no separate women's constant — same single-height simplification as tennis's one NET_HEIGHT)
const NET_DEPTH = 1.0; // real net's own vertical span
const BALL_RADIUS = 0.105; // ~21cm diameter

// Each hitter holds a baseline "ready position" and eases toward a new
// target each rally exchange, then recovers back toward center — same
// move-hit-recover shape as TennisScene's players. Unlike tennis, the ball
// itself never touches the court mid-rally (see Ball below): a volleyball
// exchange is one continuous arc over the net per hit, not a bounce.
const PLAYER_BASE_Z = [-5.5, 5.5];
const FACING_Y = [0, Math.PI];
const COVERAGE = 3; // meters either side of center a receiver moves to cover
const RALLY_SEGMENT = 1.4; // seconds per hit exchange
const CONTACT_HEIGHT = 2.0; // overhead hit/spike contact point
const REACTION_DELAY_MIN = 0.1;
const REACTION_DELAY_MAX = 0.25;

function CourtMarkings() {
  const geometry = useMemo(() => {
    const y = -0.49;
    const lines: LineSpec[] = [
      { position: [0, y, -COURT_HALF_LENGTH], size: [COURT_HALF_WIDTH * 2, LINE_WIDTH] },
      { position: [0, y, COURT_HALF_LENGTH], size: [COURT_HALF_WIDTH * 2, LINE_WIDTH] },
      { position: [-COURT_HALF_WIDTH, y, 0], size: [LINE_WIDTH, COURT_HALF_LENGTH * 2] },
      { position: [COURT_HALF_WIDTH, y, 0], size: [LINE_WIDTH, COURT_HALF_LENGTH * 2] },
      { position: [0, y, 0], size: [COURT_HALF_WIDTH * 2, LINE_WIDTH] },
      { position: [0, y, -ATTACK_LINE_Z], size: [COURT_HALF_WIDTH * 2, LINE_WIDTH] },
      { position: [0, y, ATTACK_LINE_Z], size: [COURT_HALF_WIDTH * 2, LINE_WIDTH] },
    ];
    return buildMarkingsGeometry(lines);
  }, []);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#ffffff" />
    </mesh>
  );
}

function NetAndPosts() {
  const netCenterY = NET_HEIGHT - NET_DEPTH / 2;
  return (
    <group>
      <mesh position={[0, netCenterY, 0]}>
        <planeGeometry args={[COURT_HALF_WIDTH * 2 + 0.6, NET_DEPTH]} />
        <meshStandardMaterial color="#1a1a1a" transparent opacity={0.55} side={DoubleSide} />
      </mesh>
      <mesh position={[0, NET_HEIGHT + 0.02, 0]}>
        <boxGeometry args={[COURT_HALF_WIDTH * 2 + 0.6, 0.06, 0.08]} />
        <meshStandardMaterial color="#f5f5f4" />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (COURT_HALF_WIDTH + 0.3), (NET_HEIGHT + 0.15) / 2, 0]}>
          <cylinderGeometry args={[0.04, 0.04, NET_HEIGHT + 0.15, 8]} />
          <meshStandardMaterial color="#2d2d2d" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

// Ball travels between each hitter's current target position (a rally),
// triggering "swing" on whichever player is about to hit it back at the
// start of each exchange (delayed by a seeded human reaction time, same as
// football/basketball/baseball). Unlike TennisScene's Ball, this is a
// single continuous arc per exchange (singleArcHeight, no bounce) — a real
// volleyball rally never touches the court between hits, unlike tennis's
// one-bounce-per-shot. `active` gates recompute when this zone isn't
// docked — see FootballScene's Ball for the same pattern and rationale.
function Ball({
  active,
  onSwinger,
}: {
  active: boolean;
  onSwinger: (swinger: number | null, targets: [number, number]) => void;
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
      // The receiver moves to cover where the ball is aimed; the hitter
      // (who just struck it) recovers back toward the center of their side.
      targetsRef.current = [0, 0];
      targetsRef.current[to] = (seededRandom(segment) - 0.5) * 2 * COVERAGE;
      pendingSwinger.current = from;
      pendingAt.current = elapsed + REACTION_DELAY_MIN + seededRandom(elapsed) * (REACTION_DELAY_MAX - REACTION_DELAY_MIN);
      // Clear the previous hitter's swing pose immediately at the start of
      // a new exchange rather than waiting on a reaction delay.
      onSwinger(null, targetsRef.current);
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
    // A single real gravity-driven arc clearing the net, not a bounce — see
    // this function's own doc comment for why (a rally never touches the
    // court between hits).
    const y = singleArcHeight(t, RALLY_SEGMENT, CONTACT_HEIGHT, CONTACT_HEIGHT);

    ref.current?.position.set(x, y, z);
    if (ref.current) {
      const horizontalSpeed = Math.hypot(toPos[0] - fromPos[0], toPos[2] - fromPos[2]) / RALLY_SEGMENT;
      ref.current.rotation.x += horizontalSpeed * delta * 1.8;
    }
    trailRef.current.push([x, y, z]);
    if (trailRef.current.length > 6) trailRef.current.shift();
  });

  return (
    <>
      <mesh ref={ref}>
        <sphereGeometry args={[BALL_RADIUS, 14, 14]} />
        <meshStandardMaterial color="#f2d9a8" />
      </mesh>
      <BallTrail positionsRef={trailRef} baseSize={0.1} />
    </>
  );
}

export default function VolleyballScene() {
  const [swingerIndex, setSwingerIndex] = useState<number | null>(null);
  const [targets, setTargets] = useState<[number, number]>([0, 0]);
  const active = useActiveZone() === "volleyball";

  return (
    <>
      <ambientLight intensity={0.45} />
      <ambientLight intensity={0.1} color="#241b4d" />
      <directionalLight position={[5, 8, 4]} intensity={0.6} />
      <spotLight position={[0, 9, 0]} angle={0.65} penumbra={0.5} intensity={0.85} color={GLOW} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[COURT_HALF_WIDTH * 2 + 6, COURT_HALF_LENGTH * 2 + 6]} />
        <meshPhysicalMaterial color="#274b7a" clearcoat={0.4} clearcoatRoughness={0.25} roughness={0.6} />
      </mesh>
      <CourtMarkings />
      <NetAndPosts />

      <Stand position={[0, 0.55, -COURT_HALF_LENGTH - 2.5]} width={COURT_HALF_LENGTH * 2 + 6} color={STAND_COLOR} />
      <Crowd position={[0, 1.25, -COURT_HALF_LENGTH - 3]} accentColor={HOME_COLOR} rows={4} accentChance={0.28} />
      <Stand
        position={[0, 0.55, COURT_HALF_LENGTH + 2.5]}
        rotation={[0.25, Math.PI, 0]}
        width={COURT_HALF_LENGTH * 2 + 6}
        color={STAND_COLOR}
      />
      <Crowd
        position={[0, 1.25, COURT_HALF_LENGTH + 3]}
        rotation={[0, Math.PI, 0]}
        accentColor={AWAY_COLOR}
        rows={4}
        accentChance={0.28}
      />

      <ArenaRig position={[0, 0, 0]} glowColor={GLOW} active={active} />

      <Player
        color={HOME_COLOR}
        animation={swingerIndex === 0 ? "swing" : "idle"}
        target={{ x: targets[0], z: PLAYER_BASE_Z[0], maxSpeed: 3, facingY: FACING_Y[0] }}
        active={active}
      />
      <Player color={HOME_COLOR} animation="idle" position={[-2.2, 0, -3.5]} rotationY={FACING_Y[0]} active={active} />
      <Player
        color={AWAY_COLOR}
        animation={swingerIndex === 1 ? "swing" : "idle"}
        target={{ x: targets[1], z: PLAYER_BASE_Z[1], maxSpeed: 3, facingY: FACING_Y[1] }}
        active={active}
      />
      <Player color={AWAY_COLOR} animation="idle" position={[2.2, 0, 3.5]} rotationY={FACING_Y[1]} active={active} />

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
