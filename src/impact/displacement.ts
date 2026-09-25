/**
 * Knockback / slot displacement from momentum.
 * Humans don't fly from ordinary hits — strong damping. CALIB
 */

export type SlotId =
  | 'front'
  | 'mid'
  | 'rear'
  | 'flankL'
  | 'flankR'
  | 'cover'
  | 'edgeHazard';

export const SLOT_ORDER_BACKWARD: SlotId[] = ['front', 'mid', 'rear'];

export interface DisplacementInput {
  momentum: number;
  /** Target braced mass (kg). CALIB ~70–90 for human. */
  bracedMass: number;
  /** Footing quality 0–1. */
  footing: number;
  /** Stance function 0–1. */
  stance: number;
  currentSlot: SlotId;
}

export interface DisplacementResult {
  impulse: number;
  /** Threshold exceeded → shift slot. */
  shifted: boolean;
  fromSlot: SlotId;
  toSlot: SlotId;
  stagger: boolean;
}

/** Impulse threshold to shift one slot rearward. CALIB */
export const SLOT_SHIFT_THRESHOLD = 40;
/** Impulse threshold for stagger flag. CALIB */
export const STAGGER_THRESHOLD = 55;

export function resolveDisplacement(input: DisplacementInput): DisplacementResult {
  const damp = 0.35 + 0.4 * input.footing + 0.25 * input.stance; // CALIB
  const impulse = input.momentum / Math.max(1, input.bracedMass * damp);

  let toSlot = input.currentSlot;
  let shifted = false;
  let stagger = impulse >= STAGGER_THRESHOLD;

  if (impulse >= SLOT_SHIFT_THRESHOLD) {
    const idx = SLOT_ORDER_BACKWARD.indexOf(input.currentSlot);
    if (idx >= 0 && idx < SLOT_ORDER_BACKWARD.length - 1) {
      toSlot = SLOT_ORDER_BACKWARD[idx + 1]!;
      shifted = true;
    } else if (input.currentSlot === 'flankL' || input.currentSlot === 'flankR') {
      toSlot = 'rear';
      shifted = true;
    }
  }

  return {
    impulse,
    shifted,
    fromSlot: input.currentSlot,
    toSlot,
    stagger,
  };
}
