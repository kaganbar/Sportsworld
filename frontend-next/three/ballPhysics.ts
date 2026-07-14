// Real gravity-driven ball trajectories, replacing the old cosmetic
// `Math.sin(progress * Math.PI) * ARC_HEIGHT` curve every scene's Ball
// component used — that was a fixed shape with no physical basis. These
// instead solve the actual launch velocity needed to connect two heights
// over a given flight duration under constant gravity, so the resulting
// arc is a real parabola, not an approximation of one.
const G = 9.81; // m/s^2

// Solves the initial vertical velocity for a projectile that starts at
// height y0 and, after `duration` seconds under gravity `g`, is at height
// y1 — a real closed-form solution (y(t) = y0 + vy0*t - 0.5*g*t^2, solved
// for vy0 at t=duration), not an approximation.
export function solveVy0(y0: number, y1: number, duration: number, g = G): number {
  return (y1 - y0 + 0.5 * g * duration * duration) / duration;
}

export function projectileY(t: number, y0: number, vy0: number, g = G): number {
  return y0 + vy0 * t - 0.5 * g * t * t;
}

// A single unbroken real arc from y0 to y1 over `duration` — the "airborne
// pass/shot" case (basketball's pass and shot both stay airborne the whole
// way in real play, no bounce).
export function singleArcHeight(t: number, duration: number, y0: number, y1: number, g = G): number {
  const vy0 = solveVy0(y0, y1, duration, g);
  return projectileY(t, y0, vy0, g);
}

// A two-phase real trajectory: a full parabola from y0 down to `groundY`
// (the bounce point) over the first `flightPortion` of `duration`, then a
// second, independent parabola bouncing from `groundY` up to y1 over the
// remainder — both phases solved the same way as singleArcHeight, just
// chained. Models one real ground bounce mid-flight: football's ball
// settling at a receiver's feet after a small decaying hop, or tennis's
// ball bouncing off the court before the next player meets it at contact
// height. Always lands exactly at y1 when t=duration (no drift/pop at the
// segment boundary), since each phase is solved as its own closed-form
// parabola rather than approximated.
export function bouncedFlightHeight(
  t: number,
  duration: number,
  y0: number,
  groundY: number,
  y1: number,
  flightPortion = 0.75,
  g = G,
): number {
  const t1 = duration * flightPortion;
  const t2 = duration - t1;
  if (t <= t1) {
    return singleArcHeight(t, t1, y0, groundY, g);
  }
  return singleArcHeight(t - t1, t2, groundY, y1, g);
}
