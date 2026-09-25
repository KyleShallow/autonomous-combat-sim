import type { BodyState, FunctionalTag, TissueLayer } from './bodyTemplate.js';
import { blankFunctions } from './bodyTemplate.js';

/**
 * function ≈ 0.7 × criticalBottleneck + 0.3 × supportingAverage
 * Bottleneck = min integrity of tissues marked criticalFor that tag.
 * Supporting = average integrity of tissues that contribute (critical or structural).
 */
export function computeFunctionValue(
  criticalBottleneck: number,
  supportingAverage: number,
): number {
  return 0.7 * criticalBottleneck + 0.3 * supportingAverage;
}

function tissueContributes(t: TissueLayer, tag: FunctionalTag): boolean {
  return !!t.criticalFor?.includes(tag) || t.kind === 'muscle' || t.kind === 'tendon' || t.kind === 'nerve';
}

/** Which parts matter most for each tag (MVP heuristic). */
const TAG_PARTS: Record<FunctionalTag, string[]> = {
  CONSCIOUSNESS: ['head'],
  SIGHT: ['eyes', 'head'],
  BREATHING: ['chest', 'neck'],
  CIRCULATION: ['chest', 'neck', 'abdomen'],
  GRASP: [
    'l_hand',
    'r_hand',
    'l_wrist',
    'r_wrist',
    'l_forearm',
    'r_forearm',
    'l_elbow',
    'r_elbow',
    'l_upper_arm',
    'r_upper_arm',
  ],
  LOCOMOTION: [
    'l_foot',
    'r_foot',
    'l_ankle',
    'r_ankle',
    'l_lower_leg',
    'r_lower_leg',
    'l_knee',
    'r_knee',
    'l_thigh',
    'r_thigh',
    'pelvis',
  ],
  STANCE: ['l_foot', 'r_foot', 'l_ankle', 'r_ankle', 'l_knee', 'r_knee', 'pelvis', 'l_thigh', 'r_thigh'],
};

export function recomputeFunctions(body: BodyState): Record<FunctionalTag, number> {
  const out = blankFunctions();
  for (const tag of Object.keys(out) as FunctionalTag[]) {
    const partIds = TAG_PARTS[tag];
    const criticalVals: number[] = [];
    const supportVals: number[] = [];

    for (const id of partIds) {
      const part = body.parts.get(id);
      if (!part) continue;
      for (const t of part.tissues) {
        if (t.criticalFor?.includes(tag)) criticalVals.push(t.integrity);
        if (tissueContributes(t, tag)) supportVals.push(t.integrity);
      }
    }

    const bottleneck =
      criticalVals.length > 0 ? Math.min(...criticalVals) : supportVals.length > 0 ? Math.min(...supportVals) : 1;
    const supporting =
      supportVals.length > 0 ? supportVals.reduce((a, b) => a + b, 0) / supportVals.length : bottleneck;

    out[tag] = clamp01(computeFunctionValue(bottleneck, supporting));
  }
  return out;
}

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Effective skill pool scale from relevant function (e.g. GRASP for weapon). */
export function effectivePoolScale(functionPct: number): number {
  // Soft floor so badly hurt fighters still attempt actions. CALIB
  return 0.25 + 0.75 * clamp01(functionPct);
}
