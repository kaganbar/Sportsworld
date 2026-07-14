// Single source of truth for the persistent world's zone layout — every
// other new piece (WorldCameraRig, PersistentWorld, Nebula, the per-scene
// active-zone gating) reads from this instead of hand-copying offsets.
//
// Each scene is now built at 1 unit = 1 real meter (see FootballScene/
// BasketballScene/TennisScene's real-world-dimension rebuild) — a football
// pitch alone now spans +/-34m, so the old 60-unit zone spacing (sized for
// a 20-unit-wide stand) would visually overlap neighboring zones. 180-unit
// spacing comfortably clears every zone's real footprint (largest is
// football's own +/-34m pitch plus ~8m of stands/floodlights either side).
export type ZoneKey = "football" | "basketball" | "tennis";

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
// screenshot rather than computed blindly.
export const ZONES: Record<ZoneKey, ZoneConfig> = {
  football: { offset: [0, 0, 0], camera: { y: 18, z: 30, fov: 45, swayXAmp: 3, swayXSpeed: 0.08 } },
  basketball: { offset: [180, 0, 0], camera: { y: 12, z: 20, fov: 45, swayXAmp: 2.5, swayXSpeed: 0.07 } },
  tennis: { offset: [360, 0, 0], camera: { y: 10, z: 18, fov: 45, swayXAmp: 2, swayXSpeed: 0.06 } },
};

export const ZONE_ORDER: ZoneKey[] = ["football", "basketball", "tennis"];

// Non-sport pages (home, transfers, news, profile, settings, ai-center,
// other-sports) park the camera here instead of hiding the 3D layer — a
// pulled-back shot where all three zones are visible glowing in the
// distance, "arenas floating in a luxurious dark space." Pulled back
// further than before (zones now span 0-360 instead of 0-120, and each
// zone itself is much larger).
export const HOME_CAMERA = { position: [180, 140, 480] as [number, number, number], fov: 55 };
