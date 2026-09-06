import { bit, fullMask, geometryFor, popcount, type Geometry } from './geometry';
import type { SudokuSize } from './types';

/** Flaches Gitter (row * size + col), 0 = leer. */
export type FlatGrid = number[];

/** Kandidatenmasken pro Zelle aus den gesetzten Werten; wirft nicht, liefert 0 bei Widerspruch. */
export function candidatesFor(grid: readonly number[], geo: Geometry): number[] {
  const all = fullMask(geo.size);
  const masks = grid.map((v) => (v ? 0 : all));
  grid.forEach((value, index) => {
    if (!value) return;
    for (const peer of geo.peers[index] as readonly number[]) {
      masks[peer] = (masks[peer] as number) & ~bit(value);
    }
  });
  return masks;
}

/**
 * Zählt Lösungen per Backtracking (Zelle mit wenigsten Kandidaten zuerst),
 * bricht bei `limit` ab. `limit = 2` genügt für den Eindeutigkeits-Check.
 */
export function countSolutions(grid: readonly number[], size: SudokuSize, limit = 2): number {
  const geo = geometryFor(size);
  const work = [...grid];
  const masks = candidatesFor(work, geo);
  if (!isConsistent(work, geo)) return 0;
  let count = 0;

  const search = (): void => {
    if (count >= limit) return;
    let bestIndex = -1;
    let bestCount = Infinity;
    for (let i = 0; i < work.length; i++) {
      if (work[i]) continue;
      const n = popcount(masks[i] as number);
      if (n === 0) return;
      if (n < bestCount) {
        bestCount = n;
        bestIndex = i;
        if (n === 1) break;
      }
    }
    if (bestIndex === -1) {
      count++;
      return;
    }
    const mask = masks[bestIndex] as number;
    for (let d = 1; d <= size; d++) {
      if (!(mask & bit(d))) continue;
      const changed: number[] = [];
      work[bestIndex] = d;
      for (const peer of geo.peers[bestIndex] as readonly number[]) {
        if ((masks[peer] as number) & bit(d)) {
          masks[peer] = (masks[peer] as number) & ~bit(d);
          changed.push(peer);
        }
      }
      search();
      work[bestIndex] = 0;
      for (const peer of changed) masks[peer] = (masks[peer] as number) | bit(d);
      if (count >= limit) return;
    }
  };

  search();
  return count;
}

/** Keine doppelten Werte in einer Einheit. */
export function isConsistent(grid: readonly number[], geo: Geometry): boolean {
  for (const unit of geo.units) {
    let seen = 0;
    for (const index of unit) {
      const v = grid[index] as number;
      if (!v) continue;
      if (seen & bit(v)) return false;
      seen |= bit(v);
    }
  }
  return true;
}

/** Vollständig und widerspruchsfrei. */
export function isSolved(grid: readonly number[], geo: Geometry): boolean {
  return grid.every((v) => v > 0) && isConsistent(grid, geo);
}
