/**
 * Beispielbilder für die Landing-Pages, erzeugt beim Bauen der Website.
 *
 * Die Textmessung läuft über dieselbe Metrik-Tabelle wie im Browser, also ohne
 * Dateizugriff: das überlebt das Bündeln durch den Bauprozess. So bekommt jede
 * Seite ein echtes, zum Thema passendes Rätselbild, ohne dass der Besucher
 * dafür Javascript ausführen muss.
 */
import {
  generateCrossword,
  generateDotToDot,
  generateMaze,
  generateNonogram,
  generateSudoku,
  generateWordSearch,
} from '@raetselheft/engine';
import { createMetricsMeasurer, type TextMeasurer } from '@raetselheft/render/measure';
import metrics from '@raetselheft/render/metrics.json';
import { crosswordElements } from '@raetselheft/render/layout/crossword';
import { dotToDotElements } from '@raetselheft/render/layout/dotToDot';
import { mazeElements } from '@raetselheft/render/layout/maze';
import { nonogramElements } from '@raetselheft/render/layout/nonogram';
import { sudokuElements } from '@raetselheft/render/layout/sudoku';
import { wordSearchElements } from '@raetselheft/render/layout/wordsearch';
import { elementToSvg } from '@raetselheft/render/svg';
import { themeById } from '@raetselheft/render/themes';
import { crosswordEntriesFor } from '@raetselheft/render/themes/crosswordEntries';
import type { PuzzleKind } from './puzzleConfig';
import { FONT_URLS } from './render';

const BOX = { x: 0, y: 0, width: 100, height: 100 };

let measurer: TextMeasurer | undefined;

const getMeasurer = (): TextMeasurer => (measurer ??= createMetricsMeasurer(metrics));

/**
 * Kleines Vorschaubild eines Rätsels als eigenständiges SVG (quadratisch,
 * ohne Seitenrahmen). Die Schriften werden über @font-face eingebunden.
 */
export function previewSvg(kind: PuzzleKind, themeId: string, seed: string): string {
  const measurer = getMeasurer();
  const theme = themeById(themeId);
  const palette = theme.colors;

  const elements = (() => {
    switch (kind) {
      case 'wordsearch':
        return wordSearchElements(
          generateWordSearch({
            words: theme.words.slice(0, 8),
            seed,
            width: 10,
            difficulty: 'medium',
          }),
          BOX,
          measurer,
          { palette, showWords: false },
        );
      case 'maze':
        return mazeElements(generateMaze({ seed, width: 12, height: 12 }), BOX, {
          palette,
          compact: true,
          ...(theme.id === 'neutral'
            ? {}
            : { icons: { start: theme.icons.mazeStart, end: theme.icons.mazeEnd } }),
        });
      case 'sudoku':
        return sudokuElements(
          generateSudoku({ seed, size: 6, difficulty: 'easy' }),
          BOX,
          measurer,
          {
            palette,
            ...(theme.sudokuIcons.length > 0 ? { icons: theme.sudokuIcons } : {}),
          },
        );
      case 'dot-to-dot':
        return dotToDotElements(generateDotToDot({ seed, difficulty: 'medium' }), BOX, measurer, {
          palette,
        });
      case 'nonogram':
        // Kleines Gitter: In der Vorschaukachel bliebe ein 15×15 unleserlich.
        return nonogramElements(generateNonogram({ seed, difficulty: 'easy' }), BOX, measurer, {
          palette,
        });
      case 'crossword':
        return crosswordElements(
          generateCrossword({ seed, entries: crosswordEntriesFor(theme.id), difficulty: 'easy' }),
          BOX,
          measurer,
          { palette, compact: true },
        );
    }
  })();

  const faces = (['display', 'body', 'bodyBold'] as const)
    .map(
      (font) =>
        `@font-face{font-family:'${font === 'display' ? 'Nunito' : 'Inter'}';font-weight:${
          font === 'display' ? 700 : font === 'bodyBold' ? 600 : 400
        };src:url('${FONT_URLS[font]}') format('truetype');}`,
    )
    .join('');

  // Das Labyrinth trägt Start- und Zielmarke ausserhalb des Gitters; ohne
  // zusätzlichen Rand würden sie abgeschnitten.
  const viewBox = kind === 'maze' ? '-10 -14 120 128' : '-4 -6 108 112';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" class="h-auto w-full">`,
    `<style>${faces}text{font-kerning:none;font-variant-ligatures:none;}</style>`,
    elements.map(elementToSvg).join(''),
    '</svg>',
  ].join('');
}
