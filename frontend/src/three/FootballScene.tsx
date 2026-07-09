import OrbitingSphere from "./OrbitingSphere";

const PLAYERS = [
  { radius: 3, speed: 0.4, color: "#f3f6f3", offset: 0 },
  { radius: 2.2, speed: 0.55, color: "#1e3a8a", offset: 2 },
  { radius: 3.5, speed: 0.3, color: "#1e3a8a", offset: 4 },
  { radius: 2.6, speed: 0.5, color: "#7f1d1d", offset: 1.2 },
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
      {PLAYERS.map((p, i) => (
        <OrbitingSphere key={i} {...p} />
      ))}
      {/* the "ball" — smaller, faster, different phase so it weaves between players */}
      <OrbitingSphere radius={1.4} speed={0.9} offset={0.5} color="#ffffff" size={0.18} y={0.2} />
    </>
  );
}
