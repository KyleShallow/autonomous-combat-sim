import {
  createHumanoidBody,
  cloneBody,
  type BodyState,
} from '../anatomy/bodyTemplate.js';
import { physiologyTick } from '../anatomy/physiology.js';
import {
  ARMOR_PROFILES,
  cloneArmorLayers,
  type ArmorLayer,
  type ArmorProfileId,
} from '../armor/layers.js';
import type { ActorPlacement } from '../battlefield/nodes.js';
import type { SlotId } from '../impact/displacement.js';
import { createMorale, type MoraleState } from '../morale/morale.js';
import type { Weapon } from '../weapons/melee.js';
import { LONGSWORD } from '../weapons/melee.js';

export interface Attributes {
  STR: number;
  DEX: number;
  AGI: number;
  END: number;
  WIL: number;
  PER: number;
}

export interface Fighter {
  id: string;
  name: string;
  attributes: Attributes;
  /** Skill ranks by key. */
  skills: Record<string, number>;
  heightM: number;
  massKg: number;
  body: BodyState;
  armor: ArmorLayer[];
  weapon: Weapon;
  placement: ActorPlacement;
  morale: MoraleState;
  /** Ticks remaining committed to current action recovery. */
  recoveryTicks: number;
  /** Fatigue 0–1 (1 = fresh). CALIB */
  fatigue: number;
  temperament: number; // noise scale 0–1
}

export interface FighterTemplate {
  id: string;
  name: string;
  attributes: Attributes;
  skills: Record<string, number>;
  heightM?: number;
  massKg?: number;
  armor?: ArmorProfileId;
  weapon: Weapon;
  morale?: number;
  temperament?: number;
  placement?: Partial<ActorPlacement>;
}

export function createFighter(t: FighterTemplate): Fighter {
  const armorId = t.armor ?? 'clothing';
  return {
    id: t.id,
    name: t.name,
    attributes: { ...t.attributes },
    skills: { ...t.skills },
    heightM: t.heightM ?? 1.75,
    massKg: t.massKg ?? 78,
    body: createHumanoidBody(),
    armor: cloneArmorLayers(ARMOR_PROFILES[armorId]),
    weapon: t.weapon,
    placement: {
      nodeId: t.placement?.nodeId ?? 'alley_north',
      slot: (t.placement?.slot as SlotId) ?? 'front',
      facing: t.placement?.facing ?? 'S',
    },
    morale: createMorale(t.morale ?? 75),
    recoveryTicks: 0,
    fatigue: 1,
    temperament: t.temperament ?? 0.25,
  };
}

export function cloneFighter(f: Fighter): Fighter {
  return {
    ...f,
    attributes: { ...f.attributes },
    skills: { ...f.skills },
    body: cloneBody(f.body),
    armor: cloneArmorLayers(f.armor),
    weapon: f.weapon,
    placement: { ...f.placement },
    morale: {
      ...f.morale,
      flags: { ...f.morale.flags },
    },
  };
}

export function refreshPhysiology(f: Fighter): void {
  physiologyTick(f.body);
}

/** Can this fighter still act in the duel? */
export function isOut(f: Fighter): boolean {
  return f.body.dead || f.body.incapacitated || f.morale.morale < 20;
}
