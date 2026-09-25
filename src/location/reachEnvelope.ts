import type { VerticalZone } from '../anatomy/bodyTemplate.js';

export const VERTICAL_ZONES: VerticalZone[] = [
  'veryHigh',
  'high',
  'middle',
  'low',
  'veryLow',
];

export interface ReachEnvelopeInput {
  /** Attacker height (m). */
  attackerHeight: number;
  /** Defender height (m). */
  defenderHeight: number;
  /** Weapon reach beyond arm (m). CALIB */
  weaponLength: number;
  /** Posture: standing=1, crouch=0.7, prone=0.3. CALIB */
  attackerPosture?: number;
  defenderPosture?: number;
  /** Relative elevation of attacker vs defender (m). */
  elevationDelta?: number;
}

export interface ReachEnvelope {
  /** Zones the attacker's weapon can reach on the defender. */
  reachable: Set<VerticalZone>;
  /** Height-ratio size modifier −4…+4 for 3d6 vertical bias. */
  sizeModifier: number;
  minReachM: number;
  maxReachM: number;
}

/**
 * Relative size from height ratio → modifier −4…+4.
 * Taller defender → positive (hits trend lower on their body zones relative to attacker aim).
 * Convention: modifier biases the vertical roll; positive shifts toward lower zones.
 */
export function sizeModifierFromHeightRatio(
  attackerHeight: number,
  defenderHeight: number,
): number {
  if (attackerHeight <= 0 || defenderHeight <= 0) return 0;
  const ratio = defenderHeight / attackerHeight;
  // Map ratio ~0.7..1.4 → −4..+4. CALIB
  const raw = (ratio - 1) * 10;
  return Math.max(-4, Math.min(4, Math.round(raw)));
}

/**
 * Approximate which vertical zones are in reach given heights, weapon, posture, elevation.
 */
export function computeReachEnvelope(input: ReachEnvelopeInput): ReachEnvelope {
  const aPosture = input.attackerPosture ?? 1;
  const dPosture = input.defenderPosture ?? 1;
  const elev = input.elevationDelta ?? 0;

  // Effective strike height band on defender (meters from defender feet). CALIB
  const attackerShoulder = input.attackerHeight * 0.82 * aPosture + elev;
  const armReach = input.attackerHeight * 0.45; // CALIB
  const maxReach = attackerShoulder + armReach * 0.3 + input.weaponLength;
  const minReach = Math.max(0, attackerShoulder - armReach - input.weaponLength * 0.2);

  const dH = input.defenderHeight * dPosture;
  // Zone height bands as fraction of defender height.
  const bands: { zone: VerticalZone; lo: number; hi: number }[] = [
    { zone: 'veryLow', lo: 0, hi: 0.2 * dH },
    { zone: 'low', lo: 0.15 * dH, hi: 0.4 * dH },
    { zone: 'middle', lo: 0.35 * dH, hi: 0.65 * dH },
    { zone: 'high', lo: 0.55 * dH, hi: 0.85 * dH },
    { zone: 'veryHigh', lo: 0.8 * dH, hi: 1.05 * dH },
  ];

  const reachable = new Set<VerticalZone>();
  for (const b of bands) {
    // Overlap between [minReach,maxReach] and [lo,hi]
    if (maxReach >= b.lo && minReach <= b.hi) reachable.add(b.zone);
  }
  if (reachable.size === 0) {
    // Always can reach something nearest to mid-reach.
    const mid = (minReach + maxReach) / 2;
    let best = bands[0]!;
    let bestDist = Infinity;
    for (const b of bands) {
      const c = (b.lo + b.hi) / 2;
      const d = Math.abs(c - mid);
      if (d < bestDist) {
        bestDist = d;
        best = b;
      }
    }
    reachable.add(best.zone);
  }

  return {
    reachable,
    sizeModifier: sizeModifierFromHeightRatio(input.attackerHeight, input.defenderHeight),
    minReachM: minReach,
    maxReachM: maxReach,
  };
}

/** Snap an inaccessible zone to nearest reachable. */
export function snapToReachable(
  desired: VerticalZone,
  reachable: Set<VerticalZone>,
): VerticalZone {
  if (reachable.has(desired)) return desired;
  const order = VERTICAL_ZONES;
  const idx = order.indexOf(desired);
  for (let dist = 1; dist < order.length; dist++) {
    const up = order[idx - dist];
    const down = order[idx + dist];
    if (up && reachable.has(up)) return up;
    if (down && reachable.has(down)) return down;
  }
  return [...reachable][0] ?? 'middle';
}
