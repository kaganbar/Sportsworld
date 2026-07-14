"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Stars } from "@react-three/drei";
import { ZONES, ZoneKey } from "./zones";
import { sportsTheme } from "@/theme/sportsTheme";

// Procedural (zero-asset) soft radial-gradient sprite texture, generated
// once via a 2D canvas — the "nebula cloud" billboard look, reused across
// every billboard instance rather than regenerated per-instance.
function useNebulaTexture() {
  return useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, "rgba(255,255,255,0.85)");
      gradient.addColorStop(0.4, "rgba(255,255,255,0.3)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);
}

function lerpColor(a: string, b: string, t: number): string {
  return new THREE.Color(a).lerp(new THREE.Color(b), t).getStyle();
}

// A handful of soft glowing billboard planes (additive-blended sprites —
// ordinary transparent scene geometry rendered via the normal RenderPass,
// NOT a full-screen post-process pass, so none of Effects.tsx's
// alpha-transparency concerns apply here) strung along the straight line
// between two zone anchors, tinted from one zone's accent glow toward the
// other's — the connective atmosphere the camera actually flies past
// during a sport-switch transition. Plus extra star density in the gap on
// top of the main GalaxyBackdrop already covering the whole world.
export function Nebula({ from, to, count = 5 }: { from: ZoneKey; to: ZoneKey; count?: number }) {
  const texture = useNebulaTexture();
  const fromPos = ZONES[from].offset;
  const toPos = ZONES[to].offset;
  const fromColor = sportsTheme[from].glow;
  const toColor = sportsTheme[to].glow;

  const billboards = useMemo(() => {
    const items: { position: [number, number, number]; color: string; scale: number }[] = [];
    for (let i = 0; i < count; i++) {
      const t = (i + 1) / (count + 1);
      const x = fromPos[0] + (toPos[0] - fromPos[0]) * t;
      const y = 10 + Math.sin(t * Math.PI * 2) * 6;
      const z = fromPos[2] + (toPos[2] - fromPos[2]) * t + (i % 2 === 0 ? 14 : -14);
      items.push({
        position: [x, y, z],
        color: lerpColor(fromColor, toColor, t),
        scale: 30 + (i % 3) * 10,
      });
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fromPos/toPos/fromColor/toColor are derived from from/to, already in the dep list
  }, [from, to, count, fromPos, toPos, fromColor, toColor]);

  const midpoint: [number, number, number] = [(fromPos[0] + toPos[0]) / 2, 10, (fromPos[2] + toPos[2]) / 2];

  return (
    <group>
      <group position={midpoint}>
        <Stars radius={40} depth={30} count={200} factor={2.5} saturation={0} fade speed={0.2} />
      </group>
      {billboards.map((b, i) => (
        <sprite key={i} position={b.position} scale={[b.scale, b.scale, 1]}>
          <spriteMaterial map={texture} color={b.color} transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </group>
  );
}


export default Nebula;
