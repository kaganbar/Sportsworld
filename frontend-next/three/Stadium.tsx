"use client";

// Shared, cheap stadium/arena building blocks — a tilted stand slab and a
// floodlight pole with a soft glow — reused across all three scenes so
// "inside a stadium" reads consistently without duplicating geometry per
// sport. Deliberately simple (enough to read as a stand/floodlight from a
// background-canvas distance, not a fully modeled venue).

export function Stand({
  position,
  rotation = [-0.25, 0, 0],
  width = 10,
  color = "#475569",
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  color?: string;
}) {
  // Shorter than the original (2.2) so it reads as a perimeter wall rather
  // than a slab dominating the whole upper frame — the crowd tiers (a
  // separate, taller component) sit just above its top edge, not hidden
  // behind it. Lightened from a near-black slate so it doesn't crush to
  // solid black once the readability scrim (theme-layout.tsx) sits on top.
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={[width, 1.6, 1.4]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

export function FloodlightPole({
  position,
  glowColor = "#fff8e1",
}: {
  position: [number, number, number];
  glowColor?: string;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 6, 8]} />
        <meshStandardMaterial color="#2d2d2d" />
      </mesh>
      <mesh position={[0, 6, 0]}>
        <boxGeometry args={[1.1, 0.5, 0.3]} />
        <meshStandardMaterial color="#f5f5f4" emissive={glowColor} emissiveIntensity={0.7} />
      </mesh>
      <pointLight position={[0, 6, 0]} intensity={1.1} distance={22} color={glowColor} />
    </group>
  );
}
