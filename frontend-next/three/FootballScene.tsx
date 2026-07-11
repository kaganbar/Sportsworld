"use client";

import { useFrame, useThree } from "@react-three/fiber";
import OrbitingSphere from "./OrbitingSphere";
import Player from "./Player";
import Crowd from "./Crowd";
import { Stand, FloodlightPole } from "./Stadium";

const HOME_COLOR = "#f3f6f3";
const AWAY_COLOR = "#1e3a8a";
const GLOW = "#fff8e1";

const PLAYERS = [
  { radius: 3, speed: 0.4, offset: 0, color: HOME_COLOR },
  { radius: 2.2, speed: 0.55, offset: 2, color: AWAY_COLOR },
  { radius: 3.5, speed: 0.3, offset: 4, color: HOME_COLOR },
  { radius: 2.6, speed: 0.5, offset: 1.2, color: AWAY_COLOR },
];

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

export default function FootballScene() {
  return (
    <>
      <CameraDrift />
      <ambientLight intensity={0.45} />
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

      {PLAYERS.map((p, i) => (
        <Player
          key={i}
          color={p.color}
          animation="run"
          scale={0.55}
          orbit={{ radius: p.radius, speed: p.speed, offset: p.offset, y: 0, zScale: 0.55 }}
        />
      ))}
      {/* the ball — smaller, faster, different phase so it weaves between players */}
      <OrbitingSphere radius={1.4} speed={0.9} offset={0.5} color="#ffffff" size={0.18} y={0.2} />
    </>
  );
}
