/** Seeded RNG (mulberry32). State lives in the game object so saves replay exactly. */
export function next(s: { rng: number }): number {
  s.rng = (s.rng + 0x6d2b79f5) | 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const d = (s: { rng: number }, sides: number): number => 1 + Math.floor(next(s) * sides);

export function shuffle<T>(s: { rng: number }, arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next(s) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickN<T>(s: { rng: number }, arr: T[], n: number): T[] {
  return shuffle(s, arr).slice(0, n);
}
