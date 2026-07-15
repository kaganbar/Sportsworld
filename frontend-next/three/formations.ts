// Fixed formation-slot positions in real-meter court/pitch coordinates
// (see FootballScene/BasketballScene/TennisScene's real-world dimension
// constants), replacing the circular orbit/sway paths every off-ball
// player previously moved along. A player eases toward their slot (real
// momentum, see Player.tsx's `target` prop) rather than sitting on a fixed
// ellipse — and the whole shape shifts along the pitch/court depending on
// which slot currently holds the ball, the "tactical intelligence" ask:
// the line drops back when the deepest player has it, pushes up when the
// most advanced one does, instead of every player running in a random
// loop regardless of where the ball actually is.

export interface Slot {
  x: number;
  z: number;
}

// Three outfield slots spread across the pitch (a deep-lying, a central,
// and an advanced position) — not a full 11-a-side shape (there are only
// 3 outfield players in this scene), but a real spread instead of 3
// players orbiting the center circle in ellipses.
export const FOOTBALL_SLOTS: Slot[] = [
  { x: -12, z: -18 },
  { x: 10, z: -1 },
  { x: -6, z: 19 },
];
// How far the whole line shifts (meters, along Z) per step away from the
// "currently in possession" slot — deepest slot in possession pulls the
// shape back, most advanced slot in possession pushes it forward.
export const FOOTBALL_SHIFT_PER_SLOT = 7;

export const BASKETBALL_SLOTS: Slot[] = [
  { x: -3, z: -4.5 },
  { x: 3, z: 4.5 },
];
export const BASKETBALL_SHIFT_PER_SLOT = 3.2;

// Tennis already anchors each player to their own baseline half (see
// TennisScene's own PLAYER_BASE_Z) — no formation-slot table needed here.

// Two decorative background infielders (pitcher/catcher/batter are
// hand-positioned in BaseballScene, tied directly to the pitch/hit
// choreography — these two are just ambient field presence, static
// positions like BasketballScene's own idle bench player, not a
// possession-driven formation shift the way football/basketball's
// SHIFT_PER_SLOT is: real infielders don't collectively shift toward
// whoever currently "has" the ball the way an offensive line does).
export const BASEBALL_SLOTS: Slot[] = [
  { x: -14, z: 32 }, // shortstop-ish
  { x: 16, z: 24 }, // first-base-area
];

// Volleyball, like tennis, anchors each player to their own side of the net
// (see VolleyballScene's own PLAYER_BASE_Z) rather than a formation-slot
// table — no possession-shift concept applies to a 2-a-side rally either.
