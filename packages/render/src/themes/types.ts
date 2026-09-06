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
  /** Wortliste für das Wortsuchrätsel, mindestens 30 Wörter. */
  words: string[];
}

export type ThemeInput = Omit<Theme, 'words'>;
