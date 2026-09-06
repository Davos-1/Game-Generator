import { cellsFor, fits } from './directions';
import { ALL_DIRECTIONS, type Cell, type Direction } from './types';

export interface Occurrence {
  word: string;
  start: Cell;
  direction: Direction;
  cells: readonly Cell[];
}

type Grid = readonly (readonly string[])[];

/**
 * Findet alle Vorkommen eines Worts im Gitter in den angegebenen Richtungen
 * (Standard: alle acht). Palindrome werden pro Richtung einmal gezählt.
 */
export function findWord(
  grid: Grid,
  word: string,
  directions: readonly Direction[] = ALL_DIRECTIONS,
): Occurrence[] {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const found: Occurrence[] = [];
  if (word.length === 0 || width === 0) return found;

  const first = word[0];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (grid[row]?.[col] !== first) continue;
      for (const direction of directions) {
        const start = { row, col };
        if (!fits(start, direction, word.length, width, height)) continue;
        const cells = cellsFor(start, direction, word.length);
        let match = true;
        for (let i = 1; i < word.length; i++) {
          const cell = cells[i] as Cell;
          if (grid[cell.row]?.[cell.col] !== word[i]) {
            match = false;
            break;
          }
        }
        if (match) found.push({ word, start, direction, cells });
      }
    }
  }
  return found;
}

/** Gibt alle Wörter aus `words` zurück, die irgendwo im Gitter vorkommen (alle 8 Richtungen). */
export function findAny(grid: Grid, words: readonly string[]): string[] {
  const hits: string[] = [];
  for (const word of words) {
    if (findWord(grid, word).length > 0) hits.push(word);
  }
  return hits;
}
