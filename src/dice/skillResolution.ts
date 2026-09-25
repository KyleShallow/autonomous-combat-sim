import type { Rng } from '../rng.js';
import { rollNd6 } from '../rng.js';
import { attributeDice } from './attributeDice.js';

/** Success on 5–6 (~1/3). */
export const SUCCESS_THRESHOLD = 5;

export interface SkillPoolInput {
  attribute: number;
  skillRank: number;
  /** Spec / familiarity / situational mods (can be negative). */
  mods?: number;
  /** If false and skillRank is 0, still get attribute dice only when physically possible. */
  physicallyPossible?: boolean;
}

export interface DiceRollResult {
  pool: number;
  dice: number[];
  successes: number;
}

export function computePool(input: SkillPoolInput): number {
  const attrDice = attributeDice(input.attribute);
  const mods = input.mods ?? 0;
  let pool = attrDice + input.skillRank + mods;
  const possible = input.physicallyPossible !== false;
  if (possible) pool = Math.max(1, pool);
  else pool = Math.max(0, pool);
  return pool;
}

export function rollPool(rng: Rng, pool: number): DiceRollResult {
  const n = Math.max(0, Math.floor(pool));
  const dice = rollNd6(rng, n);
  const successes = dice.filter((d) => d >= SUCCESS_THRESHOLD).length;
  return { pool: n, dice, successes };
}

/**
 * Opposed Success Margin = attacker successes − defender successes.
 * Margin bands are for execution quality / location control — NOT damage.
 */
export type MarginBand = 'miss' | 'graze' | 'solid' | 'clean' | 'dominating';

export function marginBand(margin: number): MarginBand {
  if (margin <= 0) return 'miss';
  if (margin === 1) return 'graze';
  if (margin === 2) return 'solid';
  if (margin <= 4) return 'clean';
  return 'dominating';
}

export interface OpposedResult {
  attack: DiceRollResult;
  defense: DiceRollResult;
  margin: number;
  band: MarginBand;
  hit: boolean;
}

export function resolveOpposed(
  rng: Rng,
  attackPool: number,
  defensePool: number,
): OpposedResult {
  const attack = rollPool(rng, attackPool);
  const defense = rollPool(rng, defensePool);
  const margin = attack.successes - defense.successes;
  const band = marginBand(margin);
  return { attack, defense, margin, band, hit: margin > 0 };
}

/** Expected successes for a pool (p ≈ 1/3). Useful for tests/AI estimates. */
export function expectedSuccesses(pool: number): number {
  return pool * (2 / 6);
}
