import { describe, it, expect } from 'vitest';
import { sizeModifierFromHeightRatio } from '../src/location/reachEnvelope.js';

describe('size modifier from height ratio', () => {
  it('is 0 for equal heights', () => {
    expect(sizeModifierFromHeightRatio(1.75, 1.75)).toBe(0);
  });

  it('clamps to −4…+4', () => {
    expect(sizeModifierFromHeightRatio(1.0, 2.0)).toBeLessThanOrEqual(4);
    expect(sizeModifierFromHeightRatio(2.0, 1.0)).toBeGreaterThanOrEqual(-4);
    expect(sizeModifierFromHeightRatio(1.0, 10.0)).toBe(4);
    expect(sizeModifierFromHeightRatio(10.0, 1.0)).toBe(-4);
  });

  it('taller defender yields positive modifier', () => {
    expect(sizeModifierFromHeightRatio(1.7, 1.9)).toBeGreaterThan(0);
  });

  it('shorter defender yields negative modifier', () => {
    expect(sizeModifierFromHeightRatio(1.9, 1.7)).toBeLessThan(0);
  });
});
