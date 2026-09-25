import { createFighter, type Fighter } from './fighter.js';
import { LONGSWORD, SPEAR, MACE, DAGGER } from '../weapons/melee.js';

/** Stock humans for the alley duel demo. */
export function createAldren(): Fighter {
  return createFighter({
    id: 'aldren',
    name: 'Aldren',
    attributes: { STR: 12, DEX: 13, AGI: 12, END: 11, WIL: 12, PER: 11 },
    skills: { sword: 3, spear: 1, dodge: 2, parry: 3 },
    heightM: 1.78,
    massKg: 80,
    armor: 'leather',
    weapon: LONGSWORD,
    morale: 78,
    temperament: 0.2,
    placement: { nodeId: 'alley_north', slot: 'front', facing: 'S' },
  });
}

export function createHarvek(): Fighter {
  return createFighter({
    id: 'harvek',
    name: 'Harvek',
    attributes: { STR: 14, DEX: 11, AGI: 11, END: 13, WIL: 10, PER: 10 },
    skills: { spear: 3, sword: 1, dodge: 2, parry: 2 },
    heightM: 1.85,
    massKg: 88,
    armor: 'mail',
    weapon: SPEAR,
    morale: 72,
    temperament: 0.3,
    placement: { nodeId: 'alley_north', slot: 'mid', facing: 'N' },
  });
}

export function createStockPair(): { a: Fighter; b: Fighter } {
  return { a: createAldren(), b: createHarvek() };
}

// Re-export weapons for convenience in demos
export { LONGSWORD, SPEAR, MACE, DAGGER };
