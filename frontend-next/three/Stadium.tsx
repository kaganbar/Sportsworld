"use client";

import LightShaft from "./LightShaft";

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
        {/* MeshPhysicalMaterial + anisotropy: a brushed-metal reflection
            response (streaked highlights that shift with viewing angle)
            instead of MeshStandardMaterial's uniform, plastic-looking
            specular — the same "real fidelity step up, zero new assets"
            move as the pitch/court clearcoat swaps in FootballScene/
            BasketballScene. */}
        <cylinderGeometry args={[0.06, 0.08, 6, 8]} />
        <meshPhysicalMaterial color="#2d2d2d" metalness={0.8} roughness={0.35} anisotropy={0.6} />
      </mesh>
      <mesh position={[0, 6, 0]}>
        {/* Boosted emissive (0.7 -> 1.8) — under ACESFilmicToneMapping
            (see PersistentWorldCanvas.tsx) this reads as a genuine bright
            highlight with a soft rolloff instead of a flat lit panel, the
            "glow" effect this project settled on instead of a bloom
            post-process pass (see Effects.tsx for why bloom was skipped). */}
        <meshStandardMaterial color="#f5f5f4" emissive={glowColor} emissiveIntensity={1.8} />
      </mesh>
      <pointLight position={[0, 6, 0]} intensity={1.1} distance={22} color={glowColor} />
      <group position={[0, 6, 0]}>
        <LightShaft height={5.5} color={glowColor} />
      </group>
    </group>
  );
}
