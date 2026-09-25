import type { Rng } from '../rng.js';
import { computePool, resolveOpposed, type MarginBand } from '../dice/skillResolution.js';
import { effectivePoolScale } from '../anatomy/function.js';
import type { BodyPart, TissueLayer } from '../anatomy/bodyTemplate.js';
import { resolvePenetration, type PenetrationBand } from '../armor/penetration.js';
import { computeSwing } from '../impact/energy.js';
import { resolveDisplacement, type DisplacementResult } from '../impact/displacement.js';
import { resolveHitLocation, type AimPreference } from '../location/hitTables.js';
import type { Fighter } from '../actors/fighter.js';
import type { AttackMode } from '../weapons/melee.js';
import { applyPainShock } from '../morale/morale.js';
import type { EventLog, NarrativeTag } from './events.js';

export interface AttackIntent {
  attacker: Fighter;
  defender: Fighter;
  mode: AttackMode;
  aim?: AimPreference;
  /** Technique efficiency override. CALIB default 0.9 */
  techniqueEfficiency?: number;
}

export interface AttackOutcome {
  hit: boolean;
  margin: number;
  marginBand: MarginBand;
  partId?: string;
  zone?: string;
  penBand?: PenetrationBand;
  displacement?: DisplacementResult;
  tissuesDamaged: { kind: string; before: number; after: number }[];
}

/**
 * Full melee attack flow:
 * D6 opposed → margin → hit location (envelope) → armor path → tissue → function → displacement → events
 */
export function executeAttack(
  rng: Rng,
  tick: number,
  timeS: number,
  intent: AttackIntent,
  log: EventLog,
): AttackOutcome {
  const { attacker, defender, mode } = intent;
  const technique = intent.techniqueEfficiency ?? 0.9; // CALIB

  // STR does NOT add attack accuracy.
  const atkAttr = attacker.attributes.DEX;
  const defAttr = defender.attributes.DEX;
  const graspScale = effectivePoolScale(attacker.body.functions.GRASP);
  const stanceScale = effectivePoolScale(defender.body.functions.STANCE);
  const skill = attacker.skills[mode.skill] ?? 0;
  const defSkill = Math.max(defender.skills.parry ?? 0, defender.skills.dodge ?? 0);

  const attackPool =
    computePool({
      attribute: atkAttr,
      skillRank: skill,
      mods: 0,
    }) * graspScale * attacker.fatigue;

  const defensePool =
    computePool({
      attribute: defAttr,
      skillRank: defSkill,
      mods: 0,
    }) * stanceScale * defender.fatigue;

  const opposed = resolveOpposed(rng, attackPool, defensePool);

  if (!opposed.hit) {
    log.push({
      tick,
      timeS,
      type: 'miss',
      actorId: attacker.id,
      targetId: defender.id,
      tags: ['attack_miss'],
      data: {
        mode: mode.id,
        margin: opposed.margin,
        attackSuccesses: opposed.attack.successes,
        defenseSuccesses: opposed.defense.successes,
        attackPool: opposed.attack.pool,
        defensePool: opposed.defense.pool,
      },
    });
    attacker.recoveryTicks = mode.recoveryTicks;
    return {
      hit: false,
      margin: opposed.margin,
      marginBand: opposed.band,
      tissuesDamaged: [],
    };
  }

  // Hit location via reach envelope + size mod.
  const loc = resolveHitLocation(
    rng,
    {
      attackerHeight: attacker.heightM,
      defenderHeight: defender.heightM,
      weaponLength: attacker.weapon.length,
      elevationDelta:
        0, // node elevation handled by caller if needed
    },
    { aim: intent.aim ?? 'auto', margin: opposed.margin },
  );

  // Impact from STR after contact.
  const swing = computeSwing({
    str: attacker.attributes.STR,
    massEff: attacker.weapon.massEff,
    baseVelocity: mode.baseVelocity,
    techniqueEfficiency: technique,
    alignment: mode.baseAlignment,
  });

  // Alignment improved slightly by margin (execution quality). CALIB
  const alignment = Math.min(1, mode.baseAlignment + opposed.margin * 0.05);

  const pen = resolvePenetration({
    energy: swing.energy,
    geometry: mode.geometry,
    alignment,
    mode: mode.damageMode,
    angle: 0.85 + rng() * 0.15,
    layers: defender.armor,
    gapRoll: rng(),
  });

  const part = defender.body.parts.get(loc.partId);
  const tissuesDamaged: AttackOutcome['tissuesDamaged'] = [];
  let major = false;

  if (part && (pen.transmittedEnergy > 0 || pen.bluntTrauma > 0)) {
    applyTissueDamage(part, mode.damageMode, pen.transmittedEnergy, pen.bluntTrauma, tissuesDamaged);
    major = tissuesDamaged.some(
      (t) => t.after < 0.4 && (t.kind === 'organ' || t.kind === 'vessel' || t.kind === 'nerve'),
    );
  }

  const disp = resolveDisplacement({
    momentum: swing.momentum,
    bracedMass: defender.massKg,
    footing: 0.85, // CALIB — pull from node in full wiring
    stance: defender.body.functions.STANCE,
    currentSlot: defender.placement.slot,
  });

  if (disp.shifted) {
    defender.placement.slot = disp.toSlot;
  }

  // Pain / shock from wound severity. CALIB
  const severity = pen.transmittedEnergy + pen.bluntTrauma * 0.5;
  const pain = Math.min(22, severity * 0.22);
  const shock = major ? 16 : Math.min(12, severity * 0.1);
  applyPainShock(defender.morale, pain, shock);

  const tags: NarrativeTag[] = [
    'attack_hit',
    pen.band === 'deflect' || pen.band === 'stopTrauma'
      ? ('armor_stop' as const)
      : pen.band === 'full' || pen.band === 'overwhelm' || pen.band === 'partial'
        ? ('armor_penetrate' as const)
        : ('armor_deflect' as const),
    'wound' as const,
  ];
  if (major) tags.push('major_wound');
  if (disp.stagger) tags.push('stagger');
  if (disp.shifted) tags.push('displace');

  log.push({
    tick,
    timeS,
    type: 'attack',
    actorId: attacker.id,
    targetId: defender.id,
    tags,
    data: {
      mode: mode.id,
      margin: opposed.margin,
      marginBand: opposed.band,
      partId: loc.partId,
      zone: loc.zone,
      sizeMod: loc.sizeModifier,
      energy: swing.energy,
      momentum: swing.momentum,
      penBand: pen.band,
      penRatio: Number(pen.ratio.toFixed(3)),
      transmitted: Number(pen.transmittedEnergy.toFixed(2)),
      bluntTrauma: Number(pen.bluntTrauma.toFixed(2)),
      tissuesHit: tissuesDamaged,
      displacement: disp.shifted ? { from: disp.fromSlot, to: disp.toSlot } : null,
      stagger: disp.stagger,
    },
  });

  if (tissuesDamaged.length) {
    log.push({
      tick,
      timeS,
      type: 'wound',
      actorId: attacker.id,
      targetId: defender.id,
      tags: major ? ['wound', 'major_wound'] : ['wound'],
      data: {
        partId: loc.partId,
        energy: pen.transmittedEnergy,
        tissuesHit: tissuesDamaged,
      },
    });
  }

  if (disp.shifted || disp.stagger) {
    log.push({
      tick,
      timeS,
      type: 'displace',
      actorId: defender.id,
      tags: disp.stagger ? ['displace', 'stagger'] : ['displace'],
      data: {
        fromSlot: disp.fromSlot,
        toSlot: disp.toSlot,
        impulse: disp.impulse,
        stagger: disp.stagger,
      },
    });
  }

  attacker.recoveryTicks = mode.recoveryTicks;
  attacker.fatigue = Math.max(0.4, attacker.fatigue - 0.01); // CALIB

  return {
    hit: true,
    margin: opposed.margin,
    marginBand: opposed.band,
    partId: loc.partId,
    zone: loc.zone,
    penBand: pen.band,
    displacement: disp,
    tissuesDamaged,
  };
}

function applyTissueDamage(
  part: BodyPart,
  mode: 'slash' | 'pierce' | 'blunt',
  energy: number,
  bluntTrauma: number,
  out: { kind: string; before: number; after: number }[],
): void {
  // Walk layers outward→in; spend energy. CALIB damage rates.
  // Scale factor keeps ordinary melee from instantly zeroing every tissue.
  const ENERGY_SCALE = 0.035; // CALIB
  let remaining = energy * ENERGY_SCALE;
  const blunt = bluntTrauma * ENERGY_SCALE;

  for (const tissue of part.tissues) {
    if (remaining <= 0.002 && blunt < 0.01) break;
    const resist = Math.max(0.05, tissue.resist[mode] * tissue.thickness);
    const absorbed = Math.min(remaining, resist * 1.2);
    const bluntHit = blunt * (tissue.kind === 'bone' || tissue.kind === 'organ' ? 0.35 : 0.12);
    const dmg = (absorbed + bluntHit) / (resist * 3.5);
    const before = tissue.integrity;
    tissue.integrity = Math.max(0, tissue.integrity - Math.min(0.55, dmg)); // cap per-layer chip. CALIB
    if (tissue.integrity < before - 0.001) {
      out.push({ kind: tissue.kind, before, after: tissue.integrity });
    }
    remaining -= absorbed;
    // Piercing spends less on outer soft layers.
    if (mode === 'pierce' && (tissue.kind === 'skin' || tissue.kind === 'fat')) {
      remaining += absorbed * 0.45;
    }
  }
}

// silence unused import warning path for TissueLayer in some TS configs
export type { TissueLayer };
