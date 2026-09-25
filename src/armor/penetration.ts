import type { ArmorLayer, DamageMode } from './layers.js';

/**
 * AttackPotential = energy × geometry × alignment
 * PenetrationRatio = P / R
 *
 * Placeholder bands (CALIB):
 *   <0.40 deflect; 0.40–0.75 stop+trauma; 0.75–1.0 near penet;
 *   1.0–1.5 partial; 1.5–2.5 full; >2.5 overwhelm
 */
export type PenetrationBand =
  | 'deflect'
  | 'stopTrauma'
  | 'nearPenet'
  | 'partial'
  | 'full'
  | 'overwhelm';

export function penetrationBand(ratio: number): PenetrationBand {
  if (ratio < 0.4) return 'deflect';
  if (ratio < 0.75) return 'stopTrauma';
  if (ratio < 1.0) return 'nearPenet';
  if (ratio < 1.5) return 'partial';
  if (ratio < 2.5) return 'full';
  return 'overwhelm';
}

export interface PenetrationInput {
  energy: number;
  /** Geometry factor (edge sharpness / tip / face). CALIB ~0.5–1.5 */
  geometry: number;
  /** Edge/point alignment 0–1. */
  alignment: number;
  mode: DamageMode;
  /** Incidence angle factor 0–1 (1 = ideal). CALIB */
  angle?: number;
  layers: ArmorLayer[];
  /** RNG gap check — if provided and coverage fails, treat as unarmored gap. */
  gapRoll?: number;
}

export interface LayerResult {
  layer: ArmorLayer;
  resistance: number;
  gap: boolean;
}

export interface PenetrationResult {
  attackPotential: number;
  totalResistance: number;
  ratio: number;
  band: PenetrationBand;
  /** Fraction of energy that reaches tissue (after armor). CALIB heuristic. */
  transmittedEnergy: number;
  /** Blunt trauma even when stopped. */
  bluntTrauma: number;
  layers: LayerResult[];
}

export function layerResistance(
  layer: ArmorLayer,
  mode: DamageMode,
  angle: number,
): number {
  return layer.resist[mode] * layer.thickness * layer.structure * layer.condition * angle;
}

export function resolvePenetration(input: PenetrationInput): PenetrationResult {
  const angle = input.angle ?? 1;
  // ENERGY_TO_POTENTIAL scales joules into the resist unit space for ratio/bands. CALIB
  const ENERGY_TO_POTENTIAL = 0.045;
  const attackPotential = input.energy * ENERGY_TO_POTENTIAL * input.geometry * input.alignment;
  const layerResults: LayerResult[] = [];
  let totalResistance = 0;

  for (const layer of input.layers) {
    const gap =
      input.gapRoll !== undefined ? input.gapRoll > layer.coverage : false;
    if (gap) {
      layerResults.push({ layer, resistance: 0, gap: true });
      continue;
    }
    const r = layerResistance(layer, input.mode, angle);
    totalResistance += r;
    layerResults.push({ layer, resistance: r, gap: false });
  }

  // Bare skin still has tiny resistance floor so ratio is defined. CALIB
  if (totalResistance < 0.05) totalResistance = 0.05;

  const ratio = attackPotential / totalResistance;
  const band = penetrationBand(ratio);

  // Transmit fractions of *raw* strike energy (not the scaled potential). CALIB
  const raw = input.energy * input.geometry * input.alignment;
  let transmittedEnergy = 0;
  let bluntTrauma = 0;

  switch (band) {
    case 'deflect':
      transmittedEnergy = 0;
      bluntTrauma = raw * 0.05;
      break;
    case 'stopTrauma':
      transmittedEnergy = 0;
      bluntTrauma = raw * 0.35;
      break;
    case 'nearPenet':
      transmittedEnergy = raw * 0.15;
      bluntTrauma = raw * 0.4;
      break;
    case 'partial':
      transmittedEnergy = raw * 0.45;
      bluntTrauma = raw * 0.25;
      break;
    case 'full':
      transmittedEnergy = raw * 0.75;
      bluntTrauma = raw * 0.1;
      break;
    case 'overwhelm':
      transmittedEnergy = raw * 0.95;
      bluntTrauma = raw * 0.05;
      break;
  }

  return {
    attackPotential,
    totalResistance,
    ratio,
    band,
    transmittedEnergy,
    bluntTrauma,
    layers: layerResults,
  };
}
