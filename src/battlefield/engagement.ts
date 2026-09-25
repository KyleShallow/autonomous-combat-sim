/**
 * Engagement bands. Thrown/Missile are STUBBED.
 */

export type EngagementBand =
  | 'grapple'
  | 'meleeShort'
  | 'meleeLong'
  | 'pole'
  | 'thrown' // STUB
  | 'missile'; // STUB

export const MELEE_BANDS: EngagementBand[] = [
  'grapple',
  'meleeShort',
  'meleeLong',
  'pole',
];

/** Approximate preferred band from weapon length (m). CALIB */
export function preferredBand(weaponLength: number): EngagementBand {
  if (weaponLength < 0.4) return 'grapple';
  if (weaponLength < 0.9) return 'meleeShort';
  if (weaponLength < 1.6) return 'meleeLong';
  return 'pole';
}

/**
 * Distance between fighters in same node by slot heuristic, else edge length.
 * CALIB placeholder distances.
 */
export function estimateDistanceM(
  sameNode: boolean,
  slotA: string,
  slotB: string,
  edgeLength?: number,
): number {
  if (!sameNode) return edgeLength ?? 4;
  if (slotA === slotB) return 0.8;
  const frontish = new Set(['front', 'mid']);
  if (frontish.has(slotA) && frontish.has(slotB)) return 1.2;
  return 2.0;
}

export function bandForDistance(distanceM: number): EngagementBand {
  if (distanceM < 0.6) return 'grapple';
  if (distanceM < 1.4) return 'meleeShort';
  if (distanceM < 2.5) return 'meleeLong';
  if (distanceM < 4.0) return 'pole';
  // Beyond pole — ranged would apply, but stubbed.
  return 'pole';
}

/** Thrown/Missile STUB — clear failure for callers that insist. */
export function assertMeleeBand(band: EngagementBand): void {
  if (band === 'thrown' || band === 'missile') {
    throw new Error(
      `Ranged engagement band '${band}' is STUBBED in melee-first MVP — not implemented.`,
    );
  }
}

export function isRangedStub(band: EngagementBand): boolean {
  return band === 'thrown' || band === 'missile';
}
