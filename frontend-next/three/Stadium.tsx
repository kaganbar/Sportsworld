"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
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
  trimColor,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  color?: string;
  // Optional thin accent strip along the stand's top edge — opt-in (no
  // trim when omitted, so football/basketball's Stand is pixel-identical
  // to before), used by TennisScene for the Wimbledon-purple detailing
  // real Grand Slam venues are known for, on top of the green backdrop.
  trimColor?: string;
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
      {trimColor && (
        <mesh position={[0, 0.83, 0]}>
          <boxGeometry args={[width, 0.12, 1.45]} />
          <meshStandardMaterial color={trimColor} />
        </mesh>
      )}
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

// Center-hung arena rig — a suspended scoreboard box on 4 cables with a
// downward glow, replacing FloodlightPole for basketball. Real indoor
// arenas light the court from an overhead rig above center court, not from
// external corner poles (a real, if easy-to-miss, distinctness gap: before
// this, basketball reused football's literal outdoor-stadium floodlight
// poles). Same primitives/pattern as FloodlightPole (metal cylinder +
// emissive glow mesh + pointLight + LightShaft), just a different silhouette
// and position so the two scenes read as genuinely different venues rather
// than the same rig re-colored.
// Base/peak emissive intensity for the rig's jumbotron-style pulse — kept
// tight (0.5 ± 0.12) so it reads as "a screen is alive up there," not a
// strobe; same "very subtle, never fight for attention" restraint Effects.tsx
// documents for its own DoF tuning.
const RIG_EMISSIVE_BASE = 0.5;
const RIG_EMISSIVE_AMP = 0.12;
const RIG_PULSE_SPEED = 0.6;

export function ArenaRig({
  position = [0, 0, 0],
  glowColor = "#fff2e0",
  size = 3.6,
  active = true,
}: {
  position?: [number, number, number];
  glowColor?: string;
  size?: number;
  // Gates the per-frame pulse update — same active-zone-only-update
  // discipline as FootballScene/BasketballScene/TennisScene's own Ball
  // components, since all 3 zones stay mounted simultaneously.
  active?: boolean;
}) {
  const boardRef = useRef<Mesh>(null);
  const cables: [number, number][] = [
    [-size * 0.35, -size * 0.35],
    [size * 0.35, -size * 0.35],
    [-size * 0.35, size * 0.35],
    [size * 0.35, size * 0.35],
  ];

  useFrame(({ clock }) => {
    if (!active) return;
    const material = boardRef.current?.material;
    if (material && !Array.isArray(material) && "emissiveIntensity" in material) {
      material.emissiveIntensity = RIG_EMISSIVE_BASE + Math.sin(clock.getElapsedTime() * RIG_PULSE_SPEED) * RIG_EMISSIVE_AMP;
    }
  });

  return (
    <group position={position}>
      {cables.map(([x, z], i) => (
        <mesh key={i} position={[x, 10.5, z]}>
          <cylinderGeometry args={[0.025, 0.025, 5, 6]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
      <mesh ref={boardRef} position={[0, 8, 0]}>
        <boxGeometry args={[size, 1.4, size]} />
        <meshPhysicalMaterial color="#0f0f12" metalness={0.55} roughness={0.35} emissive={glowColor} emissiveIntensity={RIG_EMISSIVE_BASE} />
      </mesh>
      <pointLight position={[0, 8, 0]} intensity={1.5} distance={28} color={glowColor} />
      <group position={[0, 8, 0]}>
        <LightShaft height={7} width={size * 1.3} color={glowColor} />
      </group>
    </group>
  );
}
