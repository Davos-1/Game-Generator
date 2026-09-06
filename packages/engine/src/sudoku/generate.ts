import { createRng, type Rng } from '../random';
import { bit, geometryFor, type Geometry } from './geometry';
import { countSolutions } from './solver';
import { solveWithTechniques } from './techniques';
import type {
  RatingLevel,
  SudokuDifficulty,
  SudokuOptions,
  SudokuPuzzle,
  SudokuSize,
} from './types';

/** Ziel-Anzahl Vorgaben pro Grösse und Stufe (PLAN.md 3.3: leicht 36–40, schwer 24–28 bei 9×9). */
export const GIVENS_TARGET: Readonly<
  Record<SudokuSize, Readonly<Record<SudokuDifficulty, number>>>
> = {
  4: { easy: 9, medium: 7, hard: 5 },
  6: { easy: 20, medium: 16, hard: 12 },
  9: { easy: 38, medium: 32, hard: 26 },
};

/** Unter diese Anzahl Vorgaben wird nie reduziert. */
const GIVENS_MIN: Readonly<Record<SudokuSize, number>> = { 4: 4, 6: 10, 9: 22 };

const RANK: Readonly<Record<RatingLevel, number>> = { easy: 0, medium: 1, hard: 2, expert: 3 };

/**
 * Entscheidet, ob ein Rätsel die gewünschte Stufe erfüllt.
 * - 4×4 und 6×6 (Kinder): nur die Anzahl Vorgaben zählt, Raten ist ausgeschlossen.
 * - 9×9 leicht: nur Singles nötig. Mittel: Paar- oder Box-Line-Techniken nötig.
 *   Schwer: schwere Techniken (Hidden Pair, Naked Triple, X-Wing) oder
 *   Paar-Techniken bei höchstens 26 Vorgaben.
 */
export function meetsDifficulty(
  size: SudokuSize,
  difficulty: SudokuDifficulty,
  level: RatingLevel,
  givens: number,
): boolean {
  if (level === 'expert' || givens > GIVENS_TARGET[size][difficulty]) return false;
  if (size !== 9) return true;
  if (difficulty === 'hard') return level === 'hard' || level === 'medium';
  return level === difficulty;
}

/**
 * Erzeugt ein Sudoku mit eindeutiger Lösung. Vorgehen: volles Gitter per
 * Backtracking, dann Zellen in zufälliger Reihenfolge entfernen, solange die
 * Lösung eindeutig bleibt. Das Rating stammt aus dem Technik-Solver; passt es
 * nicht zur gewünschten Stufe, wird mit abgeleitetem Seed neu probiert.
 * Deterministisch pro Seed und Optionen.
 */
export function generateSudoku(options: SudokuOptions): SudokuPuzzle {
  const size = options.size ?? 9;
  const difficulty = options.difficulty ?? 'easy';
  const maxAttempts = options.maxAttempts ?? 40;
  if (!(size in GIVENS_TARGET)) throw new RangeError(`Ungültige Sudoku-Grösse: ${String(size)}`);
  const geo = geometryFor(size);
  const wanted = RANK[difficulty];

  let best: SudokuPuzzle | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rng = createRng(`${String(options.seed)}:sudoku:${attempt}`);
    const solution = fillGrid(geo, rng);
    const puzzle = carve(solution, geo, difficulty, rng);
    const result = toPuzzle(puzzle, solution, geo, difficulty, options.seed);

    if (meetsDifficulty(size, difficulty, result.rating.level, result.givenCount)) return result;
    // Bestes Nebenresultat merken: nie «expert», sonst möglichst nah an der gewünschten Stufe.
    if (
      result.rating.level !== 'expert' &&
      (!best ||
        Math.abs(RANK[result.rating.level] - wanted) < Math.abs(RANK[best.rating.level] - wanted))
    ) {
      best = result;
    }
  }
  if (best) return best;
  throw new Error('Konnte kein Sudoku mit eindeutiger Lösung erzeugen.');
}

/** Volles, gültiges Gitter per Backtracking mit zufälliger Ziffernreihenfolge. */
export function fillGrid(geo: Geometry, rng: Rng): number[] {
  const { size } = geo;
  const grid: number[] = Array.from({ length: size * size }, () => 0);
  const digits = Array.from({ length: size }, (_, i) => i + 1);

  const used = (index: number): number => {
    let mask = 0;
    for (const peer of geo.peers[index] as readonly number[]) {
      const v = grid[peer] as number;
      if (v) mask |= bit(v);
    }
    return mask;
  };

  const fill = (index: number): boolean => {
    if (index === grid.length) return true;
    const blocked = used(index);
    for (const d of rng.shuffle(digits)) {
      if (blocked & bit(d)) continue;
      grid[index] = d;
      if (fill(index + 1)) return true;
    }
    grid[index] = 0;
    return false;
  };

  if (!fill(0)) throw new Error('Gitter konnte nicht gefüllt werden');
  return grid;
}

/**
 * Entfernt Zellen in zufälliger Reihenfolge. Eine Zelle bleibt nur entfernt, wenn
 * die Lösung eindeutig bleibt und kein Raten nötig wird. Aufgehört wird, sobald
 * die Zielanzahl Vorgaben erreicht ist und das Rating mindestens der gewünschten
 * Stufe erfüllt (siehe meetsDifficulty), spätestens beim Minimum. Nie «expert».
 */
function carve(
  solution: readonly number[],
  geo: Geometry,
  difficulty: SudokuDifficulty,
  rng: Rng,
): number[] {
  const { size } = geo;
  const min = GIVENS_MIN[size];
  const grid = [...solution];
  let givens = grid.length;
  let level: RatingLevel = 'easy';

  for (const index of rng.shuffle(Array.from({ length: grid.length }, (_, i) => i))) {
    if (givens <= min) break;
    if (meetsDifficulty(size, difficulty, level, givens)) break;

    const value = grid[index] as number;
    grid[index] = 0;
    if (countSolutions(grid, size, 2) !== 1) {
      grid[index] = value;
      continue;
    }
    const next = solveWithTechniques(grid, size).rating.level;
    if (next === 'expert') {
      grid[index] = value;
      continue;
    }
    level = next;
    givens--;
  }
  return grid;
}

function toPuzzle(
  flat: readonly number[],
  solution: readonly number[],
  geo: Geometry,
  difficulty: SudokuDifficulty,
  seed: string | number,
): SudokuPuzzle {
  const { size } = geo;
  const unflatten = (g: readonly number[]): number[][] =>
    Array.from({ length: size }, (_, r) => g.slice(r * size, (r + 1) * size));
  return {
    size,
    boxRows: geo.boxRows,
    boxCols: geo.boxCols,
    givens: unflatten(flat),
    solution: unflatten(solution),
    givenCount: flat.filter((v) => v > 0).length,
    difficulty,
    rating: solveWithTechniques(flat, size).rating,
    seed,
  };
}
