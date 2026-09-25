/**
 * AttributeDice = 1 + floor(Attr/5), min 1.
 * STR does NOT feed accuracy pools — only impact after contact.
 */
export function attributeDice(attr: number): number {
  return Math.max(1, 1 + Math.floor(attr / 5));
}

/** Provisional XP to reach a new skill rank. Advancement is stubbed. */
export function xpToNextRank(newRank: number): number {
  return 400 + 100 * newRank;
}
