import { createRng, type Rng } from '../rng.js';
import type { Fighter } from '../actors/fighter.js';
import { isOut, refreshPhysiology } from '../actors/fighter.js';
import { PHYSIOLOGY_INTERVAL_TICKS } from '../anatomy/physiology.js';
import { tickMorale, moraleBand } from '../morale/morale.js';
import { chooseAction, applyNonAttackAction } from '../ai/utilityAI.js';
import { createAlleyMap, type Battlefield } from '../battlefield/nodes.js';
import { EventLog } from './events.js';
import { executeAttack } from './attackPipeline.js';

/** Discrete tick length. LOCKED: 0.05s (20 Hz). */
export const TICK_S = 0.05;

export interface DuelConfig {
  seed?: number;
  maxTicks?: number;
  map?: Battlefield;
}

export interface DuelResult {
  winnerId: string | null;
  reason: string;
  ticks: number;
  timeS: number;
  log: EventLog;
  fighters: Fighter[];
}

export function runDuel(
  fighterA: Fighter,
  fighterB: Fighter,
  config: DuelConfig = {},
): DuelResult {
  const seed = config.seed ?? 42;
  const maxTicks = config.maxTicks ?? 20 * 60; // 60s
  const rng = createRng(seed);
  const map = config.map ?? createAlleyMap();
  void map; // available for movement expansion
  const log = new EventLog();

  const fighters = [fighterA, fighterB];

  for (let tick = 0; tick < maxTicks; tick++) {
    const timeS = tick * TICK_S;

    // Recovery countdown.
    for (const f of fighters) {
      if (f.recoveryTicks > 0) f.recoveryTicks -= 1;
      tickMorale(f.morale);
    }

    // Physiology cache.
    if (tick % PHYSIOLOGY_INTERVAL_TICKS === 0) {
      for (const f of fighters) {
        const prev = { ...f.body.functions };
        refreshPhysiology(f);
        for (const key of Object.keys(f.body.functions) as (keyof typeof f.body.functions)[]) {
          if (f.body.functions[key] < prev[key] - 0.05) {
            log.push({
              tick,
              timeS,
              type: 'physiology',
              actorId: f.id,
              tags: ['function_drop'],
              data: { tag: key, from: prev[key], to: f.body.functions[key] },
            });
          }
        }
        if (f.body.dead) {
          log.push({
            tick,
            timeS,
            type: 'death',
            actorId: f.id,
            tags: ['death'],
            data: { functions: { ...f.body.functions } },
          });
        } else if (f.body.incapacitated) {
          log.push({
            tick,
            timeS,
            type: 'incapacitated',
            actorId: f.id,
            tags: ['incapacitated'],
            data: { functions: { ...f.body.functions } },
          });
        }
      }
    }

    // End checks.
    const end = checkEnd(fighterA, fighterB, tick, timeS, log);
    if (end) return end;

    // Each ready fighter acts once per tick opportunity (serialized by id for determinism).
    const order = [...fighters].sort((a, b) => a.id.localeCompare(b.id));
    for (const actor of order) {
      if (isOut(actor) || actor.recoveryTicks > 0) continue;
      const foe = actor.id === fighterA.id ? fighterB : fighterA;
      if (isOut(foe)) continue;

      act(rng, tick, timeS, actor, foe, log);

      const midEnd = checkEnd(fighterA, fighterB, tick, timeS, log);
      if (midEnd) return midEnd;
    }
  }

  log.push({
    tick: maxTicks,
    timeS: maxTicks * TICK_S,
    type: 'end',
    tags: ['duel_end'],
    data: { winner: null, reason: 'timeout' },
  });
  return {
    winnerId: null,
    reason: 'timeout',
    ticks: maxTicks,
    timeS: maxTicks * TICK_S,
    log,
    fighters,
  };
}

function act(
  rng: Rng,
  tick: number,
  timeS: number,
  actor: Fighter,
  foe: Fighter,
  log: EventLog,
): void {
  const action = chooseAction(rng, actor, foe);

  if (action.type === 'attack') {
    log.push({
      tick,
      timeS,
      type: 'commit',
      actorId: actor.id,
      targetId: foe.id,
      tags: ['attack_commit'],
      data: { mode: action.mode.id, aim: action.aim },
    });
    executeAttack(rng, tick, timeS, {
      attacker: actor,
      defender: foe,
      mode: action.mode,
      aim: action.aim,
    }, log);
    return;
  }

  if (action.type === 'flee') {
    log.push({
      tick,
      timeS,
      type: 'flee',
      actorId: actor.id,
      tags: ['flee'],
      data: { morale: actor.morale.morale, band: moraleBand(actor.morale.morale) },
    });
  }
  if (action.type === 'rally') {
    log.push({
      tick,
      timeS,
      type: 'rally',
      actorId: actor.id,
      tags: ['rally'],
      data: { morale: actor.morale.morale },
    });
  }

  applyNonAttackAction(actor, action);
}

function checkEnd(
  a: Fighter,
  b: Fighter,
  tick: number,
  timeS: number,
  log: EventLog,
): DuelResult | null {
  const aOut = isOut(a);
  const bOut = isOut(b);
  if (!aOut && !bOut) return null;

  let winnerId: string | null = null;
  let reason = 'unknown';

  if (aOut && bOut) {
    winnerId = null;
    reason = 'mutual_out';
  } else if (aOut) {
    winnerId = b.id;
    reason = a.body.dead ? 'death' : a.body.incapacitated ? 'incapacitated' : 'rout';
  } else {
    winnerId = a.id;
    reason = b.body.dead ? 'death' : b.body.incapacitated ? 'incapacitated' : 'rout';
  }

  log.push({
    tick,
    timeS,
    type: 'end',
    tags: ['duel_end'],
    data: {
      winner: winnerId,
      reason,
      a: statusSnapshot(a),
      b: statusSnapshot(b),
    },
  });

  return {
    winnerId,
    reason,
    ticks: tick,
    timeS,
    log,
    fighters: [a, b],
  };
}

function statusSnapshot(f: Fighter) {
  return {
    id: f.id,
    dead: f.body.dead,
    incapacitated: f.body.incapacitated,
    morale: f.morale.morale,
    moraleBand: moraleBand(f.morale.morale),
    functions: { ...f.body.functions },
  };
}
