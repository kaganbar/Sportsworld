// Deterministic pseudo-random from a numeric seed — same seed in, same
// value out. Originally written once inside Player.tsx for per-instance
// animation jitter; reused here by each scene's reaction-delay timing so
// it isn't reimplemented a second time.
export function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
