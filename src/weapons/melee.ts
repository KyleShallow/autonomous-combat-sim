import type { DamageMode } from '../armor/layers.js';
import type { EngagementBand } from '../battlefield/engagement.js';
import { preferredBand } from '../battlefield/engagement.js';

export type AttackModeId = 'cut' | 'thrust' | 'pommel' | 'bash' | 'stab';

export interface AttackMode {
  id: AttackModeId;
  name: string;
  damageMode: DamageMode;
  /** Geometry factor. CALIB */
  geometry: number;
  /** Base alignment when well-executed. CALIB */
  baseAlignment: number;
  /** Base velocity (m/s) at STR 10. CALIB */
  baseVelocity: number;
  /** Recovery ticks after commit. CALIB */
  recoveryTicks: number;
  /** Skill used (key into fighter skills). */
  skill: string;
}

export interface Weapon {
  id: string;
  name: string;
  /** Length (m). */
  length: number;
  /** Effective striking mass (kg). CALIB */
  massEff: number;
  modes: AttackMode[];
  preferredBand: EngagementBand;
}

export const LONGSWORD: Weapon = {
  id: 'longsword',
  name: 'Longsword',
  length: 1.15,
  massEff: 1.4,
  preferredBand: preferredBand(1.15),
  modes: [
    {
      id: 'cut',
      name: 'cut',
      damageMode: 'slash',
      geometry: 1.1,
      baseAlignment: 0.75,
      baseVelocity: 8,
      recoveryTicks: 12, // 0.6s
      skill: 'sword',
    },
    {
      id: 'thrust',
      name: 'thrust',
      damageMode: 'pierce',
      geometry: 1.3,
      baseAlignment: 0.85,
      baseVelocity: 7,
      recoveryTicks: 10,
      skill: 'sword',
    },
    {
      id: 'pommel',
      name: 'pommel strike',
      damageMode: 'blunt',
      geometry: 0.9,
      baseAlignment: 0.9,
      baseVelocity: 6,
      recoveryTicks: 8,
      skill: 'sword',
    },
  ],
};

export const SPEAR: Weapon = {
  id: 'spear',
  name: 'Spear',
  length: 2.0,
  massEff: 1.2,
  preferredBand: preferredBand(2.0),
  modes: [
    {
      id: 'thrust',
      name: 'thrust',
      damageMode: 'pierce',
      geometry: 1.4,
      baseAlignment: 0.9,
      baseVelocity: 7.5,
      recoveryTicks: 11,
      skill: 'spear',
    },
    {
      id: 'cut',
      name: 'shaft slash',
      damageMode: 'slash',
      geometry: 0.7,
      baseAlignment: 0.5,
      baseVelocity: 6,
      recoveryTicks: 14,
      skill: 'spear',
    },
  ],
};

export const MACE: Weapon = {
  id: 'mace',
  name: 'Mace',
  length: 0.7,
  massEff: 2.2,
  preferredBand: preferredBand(0.7),
  modes: [
    {
      id: 'bash',
      name: 'bash',
      damageMode: 'blunt',
      geometry: 1.2,
      baseAlignment: 0.95,
      baseVelocity: 7,
      recoveryTicks: 13,
      skill: 'mace',
    },
  ],
};

export const DAGGER: Weapon = {
  id: 'dagger',
  name: 'Dagger',
  length: 0.35,
  massEff: 0.4,
  preferredBand: preferredBand(0.35),
  modes: [
    {
      id: 'stab',
      name: 'stab',
      damageMode: 'pierce',
      geometry: 1.2,
      baseAlignment: 0.8,
      baseVelocity: 6,
      recoveryTicks: 6,
      skill: 'dagger',
    },
    {
      id: 'cut',
      name: 'slash',
      damageMode: 'slash',
      geometry: 0.9,
      baseAlignment: 0.7,
      baseVelocity: 5.5,
      recoveryTicks: 7,
      skill: 'dagger',
    },
  ],
};

export const WEAPONS: Record<string, Weapon> = {
  longsword: LONGSWORD,
  spear: SPEAR,
  mace: MACE,
  dagger: DAGGER,
};
