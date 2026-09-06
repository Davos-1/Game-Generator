/** Gittergrösse: 4×4 und 6×6 sind Kindervarianten (mit Symbolen im Rendering), 9×9 klassisch. */
export type SudokuSize = 4 | 6 | 9;

export type SudokuDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Lösungstechniken, aufsteigend nach Schwierigkeit. Das Rating eines Rätsels
 * ist die schwerste Technik, die der Technik-Solver zum Lösen braucht.
 * «guess» bedeutet: mit diesen Techniken nicht lösbar, es müsste geraten werden.
 */
export type Technique =
  | 'naked-single'
  | 'hidden-single'
  | 'naked-pair'
  | 'box-line'
  | 'hidden-pair'
  | 'naked-triple'
  | 'x-wing'
  | 'guess';

export type RatingLevel = SudokuDifficulty | 'expert';

export interface SudokuRating {
  level: RatingLevel;
  hardestTechnique: Technique;
  /** Welche Techniken beim Lösen mindestens einmal nötig waren. */
  techniques: readonly Technique[];
}

export interface SudokuOptions {
  seed: string | number;
  /** Standard 9. */
  size?: SudokuSize;
  /** Standard «easy». */
  difficulty?: SudokuDifficulty;
  /** Wie viele Rätsel mit abgeleitetem Seed probiert werden, bis das Rating passt. Standard 40. */
  maxAttempts?: number;
}

export interface SudokuPuzzle {
  size: SudokuSize;
  /** Zeilen pro Box (4: 2, 6: 2, 9: 3). */
  boxRows: number;
  /** Spalten pro Box (4: 2, 6: 3, 9: 3). */
  boxCols: number;
  /** givens[row][col], 0 = leer. */
  givens: readonly (readonly number[])[];
  solution: readonly (readonly number[])[];
  givenCount: number;
  /**
   * Gewünschte Stufe. Bei 9×9 über Techniken definiert (leicht: Singles, mittel: Paare/
   * Box-Line, schwer: schwere Techniken oder Paar-Techniken mit wenigen Vorgaben), bei
   * 4×4 und 6×6 über die Anzahl Vorgaben. Siehe meetsDifficulty().
   */
  difficulty: SudokuDifficulty;
  /** Technik-Rating des Rätsels; unabhängig von der Stufe immer ehrlich befüllt. */
  rating: SudokuRating;
  seed: string | number;
}
