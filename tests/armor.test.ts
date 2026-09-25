import { describe, it, expect } from 'vitest';
import { penetrationBand } from '../src/armor/penetration.js';

describe('penetration ratio bands', () => {
  it('maps placeholder thresholds', () => {
    expect(penetrationBand(0.39)).toBe('deflect');
    expect(penetrationBand(0.4)).toBe('stopTrauma');
    expect(penetrationBand(0.74)).toBe('stopTrauma');
    expect(penetrationBand(0.75)).toBe('nearPenet');
    expect(penetrationBand(0.99)).toBe('nearPenet');
    expect(penetrationBand(1.0)).toBe('partial');
    expect(penetrationBand(1.49)).toBe('partial');
    expect(penetrationBand(1.5)).toBe('full');
    expect(penetrationBand(2.49)).toBe('full');
    expect(penetrationBand(2.5)).toBe('overwhelm');
    expect(penetrationBand(10)).toBe('overwhelm');
  });
});
