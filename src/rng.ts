/**
 * Seeded mulberry32 PRNG for reproducible sims and tests.
 */
export type Rng = () => number;

export function createRng(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function rollDie(rng: Rng, sides = 6): number {
  return 1 + Math.floor(rng() * sides);
}

export function rollNd6(rng: Rng, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(rollDie(rng, 6));
  return out;
}

export function pickWeighted<T>(rng: Rng, items: { item: T; weight: number }[]): T {
  const total = items.reduce((s, x) => s + Math.max(0, x.weight), 0);
  if (total <= 0) return items[0]!.item;
  let r = rng() * total;
  for (const { item, weight } of items) {
    r -= Math.max(0, weight);
    if (r <= 0) return item;
  }
  return items[items.length - 1]!.item;
}
