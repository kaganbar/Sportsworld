"use client";

import { useMemo } from "react";
import { Instances, Instance } from "@react-three/drei";

interface CrowdProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  rows?: number;
  seatsPerRow?: number;
  seatSpacing?: number;
  rowRise?: number;
  baseColor?: string;
  accentColor: string;
  // Share of seats rendered in accentColor (team-colored "cheering" seats)
  // vs. the uniform baseColor — real crowd energy differs by sport, not
  // just team color: a reserved Grand Slam crowd reads as mostly uniform,
  // a basketball arena as louder/more scattered color. Defaults to the
  // original hardcoded ratio (Math.random() > 0.82 == 18%) so football's
  // crowd is unchanged.
  accentChance?: number;
}

// A cheap, stylized stand-in for spectators: a grid of small instanced boxes
// with per-instance height/color jitter, rendered in a single draw call via
// drei's <Instances>. Not modeled humans — reads as "a crowd" from the
// camera distance this background sits at, keeps triangle count and bundle
// size low (the whole point of staying within the existing lightweight
// scene budget rather than sourcing new character assets).
export default function Crowd({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  rows = 5,
  seatsPerRow = 24,
  // Real human-scale spacing/box size — the rest of the world is now built
  // at 1 unit = 1 meter (see FootballScene/BasketballScene/TennisScene), so
  // a spectator silhouette needs to be roughly person-sized too, or the
  // crowd reads as a dollhouse next to a real-sized pitch/court.
  seatSpacing = 0.55,
  rowRise = 0.4,
  baseColor = "#1f2937",
  accentColor,
  accentChance = 0.18,
}: CrowdProps) {
  const seats = useMemo(() => {
    const items: { pos: [number, number, number]; heightScale: number; accent: boolean }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let s = 0; s < seatsPerRow; s++) {
        const x = (s - (seatsPerRow - 1) / 2) * seatSpacing + (Math.random() - 0.5) * 0.08;
        const y = r * rowRise;
        const z = -r * seatSpacing * 0.85;
        items.push({
          pos: [x, y, z],
          heightScale: 0.6 + Math.random() * 0.5,
          accent: Math.random() < accentChance,
        });
      }
    }
    return items;
  }, [rows, seatsPerRow, seatSpacing, rowRise, accentChance]);

  return (
    <group position={position} rotation={rotation}>
      <Instances limit={rows * seatsPerRow}>
        <boxGeometry args={[0.45, 0.9, 0.45]} />
        <meshStandardMaterial />
        {seats.map((seat, i) => (
          <Instance
            key={i}
            position={seat.pos}
            scale={[1, seat.heightScale, 1]}
            color={seat.accent ? accentColor : baseColor}
          />
        ))}
      </Instances>
    </group>
  );
}
