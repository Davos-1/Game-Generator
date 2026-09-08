/**
 * Gratis-Beispiel-PDFs: je Rätseltyp und Themen-Design ein festes Blatt mit
 * Lösung. Sie sind der einzige Download ohne Zahlung — nicht personalisiert
 * und mit festem Rätsel, aber vollwertig gedruckt.
 *
 * Erzeugt werden sie von scripts/generate-examples.ts vor dem Bauen.
 */
import type { PuzzleKind } from '../lib/puzzleConfig';

export type ExampleKind = PuzzleKind;

export const EXAMPLES: readonly { kind: ExampleKind }[] = [
  { kind: 'wordsearch' },
  { kind: 'maze' },
  { kind: 'sudoku' },
  { kind: 'dot-to-dot' },
  { kind: 'shadow-match' },
];

/** Adresse des Beispiel-PDF; «neutral» ist das Standarddesign. */
export const examplePdfPath = (kind: ExampleKind, themeId: string = 'neutral'): string =>
  `/beispiele/${themeId}-${kind}.pdf`;
