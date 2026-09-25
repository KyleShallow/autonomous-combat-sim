/**
 * Morale 0–100; shaken <40; routing <20; panic <10.
 * Shock separate; pain feeds both.
 */

export type MoraleFlags = {
  undead?: boolean;
  animal?: boolean;
  zealot?: boolean;
};

export interface MoraleState {
  morale: number;
  shock: number;
  pain: number;
  rallyCooldownTicks: number;
  flags: MoraleFlags;
}

export type MoraleBand = 'steady' | 'shaken' | 'routing' | 'panic';

export function moraleBand(morale: number): MoraleBand {
  if (morale < 10) return 'panic';
  if (morale < 20) return 'routing';
  if (morale < 40) return 'shaken';
  return 'steady';
}

export function createMorale(initial = 70, flags: MoraleFlags = {}): MoraleState {
  return {
    morale: clamp(initial, 0, 100),
    shock: 0,
    pain: 0,
    rallyCooldownTicks: 0,
    flags,
  };
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/** Apply wound/pain feedback. CALIB magnitudes. */
export function applyPainShock(
  state: MoraleState,
  painDelta: number,
  shockDelta: number,
): void {
  if (state.flags.undead) {
    // Undead ignore morale collapse; still track shock lightly.
    state.shock = clamp(state.shock + shockDelta * 0.2, 0, 100);
    return;
  }
  state.pain = clamp(state.pain + painDelta, 0, 100);
  state.shock = clamp(state.shock + shockDelta, 0, 100);
  state.morale = clamp(state.morale - painDelta * 0.5 - shockDelta * 0.8, 0, 100);
}

/** Tick decay + optional rally. */
export function tickMorale(state: MoraleState): void {
  if (state.rallyCooldownTicks > 0) state.rallyCooldownTicks -= 1;
  // Mild recovery. CALIB
  state.shock = Math.max(0, state.shock - 0.15);
  state.pain = Math.max(0, state.pain - 0.05);
  if (state.flags.zealot && state.morale < 50) {
    state.morale = Math.min(100, state.morale + 0.1);
  }
}

export function tryRally(state: MoraleState, amount = 12): boolean {
  if (state.flags.undead || state.flags.animal) return false;
  if (state.rallyCooldownTicks > 0) return false;
  state.morale = clamp(state.morale + amount, 0, 100);
  state.rallyCooldownTicks = 40; // 2s. CALIB
  return true;
}

export function wantsFlee(state: MoraleState): boolean {
  if (state.flags.undead || state.flags.zealot) return false;
  const band = moraleBand(state.morale);
  return band === 'routing' || band === 'panic';
}
