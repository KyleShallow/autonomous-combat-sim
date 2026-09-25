import { describe, it, expect } from 'vitest';
import { computeFunctionValue } from '../src/anatomy/function.js';

describe('function bottleneck formula', () => {
  it('is 0.7×critical + 0.3×supporting', () => {
    expect(computeFunctionValue(1, 1)).toBeCloseTo(1, 8);
    expect(computeFunctionValue(0, 1)).toBeCloseTo(0.3, 8);
    expect(computeFunctionValue(0.5, 1)).toBeCloseTo(0.7 * 0.5 + 0.3, 8);
    expect(computeFunctionValue(0.2, 0.8)).toBeCloseTo(0.7 * 0.2 + 0.3 * 0.8, 8);
  });
});
