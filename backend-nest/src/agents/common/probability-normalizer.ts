// Structured outputs can't enforce cross-field sums, so raw probabilities
// usually land near-but-not-exactly 100. Rescale proportionally, then push
// the rounding remainder into the largest bucket. Mirrors the Django
// football_agent/basketball_agent/tennis_agent _normalize_probabilities().

export function normalizeThreeWay(home: number, draw: number, away: number): [number, number, number] {
  const total = home + draw + away;
  if (total <= 0) return [34, 33, 33];
  const scaled = [home, draw, away].map((v) => Math.round((v * 100) / total));
  const remainder = 100 - (scaled[0] + scaled[1] + scaled[2]);
  scaled[scaled.indexOf(Math.max(...scaled))] += remainder;
  return [scaled[0], scaled[1], scaled[2]];
}

export function normalizeTwoWay(a: number, b: number): [number, number] {
  const total = a + b;
  if (total <= 0) return [50, 50];
  const scaled = [a, b].map((v) => Math.round((v * 100) / total));
  const remainder = 100 - (scaled[0] + scaled[1]);
  scaled[scaled.indexOf(Math.max(...scaled))] += remainder;
  return [scaled[0], scaled[1]];
}
