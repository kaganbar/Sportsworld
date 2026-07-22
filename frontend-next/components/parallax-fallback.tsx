"use client";

import { useActiveZone } from "@/lib/world-zone";
import { neutralGlow, sportsTheme } from "@/theme/sportsTheme";

const homeBackground =
  `radial-gradient(circle at 50% 15%, rgba(255,255,255,0.08), transparent 60%), ` +
  `linear-gradient(160deg, rgb(${neutralGlow.secondaryRgb}), rgb(${neutralGlow.primaryRgb}))`;

// Sits one layer behind PersistentWorldCanvas (-z-10), so it's what actually
// shows through on hasWebGL() === false (that component renders null) or
// through the 3D scene's empty alpha regions, instead of the flat
// bg-neutral-950 body color. Reuses each sport's own gradient
// (sportsTheme[key].background) rather than a photo, since the project has
// no photographic background assets.
//
// background-attachment: fixed is the classic CSS parallax technique, but
// this div is already `position: fixed` (pinned to the viewport), so the
// attachment mode is a no-op here rather than a cross-browser risk — iOS
// Safari's well-known bug only breaks background-attachment: fixed on
// elements that scroll with the page, which this element never does.
export default function ParallaxFallback() {
  const zone = useActiveZone();
  const background = zone === "home" ? homeBackground : sportsTheme[zone].background;

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-20"
      style={{
        backgroundImage: background,
        backgroundAttachment: "fixed",
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}
