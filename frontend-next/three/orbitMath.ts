// Pure position formulas shared between Player.tsx's own useFrame movement
// and each scene's ball choreography — kept as plain functions (not
// component state) so a scene can deterministically compute "where will
// this orbiting/swaying player be at time t" without observing the actual
// mounted Player instance, just by replicating the same math with the same
// parameters passed to both.
export function orbitPosition(
  t: number,
  radius: number,
  speed: number,
  offset: number,
  zScale = 0.55,
  y = 0,
): [number, number, number] {
  const angle = t * speed + offset;
  return [Math.cos(angle) * radius, y, Math.sin(angle) * radius * zScale];
}

export function swayPosition(
  t: number,
  base: [number, number, number],
  axis: "x" | "z",
  amplitude: number,
  speed: number,
  offset: number,
): [number, number, number] {
  const delta = Math.sin(t * speed + offset) * amplitude;
  const [bx, by, bz] = base;
  return axis === "x" ? [bx + delta, by, bz] : [bx, by, bz + delta];
}

export function lerp3(a: [number, number, number], b: [number, number, number], f: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
