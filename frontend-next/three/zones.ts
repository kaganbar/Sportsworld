// Single source of truth for the persistent world's zone layout — every
// other new piece (WorldCameraRig, PersistentWorld, Nebula, the per-scene
// active-zone gating) reads from this instead of hand-copying offsets.
//
// Each scene is now built at 1 unit = 1 real meter (see FootballScene/
// BasketballScene/TennisScene's real-world-dimension rebuild) — a football
// pitch alone now spans +/-34m, so the old 60-unit zone spacing (sized for
// a 20-unit-wide stand) would visually overlap neighboring zones. 180-unit
// spacing comfortably clears every zone's real footprint (largest is
// baseball's own ~110-120m outfield plus stands/lighting either side).
export type ZoneKey = "football" | "basketball" | "tennis" | "baseball" | "volleyball";

export interface ZoneConfig {
  offset: [number, number, number];
  // swayXAmp/swayXSpeed reproduce each scene's old per-scene CameraDrift
  // values exactly (now owned once by WorldCameraRig instead of 3 separate
  // components) — the docked, steady-state look is unchanged from what
  // was already tuned/verified at 60fps.
  camera: { y: number; z: number; fov: number; swayXAmp: number; swayXSpeed: number };
}

// y/z/fov retuned for each scene's real-meter dimensions — a close-in,
// elevated "broadcast camera" angle (not a full pitch-edge-to-edge bird's
// eye), scaled per zone by how much that specific court actually grew
// (football's pitch grew far more than tennis's court did), verified by
// screenshot rather than computed blindly. Baseball/volleyball's y/z/swayXAmp
// are estimated from the same "close-in broadcast angle scaled to the venue's
// real footprint" logic as the other three (baseball's is the widest venue in
// the whole world, hence the largest z pull-back) — NOT screenshot-verified
// like the original three, since this environment has no browser (see the
// implementation plan's standing caveat); may need retuning once actually seen.
export const ZONES: Record<ZoneKey, ZoneConfig> = {
  football: { offset: [0, 0, 0], camera: { y: 18, z: 30, fov: 45, swayXAmp: 3, swayXSpeed: 0.08 } },
  basketball: { offset: [180, 0, 0], camera: { y: 12, z: 20, fov: 45, swayXAmp: 2.5, swayXSpeed: 0.07 } },
  tennis: { offset: [360, 0, 0], camera: { y: 10, z: 18, fov: 45, swayXAmp: 2, swayXSpeed: 0.06 } },
  baseball: { offset: [540, 0, 0], camera: { y: 26, z: 42, fov: 45, swayXAmp: 3.5, swayXSpeed: 0.07 } },
  volleyball: { offset: [720, 0, 0], camera: { y: 11, z: 19, fov: 45, swayXAmp: 2, swayXSpeed: 0.06 } },
};

export const ZONE_ORDER: ZoneKey[] = ["football", "basketball", "tennis", "baseball", "volleyball"];

// Non-sport pages (home, transfers, news, profile, settings, ai-center) park
// the camera here instead of hiding the 3D layer — a pulled-back shot where
// all five zones are visible glowing in the distance, "arenas floating in a
// luxurious dark space." Recentered on the new 5-zone midpoint (x=360,
// tennis's own position) and pulled back further (span doubled from 360 to
// 720 units, so z/y are scaled ~2x to preserve the same framing margin at the
// unchanged fov=55 — see the zone-count-5 comment history in this file for
// the 3-zone values this was scaled from).
export const HOME_CAMERA = { position: [360, 280, 960] as [number, number, number], fov: 55 };
