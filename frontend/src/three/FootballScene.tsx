import OrbitingSphere from "./OrbitingSphere";
import Player from "./Player";

const HOME_COLOR = "#f3f6f3";
const AWAY_COLOR = "#1e3a8a";

const PLAYERS = [
  { radius: 3, speed: 0.4, offset: 0, color: HOME_COLOR },
  { radius: 2.2, speed: 0.55, offset: 2, color: AWAY_COLOR },
  { radius: 3.5, speed: 0.3, offset: 4, color: HOME_COLOR },
  { radius: 2.6, speed: 0.5, offset: 1.2, color: AWAY_COLOR },
];

export default function FootballScene() {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 4]} intensity={1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[20, 12]} />
        <meshStandardMaterial color="#1e5e2e" />
      </mesh>
      {/* pitch markings: center line + center circle, mirrors a real pitch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.49, 0]}>
        <ringGeometry args={[1.4, 1.5, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
      </mesh>
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
