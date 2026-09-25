import { describe, expect, it } from 'vitest';
import { cloneFighter } from '../src/actors/fighter.js';
import { createAldren, createHarvek } from '../src/actors/stock.js';
import { buildFightLog, FIGHT_LOG_SCHEMA } from '../src/combat/fightLog.js';
import { runDuel } from '../src/combat/tickLoop.js';

describe('fight log', () => {
  it('builds narrator-ready document with cast, beats, timeline, outcome', () => {
    const a = createAldren();
    const b = createHarvek();
    const castAtStart = [cloneFighter(a), cloneFighter(b)];
    const result = runDuel(a, b, { seed: 42, maxTicks: 200 });
    const log = buildFightLog({ result, seed: 42, castAtStart });

    expect(log.schema).toBe(FIGHT_LOG_SCHEMA);
    expect(log.cast).toHaveLength(2);
    expect(log.cast[0].name).toBe('Aldren');
    expect(log.cast[0].weapon.name).toBe('Longsword');
    expect(log.narratorInstructions).toMatch(/sole source of truth/i);
    expect(log.timeline.length).toBeGreaterThan(0);
    expect(log.beatSheet.length).toBeGreaterThan(0);
    expect(log.outcome.reason).toBeTruthy();
    expect(log.finalStates).toHaveLength(2);
    // Starting cast morale should not equal post-rout values when someone routed
    if (result.reason === 'rout') {
      const routed = result.fighters.find((f) => f.morale.morale < 20);
      expect(routed).toBeTruthy();
      const start = log.cast.find((c) => c.id === routed!.id)!;
      expect(start.startingMorale).toBeGreaterThan(routed!.morale.morale);
    }
  });
});
