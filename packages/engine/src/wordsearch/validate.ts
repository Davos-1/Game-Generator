import { blacklistVariants } from './normalize';
import { findWord, type Occurrence } from './solver';
import type { Cell, PlacedWord, WordSearchPuzzle } from './types';

export type ValidationIssue =
  | { kind: 'grid-mismatch'; word: string }
  | { kind: 'not-unique'; word: string; count: number }
  | { kind: 'blacklisted'; word: string }
  | { kind: 'empty-cell'; cell: Cell };

export interface ValidationResult {
  ok: boolean;
  issues: readonly ValidationIssue[];
}

const cellKey = (c: Cell): string => `${c.row},${c.col}`;
const occurrenceKey = (o: Occurrence): string => o.cells.map(cellKey).sort().join('|');

/**
 * Prüft ein fertiges Rätsel:
 * - jedes platzierte Wort steht buchstabengetreu an der angegebenen Position,
 * - jedes Wort kommt genau einmal vor (Vorkommen, die vollständig innerhalb eines
 *   anderen platzierten Worts liegen, z. B. ARM in ARMBAND, zählen nicht),
 * - kein Wort der Blacklist ist zufällig entstanden,
 * - keine Zelle ist leer.
 */
export function validateWordSearch(
  puzzle: Pick<WordSearchPuzzle, 'grid' | 'placed'>,
  blacklist: readonly string[] = [],
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const { grid, placed } = puzzle;

  grid.forEach((row, r) =>
    row.forEach((letter, c) => {
      if (!letter) issues.push({ kind: 'empty-cell', cell: { row: r, col: c } });
    }),
  );

  const cellSets = placed.map((p) => new Set(p.cells.map(cellKey)));

  placed.forEach((p, index) => {
    if (!matchesGrid(grid, p)) {
      issues.push({ kind: 'grid-mismatch', word: p.word });
      return;
    }
    const seen = new Set<string>();
    let count = 0;
    for (const occ of findWord(grid, p.word)) {
      const key = occurrenceKey(occ);
      if (seen.has(key)) continue; // Palindrom: vorwärts und rückwärts sind dieselben Zellen
      seen.add(key);
      const insideOther = cellSets.some(
        (set, other) => other !== index && occ.cells.every((c) => set.has(cellKey(c))),
      );
      if (!insideOther) count++;
    }
    if (count !== 1) issues.push({ kind: 'not-unique', word: p.word, count });
  });

  // Blacklist: Treffer, die vollständig innerhalb eines platzierten Worts liegen
  // (z. B. SAU in DINOSAURIER), hat der Nutzer bewusst gewählt und zählen nicht.
  for (const entry of blacklist) {
    for (const variant of blacklistVariants(entry)) {
      if (variant.length < 2) continue;
      const accidental = findWord(grid, variant).some(
        (occ) => !cellSets.some((set) => occ.cells.every((c) => set.has(cellKey(c)))),
      );
      if (accidental) {
        issues.push({ kind: 'blacklisted', word: variant });
        break;
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

function matchesGrid(grid: WordSearchPuzzle['grid'], p: PlacedWord): boolean {
  if (p.cells.length !== p.word.length) return false;
  return p.cells.every((cell, i) => grid[cell.row]?.[cell.col] === p.word[i]);
}
