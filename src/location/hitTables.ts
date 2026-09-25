import type { Rng } from '../rng.js';
import { rollNd6 } from '../rng.js';
import type { VerticalZone } from '../anatomy/bodyTemplate.js';
import {
  computeReachEnvelope,
  snapToReachable,
  type ReachEnvelopeInput,
} from './reachEnvelope.js';

export type AimPreference = 'high' | 'middle' | 'low' | 'auto';

/** Map 3d6 (3–18) + size mod into vertical zone index. */
export function verticalFrom3d6(total: number): VerticalZone {
  // Classic open-ended-ish bands. CALIB
  if (total <= 4) return 'veryHigh';
  if (total <= 7) return 'high';
  if (total <= 11) return 'middle';
  if (total <= 14) return 'low';
  return 'veryLow';
}

const ZONE_PARTS: Record<VerticalZone, { id: string; w: number }[]> = {
  veryHigh: [
    { id: 'head', w: 5 },
    { id: 'eyes', w: 1 },
    { id: 'jaw', w: 2 },
    { id: 'neck', w: 2 },
  ],
  high: [
    { id: 'neck', w: 2 },
    { id: 'chest', w: 6 },
    { id: 'l_upper_arm', w: 2 },
    { id: 'r_upper_arm', w: 2 },
  ],
  middle: [
    { id: 'chest', w: 3 },
    { id: 'abdomen', w: 4 },
    { id: 'l_forearm', w: 2 },
    { id: 'r_forearm', w: 2 },
    { id: 'l_elbow', w: 1 },
    { id: 'r_elbow', w: 1 },
    { id: 'l_hand', w: 1 },
    { id: 'r_hand', w: 1 },
  ],
  low: [
    { id: 'abdomen', w: 2 },
    { id: 'pelvis', w: 3 },
    { id: 'l_thigh', w: 3 },
    { id: 'r_thigh', w: 3 },
    { id: 'l_knee', w: 1 },
    { id: 'r_knee', w: 1 },
  ],
  veryLow: [
    { id: 'l_lower_leg', w: 3 },
    { id: 'r_lower_leg', w: 3 },
    { id: 'l_ankle', w: 1 },
    { id: 'r_ankle', w: 1 },
    { id: 'l_foot', w: 1 },
    { id: 'r_foot', w: 1 },
  ],
};

export interface HitLocationResult {
  zone: VerticalZone;
  partId: string;
  raw3d6: number;
  sizeModifier: number;
  envelopeSnap: boolean;
}

function aimBias(aim: AimPreference): number {
  if (aim === 'high') return -3;
  if (aim === 'low') return 3;
  return 0;
}

/**
 * Success Margin only controls refinement within reachable anatomy.
 * Higher margin → slight pull toward aimed zone / center mass preference.
 */
export function resolveHitLocation(
  rng: Rng,
  envelopeInput: ReachEnvelopeInput,
  opts: { aim?: AimPreference; margin?: number } = {},
): HitLocationResult {
  const envelope = computeReachEnvelope(envelopeInput);
  const aim = opts.aim ?? 'auto';
  const margin = opts.margin ?? 1;

  const dice = rollNd6(rng, 3);
  const raw = dice.reduce((a, b) => a + b, 0);
  // Margin: +1 per 2 margin toward aimed direction (location control, not damage).
  const marginBias = aim === 'high' ? -Math.floor(margin / 2) : aim === 'low' ? Math.floor(margin / 2) : 0;
  const total = raw + envelope.sizeModifier + aimBias(aim) + marginBias;

  let zone = verticalFrom3d6(total);
  const before = zone;
  zone = snapToReachable(zone, envelope.reachable);

  const table = ZONE_PARTS[zone];
  const partId = pickPart(rng, table);

  return {
    zone,
    partId,
    raw3d6: raw,
    sizeModifier: envelope.sizeModifier,
    envelopeSnap: before !== zone,
  };
}

function pickPart(rng: Rng, table: { id: string; w: number }[]): string {
  const total = table.reduce((s, x) => s + x.w, 0);
  let r = rng() * total;
  for (const row of table) {
    r -= row.w;
    if (r <= 0) return row.id;
  }
  return table[table.length - 1]!.id;
}
