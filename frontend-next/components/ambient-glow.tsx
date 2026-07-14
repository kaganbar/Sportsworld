"use client";

import { useActiveZone } from "@/lib/world-zone";
import { usePreferences } from "@/lib/preferences";
import { sportsTheme, neutralGlow, SportKey } from "@/theme/sportsTheme";

// The design brief's "ambient background glow" — two large, blurred,
// slowly-drifting radial-gradient blobs, tinted per sport (wayfinding: which
// zone you're in), sitting between the persistent R3F world
// (PersistentWorldCanvas, -z-10) and the shared readability scrim (-z-[5]).
// Deliberately additive to the 3D world, not a replacement for it — see the
// redesign plan's "3D background" decision. Colors come from
// sportsTheme[key].glowRgb / neutralGlow, NOT --brand-accent — ambient tint
// and interactive-chrome accent are two different systems (see globals.css).
export default function AmbientGlow() {
  const zone = useActiveZone();
  const { focusMode } = usePreferences();

  const [primaryRgb, secondaryRgb] =
    zone === "home"
      ? [neutralGlow.primaryRgb, neutralGlow.secondaryRgb]
      : [sportsTheme[zone as SportKey].glowRgb, neutralGlow.primaryRgb];

  // Focus mode softens the ambient layer for readability-sensitive contexts
  // rather than removing it outright — matches the brief's own framing of
  // Focus as "reduce/soften," not "off."
  const baseAlpha = focusMode ? 0.09 : 0.2;
  const secondAlpha = focusMode ? 0.06 : 0.16;

  return (
    <div className="pointer-events-none fixed inset-0 -z-[6] overflow-hidden transition-opacity duration-700">
      <div
        className="ambient-blob"
        style={{
          top: "-15%",
          insetInlineStart: "5%",
          width: "60vw",
          height: "60vw",
          maxWidth: 900,
          maxHeight: 900,
          background: `radial-gradient(circle, rgba(${primaryRgb},${baseAlpha}), transparent 65%)`,
          animationDuration: "22s",
        }}
      />
      <div
        className="ambient-blob"
        style={{
          bottom: "-20%",
          insetInlineEnd: "0%",
          width: "55vw",
          height: "55vw",
          maxWidth: 800,
          maxHeight: 800,
          background: `radial-gradient(circle, rgba(${secondaryRgb},${secondAlpha}), transparent 65%)`,
          animationDuration: "26s",
          animationDirection: "reverse",
        }}
      />
    </div>
  );
}
