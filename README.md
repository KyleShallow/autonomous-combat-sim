# Autonomous Combat Simulation

Melee-first TypeScript prototype of **Kyle's Autonomous Combat Simulation**.
The simulation is the source of truth; a future narrative layer consumes structured `CombatEvent` logs.

**Design locks:** [`docs/MVP_LOCKS.md`](docs/MVP_LOCKS.md)

## Requirements

- Node.js 20+
- npm

## Install

```bash
npm install
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm test` | Run vitest unit tests (dice, STR, penetration bands, function formula, size mod) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run duel` | Run Aldren vs Harvek alley duel CLI |

### Duel CLI

```bash
npm run duel
npm run duel -- --seed 99
npm run duel -- --seed=7 --max-seconds=120
npm run duel -- --out path/to/fight.json
npm run duel -- --no-save
```

Stock fighters:

- **Aldren** — longsword, leather, DEX-leaning
- **Harvek** — spear, mail, STR-leaning

Fight ends on death, incapacitation, or rout (morale &lt; 20).

### Fight log (for narrator AI)

Every duel builds a **narrative fight log** (`autonomous-combat-sim.fight-log.v1`) and saves it under `logs/` by default (timestamped), or to `--out <path>`.

The JSON includes:

- `narratorInstructions` — contract: simulation is truth; do not invent outcomes
- `cast` — starting fighters, weapons, armor, attributes
- `setting` — map context
- `beatSheet` — condensed chronological beats for prompting
- `timeline` — full `CombatEvent` stream
- `outcome` / `finalStates` — who won and why, end physiology

Example committed sample: [`docs/examples/duel-seed42.fight-log.json`](docs/examples/duel-seed42.fight-log.json)

Hand that file to any LLM with a prompt like: *Narrate this fight using only the log; do not invent hits or wounds.*

## Architecture

```
src/
  dice/         D6 skill resolution (accuracy; STR excluded)
  anatomy/      Humanoid body template, function%, physiology tick
  armor/        Layered barriers + penetration bands
  impact/       Energy, momentum, STR multiplier, displacement
  location/     Reach envelope, size mod, hit tables
  battlefield/  Nodes/slots/engagement (ranged STUBBED)
  ai/           Utility combat AI
  morale/       Morale / shock / pain
  combat/       Tick loop (20 Hz), attack pipeline, event log
  weapons/      Longsword, spear, mace, dagger (melee)
  actors/       Fighter + stock pair
  cli/duel.ts   1v1 demo
```

### Attack pipeline (locked flow)

1. Opposed D6 pools (DEX + skill; margin = execution/location only)
2. Reach envelope → hit location (size mod −4…+4 on 3d6)
3. STR-driven impact → armor penetration bands
4. Tissue integrity → functional tags → optional displacement
5. `CombatEvent` log with narrative tags

## Implemented vs stubbed

| Area | Status |
|------|--------|
| Discrete 0.05s ticks | Implemented |
| D6 opposed resolution | Implemented |
| MVP humanoid anatomy + function formula | Implemented (simplified tissue walk) |
| Armor layers + penetration bands | Implemented |
| Impact / STR multiplier / slot displacement | Implemented |
| Reach envelope + hit tables | Implemented |
| Node graph (alley map) | Minimal (1–2 nodes) |
| Utility AI | Implemented (one-step lookahead heuristic) |
| Morale / shock | Implemented |
| Melee weapons (cut/thrust/pommel/bash/stab) | Implemented |
| Ranged (thrown/missile) | **STUB** — throws if forced |
| Advancement / XP spend | Formula only |
| Narrative prose | Fight-log JSON for narrator AI; prose generation separate |
| Formations / multi-combatant tactics | Not in MVP |

Numbers marked **CALIB** in source/docs are placeholders pending playtest.

## License

MIT
