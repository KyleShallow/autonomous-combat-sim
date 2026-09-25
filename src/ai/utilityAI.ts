import type { Rng } from '../rng.js';
import type { Fighter } from '../actors/fighter.js';
import { isOut } from '../actors/fighter.js';
import type { AttackMode } from '../weapons/melee.js';
import {
  bandForDistance,
  estimateDistanceM,
  isRangedStub,
  preferredBand,
} from '../battlefield/engagement.js';
import { wantsFlee, tryRally, moraleBand } from '../morale/morale.js';
import type { AimPreference } from '../location/hitTables.js';

export type AiAction =
  | { type: 'attack'; mode: AttackMode; aim: AimPreference }
  | { type: 'defend' }
  | { type: 'move'; slot: 'front' | 'mid' | 'rear' | 'flankL' | 'flankR' }
  | { type: 'flee' }
  | { type: 'rally' }
  | { type: 'wait' };

interface Scored {
  action: AiAction;
  utility: number;
}

/**
 * Sense → score → pick max utility + temperament noise.
 * Reach- and armor-aware; one-step lookahead; no formations.
 */
export function chooseAction(
  rng: Rng,
  self: Fighter,
  foe: Fighter,
): AiAction {
  if (isOut(self)) return { type: 'wait' };
  if (self.recoveryTicks > 0) return { type: 'wait' };

  if (wantsFlee(self.morale)) {
    return { type: 'flee' };
  }

  const options: Scored[] = [];

  const sameNode = self.placement.nodeId === foe.placement.nodeId;
  const dist = estimateDistanceM(
    sameNode,
    self.placement.slot,
    foe.placement.slot,
  );
  const band = bandForDistance(dist);
  const pref = preferredBand(self.weapon.length);

  // Ranged stub: never select thrown/missile.
  if (isRangedStub(band)) {
    options.push({ action: { type: 'move', slot: 'front' }, utility: 5 });
  }

  for (const mode of self.weapon.modes) {
    let u = 10;
    // Prefer modes matching engagement.
    if (pref === band) u += 4;
    if (band === 'grapple' && self.weapon.length > 1.2) u -= 6;
    if (band === 'pole' && self.weapon.length < 0.8) u -= 4;

    // Armor awareness: pierce vs mail/plate, blunt vs plate, slash vs leather/cloth.
    const armorHint = estimateArmorBias(foe, mode);
    u += armorHint;

    // Target weak functions — one-step lookahead heuristic.
    if (foe.body.functions.BREATHING < 0.7 && mode.damageMode === 'pierce') u += 3;
    if (foe.body.functions.GRASP < 0.7) u += 1;
    if (foe.body.functions.STANCE < 0.6 && mode.damageMode === 'blunt') u += 2;

    // Aim: finish wounded zones.
    let aim: AimPreference = 'auto';
    if (foe.body.functions.CONSCIOUSNESS < 0.7) {
      aim = 'high';
      u += 2;
    } else if (foe.body.functions.LOCOMOTION < 0.6) {
      aim = 'low';
      u += 1;
    }

    // Own grasp/fatigue.
    u *= 0.7 + 0.3 * self.body.functions.GRASP;
    u *= self.fatigue;

    options.push({ action: { type: 'attack', mode, aim }, utility: u });
  }

  // Defend when recovering badly or foe has advantage.
  options.push({
    action: { type: 'defend' },
    utility: self.body.functions.STANCE < 0.5 || self.morale.shock > 30 ? 8 : 2,
  });

  // Reposition toward preferred band.
  if (pref === 'meleeShort' || pref === 'grapple') {
    options.push({ action: { type: 'move', slot: 'front' }, utility: dist > 1.5 ? 6 : 1 });
  } else if (pref === 'pole') {
    options.push({ action: { type: 'move', slot: 'mid' }, utility: dist < 1.2 ? 7 : 2 });
  }

  // Rally when shaken.
  if (moraleBand(self.morale.morale) === 'shaken' && self.morale.rallyCooldownTicks === 0) {
    options.push({ action: { type: 'rally' }, utility: 9 });
  }

  // Temperament noise.
  for (const o of options) {
    o.utility += (rng() - 0.5) * self.temperament * 6;
  }

  options.sort((a, b) => b.utility - a.utility);
  return options[0]?.action ?? { type: 'wait' };
}

function estimateArmorBias(foe: Fighter, mode: AttackMode): number {
  if (foe.armor.length === 0) return mode.damageMode === 'slash' ? 2 : 1;
  const top = foe.armor[foe.armor.length - 1]!;
  const r = top.resist;
  if (mode.damageMode === 'pierce' && r.pierce < r.slash) return 3;
  if (mode.damageMode === 'blunt' && r.blunt < r.pierce) return 3;
  if (mode.damageMode === 'slash' && r.slash < r.pierce) return 2;
  if (mode.damageMode === 'slash' && r.slash > 2) return -3;
  return 0;
}

export function applyNonAttackAction(self: Fighter, action: AiAction): void {
  if (action.type === 'move') {
    self.placement.slot = action.slot;
    self.recoveryTicks = 6; // CALIB
  } else if (action.type === 'defend') {
    self.recoveryTicks = 4;
  } else if (action.type === 'rally') {
    tryRally(self.morale);
    self.recoveryTicks = 8;
  } else if (action.type === 'flee') {
    self.placement.slot = 'rear';
    self.morale.morale = Math.max(0, self.morale.morale - 2);
    self.recoveryTicks = 10;
  }
}
