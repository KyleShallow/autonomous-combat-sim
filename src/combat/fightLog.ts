/**
 * Narrative fight log — durable JSON document for a narrator AI.
 * Simulation is the sole source of truth; prose must not invent outcomes.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Fighter } from '../actors/fighter.js';
import { moraleBand } from '../morale/morale.js';
import type { CombatEvent, NarrativeTag } from './events.js';
import type { DuelResult } from './tickLoop.js';
import { TICK_S } from './tickLoop.js';

export const FIGHT_LOG_SCHEMA = 'autonomous-combat-sim.fight-log.v1' as const;

/** Instructions embedded so a narrator model knows the contract. */
export const NARRATOR_INSTRUCTIONS = [
  'You are narrating a combat that already happened. The simulation is the sole source of truth.',
  'Do not invent hits, misses, wounds, locations, armor results, displacements, morale breaks, deaths, or winners that are not supported by this log.',
  'You may dramatize tone, sensory detail, pacing, and character voice, but every factual claim must map to an event, cast fact, or outcome field.',
  'Prefer chronological storytelling that follows the timeline / beatSheet.',
  'When an attack misses, say so; do not upgrade misses into glancing hits.',
  'When armor deflects or stops a blow, reflect that — trauma without penetration is still real if the log records a wound or blunt transfer.',
  'Incapacitation, rout (fleeing from broken morale), and death are distinct endings; use the outcome.reason field.',
  'Ids in events (actorId / targetId) match cast[].id; use cast[].name in prose.',
  'Ignore tick_meta / low-level physiology chatter unless it clarifies a major capability loss already listed in beats.',
].join(' ');

export interface FightLogCastMember {
  id: string;
  name: string;
  attributes: Fighter['attributes'];
  skills: Record<string, number>;
  heightM: number;
  massKg: number;
  weapon: { id: string; name: string; lengthM: number; modes: string[] };
  armor: { id: string; name: string; structure: number; coverage: number }[];
  startingPlacement: Fighter['placement'];
  startingMorale: number;
  temperament: number;
}

export interface FightLogOutcome {
  winnerId: string | null;
  winnerName: string | null;
  reason: string;
  ticks: number;
  durationSeconds: number;
}

export interface FightLogFinalState {
  id: string;
  name: string;
  dead: boolean;
  incapacitated: boolean;
  morale: number;
  moraleBand: string;
  functions: Record<string, number>;
  placement: Fighter['placement'];
}

export interface FightLogBeat {
  timeS: number;
  tick: number;
  type: string;
  summary: string;
  actorId?: string;
  targetId?: string;
  tags: NarrativeTag[];
}

export interface NarrativeFightLog {
  schema: typeof FIGHT_LOG_SCHEMA;
  generatedAt: string;
  seed: number;
  tickSeconds: number;
  setting: {
    mapId: string;
    description: string;
  };
  narratorInstructions: string;
  cast: FightLogCastMember[];
  outcome: FightLogOutcome;
  finalStates: FightLogFinalState[];
  /** Condensed beats suitable for prompting (important events only). */
  beatSheet: FightLogBeat[];
  /** Full chronological CombatEvent stream. */
  timeline: CombatEvent[];
  /** Human-readable lines for quick inspection. */
  summaryLines: string[];
}

const BEAT_TYPES = new Set([
  'commit',
  'attack',
  'miss',
  'wound',
  'displace',
  'morale',
  'flee',
  'rally',
  'death',
  'incapacitated',
  'end',
]);

function castMember(f: Fighter): FightLogCastMember {
  return {
    id: f.id,
    name: f.name,
    attributes: { ...f.attributes },
    skills: { ...f.skills },
    heightM: f.heightM,
    massKg: f.massKg,
    weapon: {
      id: f.weapon.id,
      name: f.weapon.name,
      lengthM: f.weapon.length,
      modes: f.weapon.modes.map((m) => m.id),
    },
    armor: f.armor.map((l) => ({
      id: l.id,
      name: l.name,
      structure: l.structure,
      coverage: l.coverage,
    })),
    startingPlacement: { ...f.placement },
    startingMorale: f.morale.morale,
    temperament: f.temperament,
  };
}

/** Note: cast snapshots should be taken at fight start; finalStates from result.fighters. */
export function buildFightLog(opts: {
  result: DuelResult;
  seed: number;
  castAtStart: Fighter[];
  mapId?: string;
  mapDescription?: string;
}): NarrativeFightLog {
  const { result, seed, castAtStart } = opts;
  const nameById = new Map(result.fighters.map((f) => [f.id, f.name]));

  const outcome: FightLogOutcome = {
    winnerId: result.winnerId,
    winnerName: result.winnerId ? (nameById.get(result.winnerId) ?? result.winnerId) : null,
    reason: result.reason,
    ticks: result.ticks,
    durationSeconds: result.timeS,
  };

  const finalStates: FightLogFinalState[] = result.fighters.map((f) => ({
    id: f.id,
    name: f.name,
    dead: f.body.dead,
    incapacitated: f.body.incapacitated,
    morale: f.morale.morale,
    moraleBand: moraleBand(f.morale.morale),
    functions: { ...f.body.functions },
    placement: { ...f.placement },
  }));

  const timeline = result.log.events.map((e) => ({
    ...e,
    tags: [...e.tags],
    data: { ...e.data },
  }));

  const beatSheet = timeline
    .filter((e) => BEAT_TYPES.has(e.type))
    .map((e) => ({
      timeS: e.timeS,
      tick: e.tick,
      type: e.type,
      summary: beatSummary(e, nameById),
      actorId: e.actorId,
      targetId: e.targetId,
      tags: [...e.tags],
    }));

  return {
    schema: FIGHT_LOG_SCHEMA,
    generatedAt: new Date().toISOString(),
    seed,
    tickSeconds: TICK_S,
    setting: {
      mapId: opts.mapId ?? 'alley',
      description:
        opts.mapDescription ??
        'Narrow alley: two connected approaches, fighters start in the north node (front vs mid).',
    },
    narratorInstructions: NARRATOR_INSTRUCTIONS,
    cast: castAtStart.map(castMember),
    outcome,
    finalStates,
    beatSheet,
    timeline,
    summaryLines: result.log.summaryLines(200),
  };
}

function beatSummary(e: CombatEvent, names: Map<string, string>): string {
  const actor = e.actorId ? names.get(e.actorId) ?? e.actorId : '';
  const target = e.targetId ? names.get(e.targetId) ?? e.targetId : '';
  const d = e.data;
  switch (e.type) {
    case 'commit':
      return `${actor} commits ${d.mode} against ${target} (aim ${d.aim})`;
    case 'miss':
      return `${actor} misses ${target} with ${d.mode} (margin ${d.margin})`;
    case 'attack':
      return `${actor} hits ${target} ${d.partId} with ${d.mode} (${d.marginBand}, ${d.penBand}, margin ${d.margin})`;
    case 'wound':
      return `${target} wounded at ${d.partId} (energy ${Number(d.energy).toFixed(1)})`;
    case 'displace':
      return `${target ?? actor} displaced ${d.fromSlot}→${d.toSlot}`;
    case 'morale':
      return `${actor} morale ${d.morale} (${d.band}), shock ${d.shock}`;
    case 'flee':
      return `${actor} flees (${d.band}, morale ${d.morale})`;
    case 'rally':
      return `${actor} attempts to rally (morale ${d.morale})`;
    case 'death':
      return `${actor} dies`;
    case 'incapacitated':
      return `${actor} is incapacitated`;
    case 'end':
      return `Fight ends: winner=${d.winner ?? 'none'}, reason=${d.reason}`;
    default:
      return e.type;
  }
}

export function writeFightLog(path: string, log: NarrativeFightLog): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(log, null, 2), 'utf8');
}

export function defaultFightLogPath(seed: number, when = new Date()): string {
  const stamp = when.toISOString().replace(/[:.]/g, '-');
  return `logs/duel-seed${seed}-${stamp}.json`;
}
