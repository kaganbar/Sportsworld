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
  seatSpacing = 0.4,
  rowRise = 0.32,
  baseColor = "#1f2937",
  accentColor,
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
          accent: Math.random() > 0.82,
        });
      }
    }
    return items;
  }, [rows, seatsPerRow, seatSpacing, rowRise]);

  return (
    <group position={position} rotation={rotation}>
      <Instances limit={rows * seatsPerRow}>
        <boxGeometry args={[0.26, 0.5, 0.26]} />
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
