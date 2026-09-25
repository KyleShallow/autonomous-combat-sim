#!/usr/bin/env node
/**
 * CLI: 1v1 alley duel — Aldren (longsword/leather) vs Harvek (spear/mail).
 * Usage: npm run duel -- [--seed N] [--max-seconds S] [--out path.json] [--no-save]
 *
 * Always builds a narrator-ready fight log; writes it to disk unless --no-save.
 */
import { mkdirSync } from 'node:fs';
import { cloneFighter } from '../actors/fighter.js';
import { createAldren, createHarvek } from '../actors/stock.js';
import {
  buildFightLog,
  defaultFightLogPath,
  writeFightLog,
} from '../combat/fightLog.js';
import { runDuel, TICK_S } from '../combat/tickLoop.js';
import { moraleBand } from '../morale/morale.js';

function parseArgs(argv: string[]): {
  seed: number;
  maxSeconds: number;
  out: string | null;
  save: boolean;
} {
  let seed = 42;
  let maxSeconds = 90;
  let out: string | null = null;
  let save = true;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--seed' && argv[i + 1]) {
      seed = Number(argv[++i]);
    } else if (a === '--max-seconds' && argv[i + 1]) {
      maxSeconds = Number(argv[++i]);
    } else if (a === '--out' && argv[i + 1]) {
      out = argv[++i];
    } else if (a?.startsWith('--seed=')) {
      seed = Number(a.split('=')[1]);
    } else if (a?.startsWith('--max-seconds=')) {
      maxSeconds = Number(a.split('=')[1]);
    } else if (a?.startsWith('--out=')) {
      out = a.slice('--out='.length);
    } else if (a === '--no-save') {
      save = false;
    }
  }
  if (!Number.isFinite(seed)) seed = 42;
  if (!Number.isFinite(maxSeconds) || maxSeconds <= 0) maxSeconds = 90;
  return { seed, maxSeconds, out, save };
}

function main(): void {
  const { seed, maxSeconds, out, save } = parseArgs(process.argv.slice(2));
  const aldren = createAldren();
  const harvek = createHarvek();
  const castAtStart = [cloneFighter(aldren), cloneFighter(harvek)];

  console.log('=== Autonomous Combat Sim — Alley Duel ===');
  console.log(`Seed: ${seed} | Tick: ${TICK_S}s (20 Hz) | Max: ${maxSeconds}s`);
  console.log(
    `${aldren.name}: STR ${aldren.attributes.STR} DEX ${aldren.attributes.DEX} | ${aldren.weapon.name} / leather`,
  );
  console.log(
    `${harvek.name}: STR ${harvek.attributes.STR} DEX ${harvek.attributes.DEX} | ${harvek.weapon.name} / mail`,
  );
  console.log('---');

  const result = runDuel(aldren, harvek, {
    seed,
    maxTicks: Math.floor(maxSeconds / TICK_S),
  });

  const fightLog = buildFightLog({
    result,
    seed,
    castAtStart,
  });

  const lines = result.log.summaryLines(60);
  for (const line of lines) console.log(line);

  console.log('---');
  const winner =
    result.winnerId === aldren.id
      ? aldren.name
      : result.winnerId === harvek.id
        ? harvek.name
        : '(none)';
  console.log(
    `Result: ${winner} wins by ${result.reason} at t=${result.timeS.toFixed(2)}s (${result.ticks} ticks)`,
  );

  for (const f of result.fighters) {
    const fn = f.body.functions;
    console.log(
      `  ${f.name}: dead=${f.body.dead} incap=${f.body.incapacitated} morale=${f.morale.morale.toFixed(0)}(${moraleBand(f.morale.morale)}) ` +
        `CON=${fn.CONSCIOUSNESS.toFixed(2)} BREATH=${fn.BREATHING.toFixed(2)} CIRC=${fn.CIRCULATION.toFixed(2)} ` +
        `GRASP=${fn.GRASP.toFixed(2)} STANCE=${fn.STANCE.toFixed(2)}`,
    );
  }

  if (save) {
    mkdirSync('logs', { recursive: true });
    const path = out ?? defaultFightLogPath(seed);
    writeFightLog(path, fightLog);
    console.log(`---`);
    console.log(`Fight log saved: ${path}`);
    console.log(
      `Schema ${fightLog.schema} | ${fightLog.beatSheet.length} beats | ${fightLog.timeline.length} timeline events`,
    );
    console.log('Feed this JSON to a narrator AI (sim is truth — see narratorInstructions).');
  }
}

main();
