/**
 * Deterministischer Pseudozufallsgenerator (mulberry32).
 *
 * Alle Rätselgeneratoren erhalten ihren Zufall ausschliesslich über dieses
 * Interface, damit ein Rätsel aus einem Seed reproduzierbar ist
 * (Teilen per URL, Tests, Fehleranalyse).
 */
export interface Rng {
  /** Gleichverteilte Zahl im Intervall [0, 1). */
  next(): number;
  /** Ganzzahl im Intervall [min, max] (beide inklusiv). */
  int(min: number, max: number): number;
  /** Zufälliges Element eines nicht-leeren Arrays. */
  pick<T>(items: readonly T[]): T;
  /** Neue Kopie des Arrays in zufälliger Reihenfolge (Fisher-Yates). */
  shuffle<T>(items: readonly T[]): T[];
}

/** Wandelt einen beliebigen String in einen 32-Bit-Seed um (FNV-1a). */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function createRng(seed: number | string): Rng {
  let state = (typeof seed === 'string' ? hashSeed(seed) : seed) >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number => {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new RangeError(`Ungültiger Bereich: [${min}, ${max}]`);
    }
    return min + Math.floor(next() * (max - min + 1));
  };

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) {
      throw new RangeError('pick() benötigt ein nicht-leeres Array');
    }
    return items[int(0, items.length - 1)] as T;
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = int(0, i);
      const tmp = result[i] as T;
      result[i] = result[j] as T;
      result[j] = tmp;
    }
    return result;
  };

  return { next, int, pick, shuffle };
}
