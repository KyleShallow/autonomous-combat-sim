/**
 * MVP humanoid body template — DF-inspired part graph with tissues.
 * Not HP: damage degrades tissue integrity → functional tags.
 */

export type TissueKind =
  | 'skin'
  | 'fat'
  | 'muscle'
  | 'tendon'
  | 'bone'
  | 'nerve'
  | 'vessel'
  | 'organ';

export type FunctionalTag =
  | 'STANCE'
  | 'GRASP'
  | 'LOCOMOTION'
  | 'SIGHT'
  | 'BREATHING'
  | 'CIRCULATION'
  | 'CONSCIOUSNESS';

export type VerticalZone = 'veryHigh' | 'high' | 'middle' | 'low' | 'veryLow';

export interface TissueLayer {
  kind: TissueKind;
  /** Integrity 0–1. */
  integrity: number;
  /** Relative thickness / importance for this part. CALIB */
  thickness: number;
  /** Soft resist to slash/pierce/blunt (relative). CALIB */
  resist: { slash: number; pierce: number; blunt: number };
  /** If true, damage here is a critical bottleneck for tagged functions. */
  criticalFor?: FunctionalTag[];
}

export interface BodyPart {
  id: string;
  name: string;
  zone: VerticalZone;
  side?: 'left' | 'right' | 'center';
  tissues: TissueLayer[];
  /** Parent part id for graph (optional). */
  parent?: string;
}

export interface BodyState {
  parts: Map<string, BodyPart>;
  /** Cached function% per tag, refreshed on physiology tick. */
  functions: Record<FunctionalTag, number>;
  dead: boolean;
  incapacitated: boolean;
}

const soft = (s: number, p: number, b: number) => ({ slash: s, pierce: p, blunt: b });

function skinFatMuscleBone(opts?: {
  vessel?: boolean;
  nerve?: boolean;
  tendon?: boolean;
  organ?: { name: TissueKind; crit: FunctionalTag[]; thick?: number };
}): TissueLayer[] {
  const layers: TissueLayer[] = [
    { kind: 'skin', integrity: 1, thickness: 0.05, resist: soft(0.3, 0.2, 0.4) },
    { kind: 'fat', integrity: 1, thickness: 0.08, resist: soft(0.2, 0.15, 0.5) },
    { kind: 'muscle', integrity: 1, thickness: 0.35, resist: soft(0.5, 0.4, 0.6) },
  ];
  if (opts?.tendon) {
    layers.push({
      kind: 'tendon',
      integrity: 1,
      thickness: 0.1,
      resist: soft(0.7, 0.5, 0.4),
      criticalFor: ['GRASP', 'LOCOMOTION'],
    });
  }
  layers.push({
    kind: 'bone',
    integrity: 1,
    thickness: 0.25,
    resist: soft(1.2, 0.9, 1.5),
  });
  if (opts?.nerve) {
    layers.push({
      kind: 'nerve',
      integrity: 1,
      thickness: 0.05,
      resist: soft(0.1, 0.1, 0.2),
      criticalFor: ['GRASP', 'LOCOMOTION', 'STANCE'],
    });
  }
  if (opts?.vessel) {
    layers.push({
      kind: 'vessel',
      integrity: 1,
      thickness: 0.05,
      resist: soft(0.15, 0.1, 0.2),
      criticalFor: ['CIRCULATION'],
    });
  }
  if (opts?.organ) {
    layers.push({
      kind: 'organ',
      integrity: 1,
      thickness: opts.organ.thick ?? 0.3,
      resist: soft(0.2, 0.15, 0.3),
      criticalFor: opts.organ.crit,
    });
  }
  return layers;
}

function armChain(side: 'left' | 'right'): BodyPart[] {
  const p = side[0];
  return [
    {
      id: `${p}_upper_arm`,
      name: `${side} upper arm`,
      zone: 'high',
      side,
      parent: 'chest',
      tissues: skinFatMuscleBone({ vessel: true, nerve: true }),
    },
    {
      id: `${p}_elbow`,
      name: `${side} elbow`,
      zone: 'middle',
      side,
      parent: `${p}_upper_arm`,
      tissues: skinFatMuscleBone({ tendon: true, nerve: true }),
    },
    {
      id: `${p}_forearm`,
      name: `${side} forearm`,
      zone: 'middle',
      side,
      parent: `${p}_elbow`,
      tissues: skinFatMuscleBone({ tendon: true, vessel: true, nerve: true }),
    },
    {
      id: `${p}_wrist`,
      name: `${side} wrist`,
      zone: 'middle',
      side,
      parent: `${p}_forearm`,
      tissues: skinFatMuscleBone({ tendon: true }),
    },
    {
      id: `${p}_hand`,
      name: `${side} hand`,
      zone: 'middle',
      side,
      parent: `${p}_wrist`,
      tissues: skinFatMuscleBone({ tendon: true, nerve: true }),
    },
  ];
}

function legChain(side: 'left' | 'right'): BodyPart[] {
  const p = side[0];
  return [
    {
      id: `${p}_thigh`,
      name: `${side} thigh`,
      zone: 'low',
      side,
      parent: 'pelvis',
      tissues: skinFatMuscleBone({ vessel: true, nerve: true }),
    },
    {
      id: `${p}_knee`,
      name: `${side} knee`,
      zone: 'low',
      side,
      parent: `${p}_thigh`,
      tissues: skinFatMuscleBone({ tendon: true }),
    },
    {
      id: `${p}_lower_leg`,
      name: `${side} lower leg`,
      zone: 'veryLow',
      side,
      parent: `${p}_knee`,
      tissues: skinFatMuscleBone({ tendon: true, vessel: true }),
    },
    {
      id: `${p}_ankle`,
      name: `${side} ankle`,
      zone: 'veryLow',
      side,
      parent: `${p}_lower_leg`,
      tissues: skinFatMuscleBone({ tendon: true }),
    },
    {
      id: `${p}_foot`,
      name: `${side} foot`,
      zone: 'veryLow',
      side,
      parent: `${p}_ankle`,
      tissues: skinFatMuscleBone({ tendon: true }),
    },
  ];
}

/** Build a fresh MVP humanoid body. */
export function createHumanoidBody(): BodyState {
  const parts: BodyPart[] = [
    {
      id: 'head',
      name: 'head',
      zone: 'veryHigh',
      side: 'center',
      tissues: [
        { kind: 'skin', integrity: 1, thickness: 0.04, resist: soft(0.3, 0.2, 0.4) },
        {
          kind: 'bone',
          integrity: 1,
          thickness: 0.35,
          resist: soft(1.5, 1.2, 1.8),
          criticalFor: ['CONSCIOUSNESS'],
        },
        {
          kind: 'organ',
          integrity: 1,
          thickness: 0.4,
          resist: soft(0.1, 0.1, 0.2),
          criticalFor: ['CONSCIOUSNESS'],
        },
      ],
    },
    {
      id: 'eyes',
      name: 'eyes',
      zone: 'veryHigh',
      side: 'center',
      parent: 'head',
      tissues: [
        {
          kind: 'organ',
          integrity: 1,
          thickness: 0.2,
          resist: soft(0.05, 0.05, 0.1),
          criticalFor: ['SIGHT'],
        },
      ],
    },
    {
      id: 'jaw',
      name: 'jaw',
      zone: 'veryHigh',
      side: 'center',
      parent: 'head',
      tissues: skinFatMuscleBone(),
    },
    {
      id: 'neck',
      name: 'neck',
      zone: 'high',
      side: 'center',
      parent: 'head',
      tissues: skinFatMuscleBone({
        vessel: true,
        nerve: true,
        organ: { name: 'organ', crit: ['BREATHING', 'CIRCULATION'], thick: 0.2 },
      }),
    },
    {
      id: 'chest',
      name: 'chest',
      zone: 'high',
      side: 'center',
      tissues: [
        { kind: 'skin', integrity: 1, thickness: 0.05, resist: soft(0.3, 0.2, 0.4) },
        { kind: 'fat', integrity: 1, thickness: 0.08, resist: soft(0.2, 0.15, 0.5) },
        { kind: 'muscle', integrity: 1, thickness: 0.25, resist: soft(0.5, 0.4, 0.6) },
        {
          kind: 'bone',
          integrity: 1,
          thickness: 0.2,
          resist: soft(1.3, 1.0, 1.6),
        },
        {
          kind: 'organ',
          integrity: 1,
          thickness: 0.25,
          resist: soft(0.15, 0.12, 0.25),
          criticalFor: ['BREATHING'],
        },
        {
          kind: 'organ',
          integrity: 1,
          thickness: 0.15,
          resist: soft(0.15, 0.1, 0.2),
          criticalFor: ['CIRCULATION'],
        },
        {
          kind: 'vessel',
          integrity: 1,
          thickness: 0.05,
          resist: soft(0.15, 0.1, 0.2),
          criticalFor: ['CIRCULATION'],
        },
      ],
    },
    {
      id: 'abdomen',
      name: 'abdomen',
      zone: 'middle',
      side: 'center',
      parent: 'chest',
      tissues: skinFatMuscleBone({
        vessel: true,
        organ: { name: 'organ', crit: ['CIRCULATION'], thick: 0.35 },
      }),
    },
    {
      id: 'pelvis',
      name: 'pelvis',
      zone: 'low',
      side: 'center',
      parent: 'abdomen',
      tissues: skinFatMuscleBone({ vessel: true }),
    },
    ...armChain('left'),
    ...armChain('right'),
    ...legChain('left'),
    ...legChain('right'),
  ];

  const map = new Map<string, BodyPart>();
  for (const p of parts) map.set(p.id, p);

  const functions = blankFunctions();
  return { parts: map, functions, dead: false, incapacitated: false };
}

export function blankFunctions(): Record<FunctionalTag, number> {
  return {
    STANCE: 1,
    GRASP: 1,
    LOCOMOTION: 1,
    SIGHT: 1,
    BREATHING: 1,
    CIRCULATION: 1,
    CONSCIOUSNESS: 1,
  };
}

export function cloneBody(body: BodyState): BodyState {
  const parts = new Map<string, BodyPart>();
  for (const [id, part] of body.parts) {
    parts.set(id, {
      ...part,
      tissues: part.tissues.map((t) => ({
        ...t,
        resist: { ...t.resist },
        criticalFor: t.criticalFor ? [...t.criticalFor] : undefined,
      })),
    });
  }
  return {
    parts,
    functions: { ...body.functions },
    dead: body.dead,
    incapacitated: body.incapacitated,
  };
}
