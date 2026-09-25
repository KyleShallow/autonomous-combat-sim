# Fight log (narrator input)

Schema: `autonomous-combat-sim.fight-log.v1`

Built by `buildFightLog()` after a duel. The duel CLI writes it automatically.

## Contract

The simulation is the sole source of truth. A narrator AI must not invent hits, misses, wounds, locations, armor outcomes, morale breaks, or winners. Dramatize tone and sensory detail only where facts exist in the log.

See the embedded `narratorInstructions` field in every log file.

## Fields

| Field | Role |
|-------|------|
| `cast` | Pre-fight roster (names, attrs, skills, weapon, armor) |
| `setting` | Map / scene context |
| `beatSheet` | Condensed beats for LLM context windows |
| `timeline` | Full chronological `CombatEvent`s |
| `outcome` | Winner, reason (`death` / `incapacitated` / `rout` / …), duration |
| `finalStates` | End morale + functional tags |
| `summaryLines` | Human-readable debug lines |

## CLI

```bash
npm run duel -- --seed 42
# → logs/duel-seed42-<timestamp>.json

npm run duel -- --seed 42 --out docs/examples/my-fight.json
```
