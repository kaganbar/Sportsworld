"use client";

import { useMemo } from "react";
import * as THREE from "three";

// Cheap "volumetric" light shaft — a few soft-edged, additive-blended
// cone-shaped billboards crossed around the Y axis (the standard game-dev
// trick for fake volumetric god-rays, not a real raymarched fog pass — see
// the plan's Context section on why that's out of reach here). The tapered
// shape + soft fade is baked into a procedural CanvasTexture (same
// zero-asset technique as three/Nebula.tsx's nebula sprites) rather than
// real 3D cone geometry, since an actual cone reads as a solid opaque wedge
// from above instead of a soft light beam.
//
// Rendered as normal transparent scene geometry via RenderPass (not a
// full-screen post-process pass), so none of Effects.tsx's alpha-safety
// concerns (see UnrealBloomPass comment there) apply — additive blending +
// depthWrite:false on ordinary mesh geometry never touches the canvas's own
// clear-alpha.
function useShaftTexture() {
  return useMemo(() => {
    const w = 128;
    const h = 256;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;

    // Vertical brightness falloff: bright near the lamp (top), dim but
    // nonzero at the base — a faint pool of light still reaches the ground.
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(255,255,255,0.9)");
    grad.addColorStop(1, "rgba(255,255,255,0.08)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Clip to a tapered beam shape (narrow at the lamp, wide at the base),
    // blurred so it reads as a soft shaft rather than a hard-edged wedge.
    ctx.globalCompositeOperation = "destination-in";
    ctx.filter = "blur(6px)";
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w * 0.12, h);
    ctx.lineTo(w * 0.88, h);
    ctx.closePath();
    ctx.fillStyle = "white";
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

export default function LightShaft({
  height = 6,
  width = 3.2,
  color = "#fff8e1",
}: {
  height?: number;
  width?: number;
  color?: string;
}) {
  const texture = useShaftTexture();
  const rotations = [0, Math.PI / 3, (2 * Math.PI) / 3];

  return (
    <group>
      {rotations.map((ry) => (
        <mesh key={ry} rotation={[0, ry, 0]} position={[0, -height / 2, 0]}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial
            map={texture}
            color={color}
            transparent
            opacity={0.35}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}
