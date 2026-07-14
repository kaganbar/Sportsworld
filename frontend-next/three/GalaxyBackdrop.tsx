"use client";

import { Stars } from "@react-three/drei";

// The one literal "Galaxy Style" signature element — a thin, tuned-once
// wrapper around drei's Stars, now mounted ONCE for the whole persistent
// world (three/PersistentWorld.tsx) rather than per-scene, sized via
// `radius` to comfortably cover all three zones. Modest count-per-volume
// given the existing low-power perf budget (see
// SportBackgroundCanvas.tsx's powerPreference) — re-tune if the FPS
// re-measurement (mandatory per the redesign plan) comes in low.
export default function GalaxyBackdrop({ radius = 60, count = 500 }: { radius?: number; count?: number }) {
  return <Stars radius={radius} depth={40} count={count} factor={2} saturation={0} fade speed={0.3} />;
}
