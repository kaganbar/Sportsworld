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

// Tennis already anchors each player to their own baseline half — no
// zone-reactive shift needed (a baseline player doesn't advance into the
// net between rally shots), just the same momentum-based easing instead
// of the old pure sine-wave sway.
export const TENNIS_SLOTS: Slot[] = [];
