/**
 * Deterministic Seeded Pseudo-Random Number Generator (Mulberry32)
 * Ensures 100% reproducible procedural question generation given a seed.
 */
export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = Math.floor(Math.abs(seed)) || 1337;
  }

  /**
   * Generates a floating-point number in [0, 1)
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates an integer in range [min, max] inclusive
   */
  nextInt(min: number, max: number): number {
    if (min >= max) return min;
    const r = this.next();
    return Math.floor(r * (max - min + 1)) + min;
  }

  /**
   * Picks a random element from an array
   */
  pick<T>(array: readonly T[]): T {
    if (!array || array.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    const idx = this.nextInt(0, array.length - 1);
    return array[idx];
  }

  /**
   * Picks N unique items from an array without replacement
   */
  pickUnique<T>(array: readonly T[], count: number): T[] {
    const copy = [...array];
    const result: T[] = [];
    const n = Math.min(count, copy.length);
    for (let i = 0; i < n; i++) {
      const idx = this.nextInt(0, copy.length - 1);
      result.push(copy[idx]);
      copy.splice(idx, 1);
    }
    return result;
  }

  /**
   * Shuffles an array deterministically (Fisher-Yates)
   */
  shuffle<T>(array: readonly T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * Generates a boolean with probability `p` (default 0.5)
   */
  nextBool(p = 0.5): boolean {
    return this.next() < p;
  }
}

export function createRng(seed: number): SeededRNG {
  return new SeededRNG(seed);
}
