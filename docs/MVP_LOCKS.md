# MVP Design Locks — Autonomous Combat Simulation

Authoritative constraints for the melee-first scaffold. Numbers marked **CALIB** are placeholders pending playtest.

## Time
- Discrete ticks: **0.05 s** (20 Hz).
- Physiology cache refresh: every **10–20 ticks** (~0.5–1 s). **CALIB**

## D6 Skill Resolution
- Pool = `AttributeDice + SkillRank + specialization/familiarity + situational mods`.
- `AttributeDice = max(1, 1 + floor(Attr / 5))`.
- Success on **5–6** (~1/3 per die).
- Opposed Success Margin = attacker successes − defender successes.
- Margin bands affect **execution quality / location control only** — never raw damage.
- **STR does not add attack accuracy**; it feeds impact after contact.
- Minimum **1d6** if the action is physically possible; untrained = attribute dice only.
- Provisional XP cost: `400 + 100 × newRank` (advancement stubbed).

## Hit Location
1. Compute **Reach Envelope** (height, weapon length, posture, elevation).
2. Five vertical zones: Very High / High / Middle / Low / Very Low.
3. Targeting High/Mid/Low is relative to the reachable envelope.
4. Relative size from height ratio → modifier **−4…+4** biases a **3d6** vertical roll.
5. Inaccessible zones snap to nearest reachable.
6. Success Margin only refines aim **within** reachable anatomy.
7. MVP: size-modifier + envelope fallback; Body Template subtables for humanoid parts.

## Anatomy (DF-inspired, not HP)
- Body-part graph with tissues: skin, fat, muscle, tendon, bone, motor nerve, major vessel; organs in torso/head per MVP scope.
- Functional tags: `STANCE`, `GRASP`, `LOCOMOTION`, `SIGHT`, `BREATHING`, `CIRCULATION`, `CONSCIOUSNESS`.
- `function ≈ 0.7 × criticalBottleneck + 0.3 × supportingAverage`.
- Death = vital system failure; incapacitation is separate.
- Skill retained; **effective pool** scales with function%.
- Physiology tick caches functional state.
- MVP humanoid parts: Head (skull/brain/eyes/jaw), Neck, Chest (ribs/heart/lungs), Abdomen, Pelvis, each Arm (upper/elbow/forearm/wrist/hand), each Leg (thigh/knee/lower/ankle/foot) with skin/muscle/bone/tendon/nerve/vessel.

## Armor
- Layered protective barriers share the tissue interface.
- Per layer: slash/pierce/blunt resist × thickness × structure × condition × angle.
- `AttackPotential = energy × geometry × alignment`; `PenetrationRatio = P / R`.
- Placeholder bands (**CALIB**):
  - `< 0.40` deflect
  - `0.40–0.75` stop + trauma
  - `0.75–1.0` near penetration
  - `1.0–1.5` partial
  - `1.5–2.5` full
  - `> 2.5` overwhelm
- Coverage per surface + gaps; blunt transmission when stopped.
- Starter profiles: clothing, leather, mail, plate.

## Impact / Displacement
- Energy for penetration/tissue; Momentum `p = m_eff × v` for knockback.
- STR multiplier ≈ `2^((STR − 10) / 10)` for velocity/force.
- Technique efficiency ~**0.6–1.2** (**CALIB**); alignment **0–1** for edges.
- Impulse, braced mass, footing; humans do not fly from ordinary hits.
- Displacement shifts in-node slots.

## Movement / Nodes
- Graph: nodes (size class, footing, elevation, hazards, capacity) + edges (length, width, choke).
- In-node slots: Front / Mid / Rear / Flank L/R / Cover / Edge-hazard + facing.
- Engagement bands: Grapple / Melee short / Melee long / Pole; **Thrown/Missile STUBBED**.
- Move budget = Agility × stance function × fatigue × footing × encumbrance (**CALIB** weights).
- First demo map: 1–2 nodes + 1 edge (alley).

## Combat AI
- Sense → score options (attack modes, targets, defense, move, flee) → pick max utility + temperament noise → commit through recovery → reassess on stun/stagger/drop/major wound.
- Reach- and armor-aware; one-step lookahead; no formations.

## Morale
- Scale **0–100**; shaken `<40`; routing `<20`; panic `<10`.
- Shock separate; pain feeds both; rally with cooldown; undead/animal/zealot flags.

## Narrative
- Sim is truth. Scaffold emits structured `CombatEvent` log with narrative tags for a future narrator. No free-form prose required here.

## Ranged
- Thrown / Missile engagement bands and attack modes: **STUB** — throw or no-op with clear comment.
