import type { BodyState } from './bodyTemplate.js';
import { recomputeFunctions } from './function.js';

/** Physiology refresh interval in ticks (0.05s each). ~0.5–1s → 10–20. CALIB */
export const PHYSIOLOGY_INTERVAL_TICKS = 10;

/**
 * Recompute functional cache; apply death / incapacitation rules.
 * Death = vital system failure (CONSCIOUSNESS, CIRCULATION, or BREATHING ~0).
 * Incapacitation = separate (can't act usefully).
 */
export function physiologyTick(body: BodyState): void {
  body.functions = recomputeFunctions(body);

  const { CONSCIOUSNESS, CIRCULATION, BREATHING, STANCE, LOCOMOTION } = body.functions;

  // Vital failure thresholds. CALIB
  if (CONSCIOUSNESS <= 0.05 || CIRCULATION <= 0.08 || BREATHING <= 0.08) {
    body.dead = true;
    body.incapacitated = true;
    return;
  }

  // Can't stand or move meaningfully, or consciousness too low to act.
  if (CONSCIOUSNESS < 0.25 || (STANCE < 0.2 && LOCOMOTION < 0.2)) {
    body.incapacitated = true;
  }
}
