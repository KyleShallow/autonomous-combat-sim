import { describe, it, expect } from 'vitest';
import { strMultiplier } from '../src/impact/energy.js';

describe('STR multiplier', () => {
  it('is 2^((STR-10)/10)', () => {
    expect(strMultiplier(10)).toBeCloseTo(1, 8);
    expect(strMultiplier(20)).toBeCloseTo(2, 8);
    expect(strMultiplier(0)).toBeCloseTo(0.5, 8);
    expect(strMultiplier(15)).toBeCloseTo(Math.SQRT2, 8);
  });
});
