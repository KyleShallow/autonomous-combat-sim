import { describe, it, expect } from 'vitest';
import { attributeDice, xpToNextRank } from '../src/dice/attributeDice.js';
import {
  expectedSuccesses,
  rollPool,
  SUCCESS_THRESHOLD,
} from '../src/dice/skillResolution.js';
import { createRng } from '../src/rng.js';

describe('attributeDice', () => {
  it('follows 1 + floor(Attr/5), min 1', () => {
    expect(attributeDice(0)).toBe(1);
    expect(attributeDice(4)).toBe(1);
    expect(attributeDice(5)).toBe(2);
    expect(attributeDice(9)).toBe(2);
    expect(attributeDice(10)).toBe(3);
    expect(attributeDice(14)).toBe(3);
    expect(attributeDice(15)).toBe(4);
  });
});

describe('D6 expected successes', () => {
  it('theoretical expectation is pool * (2/6)', () => {
    expect(expectedSuccesses(6)).toBeCloseTo(2, 5);
    expect(expectedSuccesses(3)).toBeCloseTo(1, 5);
  });

  it('empirical mean converges near 1/3 success rate', () => {
    const rng = createRng(12345);
    const pool = 12;
    const trials = 4000;
    let total = 0;
    for (let i = 0; i < trials; i++) {
      total += rollPool(rng, pool).successes;
    }
    const mean = total / trials;
    const expected = expectedSuccesses(pool);
    expect(mean).toBeGreaterThan(expected - 0.25);
    expect(mean).toBeLessThan(expected + 0.25);
  });

  it('success threshold is 5–6', () => {
    expect(SUCCESS_THRESHOLD).toBe(5);
  });
});

describe('xp stub', () => {
  it('uses 400 + 100×newRank', () => {
    expect(xpToNextRank(1)).toBe(500);
    expect(xpToNextRank(3)).toBe(700);
  });
});
