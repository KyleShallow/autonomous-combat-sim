/**
 * Impact: energy for penetration/tissue; momentum for knockback.
 * STR multiplier ≈ 2^((STR−10)/10) for velocity/force.
 */

/** STR multiplier for velocity/force contribution. */
export function strMultiplier(str: number): number {
  return Math.pow(2, (str - 10) / 10);
}

export interface SwingInput {
  /** Fighter STR. */
  str: number;
  /** Weapon effective mass (kg). CALIB */
  massEff: number;
  /** Base swing speed (m/s) at STR 10. CALIB */
  baseVelocity: number;
  /** Technique efficiency 0.6–1.2. CALIB */
  techniqueEfficiency: number;
  /** Alignment 0–1 for edges/points. */
  alignment: number;
}

export interface SwingResult {
  velocity: number;
  energy: number;
  momentum: number;
  strMult: number;
}

/**
 * E ≈ ½ m v²; p = m_eff × v.
 * v scales with STR multiplier and technique.
 */
export function computeSwing(input: SwingInput): SwingResult {
  const strMult = strMultiplier(input.str);
  const velocity = input.baseVelocity * strMult * input.techniqueEfficiency;
  const energy = 0.5 * input.massEff * velocity * velocity;
  const momentum = input.massEff * velocity;
  return { velocity, energy, momentum, strMult };
}
