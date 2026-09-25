/**
 * Layered protective barriers — same conceptual interface as tissue.
 */

export type DamageMode = 'slash' | 'pierce' | 'blunt';

export interface ArmorLayer {
  id: string;
  name: string;
  /** Resist per mode (relative). CALIB */
  resist: { slash: number; pierce: number; blunt: number };
  /** Thickness multiplier. CALIB */
  thickness: number;
  /** Structural integrity / quality 0–1+. CALIB */
  structure: number;
  /** Condition 0–1 (wear/damage). */
  condition: number;
  /** Coverage 0–1 of the surface; gaps = 1 − coverage. CALIB */
  coverage: number;
}

export type ArmorProfileId = 'none' | 'clothing' | 'leather' | 'mail' | 'plate';

export const ARMOR_PROFILES: Record<ArmorProfileId, ArmorLayer[]> = {
  none: [],
  clothing: [
    {
      id: 'cloth',
      name: 'clothing',
      resist: { slash: 1.5, pierce: 1.2, blunt: 2.0 },
      thickness: 0.05,
      structure: 0.8,
      condition: 1,
      coverage: 0.95,
    },
  ],
  leather: [
    {
      id: 'leather',
      name: 'leather armor',
      resist: { slash: 4.0, pierce: 2.5, blunt: 3.5 },
      thickness: 0.35,
      structure: 1.0,
      condition: 1,
      coverage: 0.9,
    },
  ],
  mail: [
    {
      id: 'gambeson',
      name: 'padded underlayer',
      resist: { slash: 2.0, pierce: 1.8, blunt: 4.0 },
      thickness: 0.12,
      structure: 0.9,
      condition: 1,
      coverage: 0.95,
    },
    {
      id: 'mail',
      name: 'mail',
      resist: { slash: 8.0, pierce: 3.5, blunt: 2.5 },
      thickness: 0.25,
      structure: 1.1,
      condition: 1,
      coverage: 0.88,
    },
  ],
  plate: [
    {
      id: 'arming_doublet',
      name: 'arming doublet',
      resist: { slash: 1.8, pierce: 1.5, blunt: 3.5 },
      thickness: 0.1,
      structure: 0.9,
      condition: 1,
      coverage: 0.95,
    },
    {
      id: 'plate',
      name: 'plate',
      resist: { slash: 12.0, pierce: 9.0, blunt: 8.0 },
      thickness: 0.2,
      structure: 1.3,
      condition: 1,
      coverage: 0.85,
    },
  ],
};

export function cloneArmorLayers(layers: ArmorLayer[]): ArmorLayer[] {
  return layers.map((l) => ({ ...l, resist: { ...l.resist } }));
}
