import { normalizeThreeWay, normalizeTwoWay } from './probability-normalizer';

describe('normalizeThreeWay', () => {
  it('sums to exactly 100 for typical model output', () => {
    const [home, draw, away] = normalizeThreeWay(45, 25, 31);
    expect(home + draw + away).toBe(100);
  });

  it('passes through values that already sum to 100 unchanged', () => {
    expect(normalizeThreeWay(45, 25, 30)).toEqual([45, 25, 30]);
  });

  it('rescales proportionally when the total is under 100', () => {
    const [home, draw, away] = normalizeThreeWay(9, 5, 6);
    // 9+5+6 = 20 -> scale factor 5 -> 45/25/30
    expect([home, draw, away]).toEqual([45, 25, 30]);
    expect(home + draw + away).toBe(100);
  });

  it('puts the rounding remainder on the largest bucket', () => {
    // 33.33/33.33/33.33 rounds to 33/33/33 = 99, remainder of 1 must land
    // on the largest (first) bucket here.
    const [home, draw, away] = normalizeThreeWay(1, 1, 1);
    expect(home + draw + away).toBe(100);
    expect(home).toBeGreaterThanOrEqual(draw);
  });

  it('falls back to the documented default when the total is zero', () => {
    expect(normalizeThreeWay(0, 0, 0)).toEqual([34, 33, 33]);
  });

  it('falls back to the documented default when the total is negative', () => {
    expect(normalizeThreeWay(-5, -5, -5)).toEqual([34, 33, 33]);
  });
});

describe('normalizeTwoWay', () => {
  it('sums to exactly 100 for typical model output', () => {
    const [a, b] = normalizeTwoWay(55, 44);
    expect(a + b).toBe(100);
  });

  it('passes through values that already sum to 100 unchanged', () => {
    expect(normalizeTwoWay(60, 40)).toEqual([60, 40]);
  });

  it('rescales proportionally when the total is under 100', () => {
    const [a, b] = normalizeTwoWay(3, 2);
    // 3+2 = 5 -> scale factor 20 -> 60/40
    expect([a, b]).toEqual([60, 40]);
  });

  it('puts the rounding remainder on the largest bucket', () => {
    const [a, b] = normalizeTwoWay(1, 1);
    expect(a + b).toBe(100);
  });

  it('falls back to the documented default when the total is zero', () => {
    expect(normalizeTwoWay(0, 0)).toEqual([50, 50]);
  });
});
