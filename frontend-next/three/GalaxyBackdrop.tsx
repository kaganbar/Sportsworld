"use client";

import { Stars } from "@react-three/drei";

// The one literal "Galaxy Style" signature element — a thin, tuned-once
// wrapper around drei's Stars, shared across all three scenes the same way
// Stadium.tsx/Crowd.tsx already are. Modest count given the existing
// low-power perf budget (see SportBackgroundCanvas.tsx's powerPreference).
// Sits far behind the stadium/court geometry — atmosphere, not focus.
export default function GalaxyBackdrop() {
  return <Stars radius={60} depth={40} count={500} factor={2} saturation={0} fade speed={0.3} />;
}
