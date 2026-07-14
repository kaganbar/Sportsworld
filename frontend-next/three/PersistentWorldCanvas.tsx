"use client";

import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping } from "three";

import PersistentWorld from "./PersistentWorld";

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

// Replaces the old per-page three/SportBackgroundCanvas.tsx — mounted ONCE
// in app/layout.tsx (via next/dynamic({ssr:false}), same boundary
// SportBackgroundCanvas used, since hasWebGL() touches `document` at call
// time) rather than per-sport-page, so the world persists across
// navigation and WorldCameraRig can fly the camera between zones instead
// of the canvas unmounting/remounting.
export default function PersistentWorldCanvas() {
  if (!hasWebGL()) return null; // CSS gradient background shows through untouched

  return (
    // fixed, not absolute — pinned to the viewport regardless of page
    // scroll height (see the equivalent comment history in the retired
    // SportBackgroundCanvas.tsx for the original bug this avoids).
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <Canvas
        // @react-three/fiber sets its own inline pointer-events on the
        // actual <canvas> element, which otherwise overrides this wrapper
        // div's pointer-events-none class (a real bug hit once already).
        style={{ pointerEvents: "none" }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: "low-power", alpha: true }}
        camera={{ position: [60, 35, 130], fov: 55 }}
        onCreated={({ gl }) => {
          // Without this the WebGL clear color paints opaque black
          // wherever the scene has no geometry (sky/empty space),
          // completely hiding the CSS gradient + scrim behind it instead
          // of blending with them.
          gl.setClearColor(0x000000, 0);
          // Filmic tone mapping — richer contrast/highlight rolloff than
          // the flat default (alpha-safe: a per-material renderer setting
          // applied during the normal forward render, not a post-process
          // pass).
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.15;
        }}
      >
        <PersistentWorld />
      </Canvas>
    </div>
  );
}
