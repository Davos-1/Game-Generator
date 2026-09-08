/**
 * Schattenrätsel: Symbole in fester Reihenfolge oben, ihre Schatten in
 * durcheinandergewürfelter Reihenfolge unten. Gelöst wird durch Verbinden
 * jedes Symbols mit seinem Schatten.
 *
 * Welche Formen das konkret sind (Themen-Icons oder die neutralen
 * Standardsymbole), entscheidet die Render-Schicht – die Engine kennt nur
 * abstrakte Positionen 0..count-1, genau wie beim Sudoku die Ziffern.
 */

export type ShadowMatchDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Anzahl Formen pro Stufe. Nach oben begrenzt durch sechs: so viele
 * unterscheidbare Symbole stellt jedes Theme bereit (siehe
 * `Theme.sudokuIcons`, dieselbe Grenze gilt dort fürs Kinder-Sudoku).
 */
export const SHAPE_COUNT_BY_DIFFICULTY: Readonly<Record<ShadowMatchDifficulty, number>> = {
  easy: 4,
  medium: 5,
  hard: 6,
};

export interface ShadowMatchOptions {
  /** Seed für reproduzierbare Ergebnisse. */
  seed: string | number;
  /** Bestimmt die Anzahl Formen. Standard «medium». */
  difficulty?: ShadowMatchDifficulty;
}

export interface ShadowMatchPuzzle {
  difficulty: ShadowMatchDifficulty;
  count: number;
  /**
   * Reihenfolge der Schatten unten, als Kennung 0..count-1 der Form, die
   * oben an derselben Stelle steht. Eine Ableitung ohne Fixpunkte: keine
   * Form liegt zufällig direkt unter sich selbst, sonst wäre eine Zuordnung
   * geschenkt.
   */
  shadowOrder: readonly number[];
  seed: string | number;
}
