/**
 * Druckmodus und Auflösung der Themen-Illustrationen.
 *
 * Das Heft wird zu Hause gedruckt. Vollflächige Farbbilder sehen besser aus,
 * kosten aber spürbar Tinte — deshalb gibt es beide Wege nebeneinander:
 *
 * - «farbig»  nutzt die Rasterbilder aus `assets/themes-optimised/`
 * - «sparsam» bleibt bei den Vektor-Icons aus `icons.ts`
 *
 * Der sparsame Modus ist zugleich der Rückfallpfad: er braucht keine Assets
 * und funktioniert überall, auch wenn ein Bild fehlt oder nicht lädt.
 */
import type { Theme } from './themes';

export type PrintMode = 'farbig' | 'sparsam';

/** Rollen, die ein Theme als Illustration besetzen kann. */
export type ArtworkRole = 'cover' | 'corner' | 'mazeStart' | 'mazeEnd';

/**
 * Schlüssel des Bildes für eine Rolle, oder `undefined`, wenn statt dessen
 * das Vektor-Icon zu zeichnen ist (sparsamer Modus, neutrales Design oder
 * ein Theme ohne Illustrationen).
 */
export function artworkFor(theme: Theme, role: ArtworkRole, mode: PrintMode): string | undefined {
  if (mode !== 'farbig') return undefined;
  const name = theme.illustrations?.[role];
  return name ? `${theme.id}/${name}` : undefined;
}

/** Schlüssel der sechs Sudoku-Symbole, oder `undefined` für die Vektor-Icons. */
export function sudokuArtworkFor(theme: Theme, mode: PrintMode): string[] | undefined {
  if (mode !== 'farbig') return undefined;
  const names = theme.illustrations?.sudoku;
  return names?.length ? names.map((name) => `${theme.id}/${name}`) : undefined;
}

/** Alle Bildschlüssel eines Themes; für das Vorladen im Browser. */
export function artworkKeys(theme: Theme): string[] {
  const art = theme.illustrations;
  if (!art) return [];
  const names = [art.cover, art.corner, art.mazeStart, art.mazeEnd, ...art.sudoku];
  return [...new Set(names)].map((name) => `${theme.id}/${name}`);
}
