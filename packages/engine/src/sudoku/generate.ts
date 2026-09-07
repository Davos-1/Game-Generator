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

/**
 * Ziel-Anzahl Vorgaben pro Grösse und Stufe (PLAN.md 3.3: leicht 36–40,
 * schwer 24–28 bei 9×9).
 *
 * Die Stufe hängt an der Anzahl Vorgaben, nicht an der nötigen Technik. Wer
 * ein Rätsel anschaut, sieht zuerst, wie leer das Gitter ist. Früher wurde
 * ausgedünnt, bis eine schwerere Technik nötig war; dabei landeten «mittel»
 * und «schwer» regelmässig bei derselben Anzahl Vorgaben.
 */
export const GIVENS_TARGET: Readonly<
  Record<SudokuSize, Readonly<Record<SudokuDifficulty, number>>>
> = {
  4: { easy: 9, medium: 7, hard: 5 },
  6: { easy: 22, medium: 16, hard: 11 },
  9: { easy: 40, medium: 32, hard: 24 },
};

/**
 * Unter diese Anzahl Vorgaben wird nie reduziert. Gemessen: ein eindeutiges
 * 9×9 endet je nach Gitter bei 22 bis 27 Vorgaben, ein 6×6 bei 9 bis 11.
 */
const GIVENS_MIN: Readonly<Record<SudokuSize, number>> = { 4: 4, 6: 9, 9: 22 };

/**
 * So viele Vorgaben über oder unter dem Ziel werden noch akzeptiert. Beim
 * 4×4 liegen die Stufen nur zwei Vorgaben auseinander, dort wäre eine grössere
 * Toleranz sinnlos: «mittel» würde sonst als «leicht» durchgehen.
 */
const GIVENS_TOLERANCE: Readonly<Record<SudokuSize, number>> = { 4: 1, 6: 2, 9: 2 };

/**
 * Entscheidet, ob ein Rätsel die gewünschte Stufe erfüllt. Massgebend ist die
 * Anzahl Vorgaben; Raten ist in keiner Stufe zulässig, und «leicht» kommt
 * zusätzlich mit blossen Singles aus.
 */
export function meetsDifficulty(
  size: SudokuSize,
  difficulty: SudokuDifficulty,
  level: RatingLevel,
  givens: number,
): boolean {
  if (level === 'expert') return false;
  const target = GIVENS_TARGET[size][difficulty];
  const tolerance = GIVENS_TOLERANCE[size];
  if (givens > target + tolerance) return false;
  if (difficulty === 'easy') return level === 'easy' && givens >= target - tolerance;
  // «Mittel» darf nicht versehentlich so leer werden wie «schwer».
  if (difficulty === 'medium') return givens >= target - tolerance;
  return true;
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
  const target = GIVENS_TARGET[size][difficulty];

  let best: SudokuPuzzle | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rng = createRng(`${String(options.seed)}:sudoku:${attempt}`);
    const solution = fillGrid(geo, rng);
    const puzzle = carve(solution, geo, difficulty, rng);
    const result = toPuzzle(puzzle, solution, geo, difficulty, options.seed);

    if (meetsDifficulty(size, difficulty, result.rating.level, result.givenCount)) return result;
    // Bestes Nebenresultat merken: nie «expert», sonst möglichst nah am Ziel.
    if (
      result.rating.level !== 'expert' &&
      (!best || Math.abs(result.givenCount - target) < Math.abs(best.givenCount - target))
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
 * Entfernt Zellen in zufälliger Reihenfolge, bis die Zielanzahl Vorgaben
 * erreicht ist. Eine Zelle bleibt nur entfernt, wenn die Lösung eindeutig
 * bleibt und kein Raten nötig wird.
 */
function carve(
  solution: readonly number[],
  geo: Geometry,
  difficulty: SudokuDifficulty,
  rng: Rng,
): number[] {
  const { size } = geo;
  const target = Math.max(GIVENS_TARGET[size][difficulty], GIVENS_MIN[size]);
  const grid = [...solution];
  let givens = grid.length;

  for (const index of rng.shuffle(Array.from({ length: grid.length }, (_, i) => i))) {
    if (givens <= target) break;

    const value = grid[index] as number;
    grid[index] = 0;
    if (countSolutions(grid, size, 2) !== 1) {
      grid[index] = value;
      continue;
    }
    // Der Technik-Solver ist teuer und wird erst nötig, wenn das Gitter dünn wird.
    if (givens - 1 <= target + 6 && solveWithTechniques(grid, size).rating.level === 'expert') {
      grid[index] = value;
      continue;
    }
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
