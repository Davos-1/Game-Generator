import type { IconName } from '../icons';
import type { Palette } from '../primitives';

/**
 * Ein Theme bündelt alles, was ein Rätsel optisch und inhaltlich prägt:
 * Farbwelt, Deko-Icons und eine Wortliste. Themes sind reine Daten (JSON),
 * ein neues Theme braucht keine Änderung an der Layout-Logik.
 */
export interface Theme {
  id: string;
  /** Anzeigename, z. B. «Piraten». */
  name: string;
  colors: Palette & {
    /** Farbe der Ecken-Deko; meist heller als der Akzent. */
    decor: string;
  };
  /**
   * Eckenradius der Zierrahmen in Millimetern. 0 ergibt rechtwinklige Ecken
   * (Hochzeit), grössere Werte wirken verspielter (Einhörner).
   */
  frameRadiusMm: number;
  icons: {
    /** Ecken-Deko auf jeder Seite. */
    corner: IconName;
    /** Grosses Motiv, z. B. für das Deckblatt (AP7). */
    cover: IconName;
    /** Markierung beim Labyrinth-Eingang. */
    mazeStart: IconName;
    /** Markierung beim Labyrinth-Ausgang. */
    mazeEnd: IconName;
  };
  /** Symbole für das Kinder-Sudoku (4×4 und 6×6); mindestens sechs. */
  sudokuIcons: IconName[];
  /**
   * Vollfarbige Illustrationen als Gegenstück zu `icons` und `sudokuIcons`.
   * Beide Sätze stehen bewusst nebeneinander: der Druckmodus «farbig» nutzt
   * die Bilder, «sparsam» bleibt bei den Vektor-Icons (PLAN.md 6.1). Die
   * Namen beziehen sich auf Dateien in `assets/themes-optimised/*<Theme>/`.
   * Ohne Angabe kennt ein Theme nur die Vektor-Variante.
   */
  illustrations?: Illustrations;
  /** Wortliste für das Wortsuchrätsel, mindestens 30 Wörter. */
  words: string[];
}

/** Dateinamen der Illustrationen eines Themes, ohne Endung und Ordner. */
export interface Illustrations {
  /** Grosses Motiv fürs Deckblatt. */
  cover: string;
  /** Ecken-Deko auf jeder Seite. */
  corner: string;
  /** Markierung beim Labyrinth-Eingang. */
  mazeStart: string;
  /** Markierung beim Labyrinth-Ausgang. */
  mazeEnd: string;
  /** Symbole fürs Kinder-Sudoku; genau sechs, klar unterscheidbar. */
  sudoku: string[];
}

export type ThemeInput = Omit<Theme, 'words'>;
