import type {
  CrosswordPuzzle,
  DotToDotPuzzle,
  Maze,
  SudokuPuzzle,
  WordSearchPuzzle,
} from '@raetselheft/engine';
import type { TextMeasurer } from './measure';
import { grid as gridBoxes, inset } from './layout/box';
import { coverElements, COVER_BOX, type CoverInfo } from './layout/cover';
import { dotToDotElements } from './layout/dotToDot';
import { crosswordElements } from './layout/crossword';
import { mazeElements } from './layout/maze';
import { sudokuElements, sudokuLegendElements } from './layout/sudoku';
import { wordSearchElements } from './layout/wordsearch';
import {
  createPage,
  MARGIN,
  watermarkElements,
  type ContentBox,
  type PageFrameOptions,
} from './page';
import { A4, type Element, type PageLayout } from './primitives';
import { NEUTRAL_THEME, type Theme } from './themes';

/** Ein Rätsel mit seinem Typ; die Layout-Schicht kennt nur diese drei Formen. */
export type PuzzleItem =
  | { kind: 'wordsearch'; puzzle: WordSearchPuzzle }
  | { kind: 'maze'; puzzle: Maze }
  /** `symbols` überschreibt für dieses eine Rätsel die Darstellung. */
  | { kind: 'sudoku'; puzzle: SudokuPuzzle; symbols?: boolean }
  | { kind: 'dot-to-dot'; puzzle: DotToDotPuzzle }
  | { kind: 'crossword'; puzzle: CrosswordPuzzle };

export interface PuzzlePageOptions extends PageFrameOptions {
  /** Symbole statt Ziffern beim Sudoku erzwingen oder unterdrücken. */
  symbols?: boolean;
  /**
   * Volle Seite mit ausgefüllter Lösung statt leerem Rätsel. Gedacht für
   * Einzelrätsel, deren Lösung gleich gross wie das Rätsel sein soll; im Heft
   * werden Lösungen weiterhin als Kacheln zusammengefasst.
   */
  solution?: boolean;
}

interface DrawOptions {
  solution: boolean;
  compact?: boolean;
  symbols?: boolean;
  theme: Theme;
}

/** Erzeugt eine vollständige Rätselseite (A4) für ein einzelnes Rätsel. */
export function puzzlePage(
  item: PuzzleItem,
  measurer: TextMeasurer,
  options: PuzzlePageOptions,
): PageLayout {
  const { page, content, watermark } = createPage(measurer, options);
  page.elements.push(
    ...drawItem(item, content, measurer, {
      solution: options.solution ?? false,
      theme: options.theme ?? NEUTRAL_THEME,
      ...(options.symbols !== undefined ? { symbols: options.symbols } : {}),
    }),
    ...watermark,
  );
  return page;
}

export interface CoverPageOptions extends CoverInfo {
  theme?: Theme;
  /** Diagonal wiederholter Text über der Seite (Premium-Vorschau). */
  watermark?: string;
}

/** Deckblatt eines Rätselhefts. */
export function coverPage(measurer: TextMeasurer, options: CoverPageOptions): PageLayout {
  const theme = options.theme ?? NEUTRAL_THEME;
  const box = COVER_BOX(MARGIN);
  const elements = coverElements(options, box, measurer, theme);
  if (options.watermark) {
    elements.push(...watermarkElements(measurer, options.watermark, box, theme.colors.muted));
  }
  return { width: A4.width, height: A4.height, elements, label: options.title };
}

export interface BookletOptions extends CoverPageOptions {
  /** Fusszeile links auf jeder Rätselseite. */
  footerLeft?: string;
  /** Überschrift des Lösungsteils. */
  solutionsTitle: string;
}

/**
 * Stellt ein vollständiges Heft zusammen: Deckblatt, Rätselseiten in der
 * gewählten Reihenfolge, Lösungsteil hinten. Das Wasserzeichen liegt auf
 * jeder Seite (Premium-Vorschau, PLAN.md Abschnitt 4).
 */
export function bookletPages(
  entries: readonly { item: PuzzleItem; caption: string; subtitle?: string }[],
  measurer: TextMeasurer,
  options: BookletOptions,
): PageLayout[] {
  const theme = options.theme ?? NEUTRAL_THEME;
  const watermark = options.watermark;
  const pages: PageLayout[] = [coverPage(measurer, options)];

  entries.forEach((entry, index) => {
    pages.push(
      puzzlePage(entry.item, measurer, {
        theme,
        title: entry.caption,
        ...(entry.subtitle ? { subtitle: entry.subtitle } : {}),
        ...(options.footerLeft ? { footerLeft: options.footerLeft } : {}),
        footerRight: `${index + 1}`,
        ...(watermark ? { watermark } : {}),
      }),
    );
  });

  pages.push(
    ...solutionPages(entries, measurer, {
      theme,
      title: options.solutionsTitle,
      ...(options.footerLeft ? { footerLeft: options.footerLeft } : {}),
      ...(watermark ? { watermark } : {}),
    }),
  );
  return pages;
}

/**
 * Verteilt Lösungen auf möglichst wenige Seiten. Eine Seite besteht aus zwei
 * Reihen; eine Reihe zeigt entweder eine grosse Lösung (Wortsuchrätsel oder
 * 9×9-Sudoku) oder zwei kleine (Labyrinth, Kinder-Sudoku). Also 2 bis 4
 * Lösungen pro Seite.
 */
export function solutionPages(
  items: readonly { item: PuzzleItem; caption: string }[],
  measurer: TextMeasurer,
  options: PageFrameOptions,
): PageLayout[] {
  const rows: { item: PuzzleItem; caption: string }[][] = [];
  for (const entry of items) {
    const last = rows[rows.length - 1];
    if (
      needsFullRow(entry.item) ||
      !last ||
      last.length === 2 ||
      needsFullRow(last[0]?.item as PuzzleItem)
    ) {
      rows.push([entry]);
    } else {
      last.push(entry);
    }
  }

  const pages: PageLayout[] = [];
  for (let i = 0; i < rows.length; i += 2) {
    // Folgeseiten ohne Unterzeile, damit der Lösungsteil ruhig wirkt.
    const { subtitle: _subtitle, ...rest } = options;
    const { page, content, watermark } = createPage(measurer, i === 0 ? options : rest);
    const rowBoxes = gridBoxes(content, 2, 1, 8);
    rows.slice(i, i + 2).forEach((row, rowIndex) => {
      const area = rowBoxes[rowIndex];
      if (!area) return;
      const cells = row.length === 1 ? [area] : gridBoxes(area, 1, 2, 8);
      row.forEach((entry, cellIndex) => {
        const cell = cells[cellIndex];
        if (!cell) return;
        page.elements.push(...captionedTile(entry, cell, measurer, options.theme ?? NEUTRAL_THEME));
      });
    });
    page.elements.push(...watermark);
    pages.push(page);
  }
  return pages;
}

const needsFullRow = (item: PuzzleItem): boolean =>
  item.kind === 'wordsearch' ||
  item.kind === 'crossword' ||
  (item.kind === 'sudoku' && item.puzzle.size === 9);
// Punkte-zu-Punkte ist quadratisch und kompakt wie das Labyrinth: teilt sich
// eine Zeile mit einem zweiten Rätsel, statt eine ganze Zeile zu belegen.

function captionedTile(
  entry: { item: PuzzleItem; caption: string },
  box: ContentBox,
  measurer: TextMeasurer,
  theme: Theme,
): Element[] {
  const captionSize = 10;
  const capHeight = measurer.capHeight('bodyBold', captionSize);
  const elements: Element[] = [
    {
      type: 'text',
      x: box.x,
      y: box.y + capHeight,
      text: entry.caption,
      font: 'bodyBold',
      size: captionSize,
      color: theme.colors.muted,
    },
  ];
  const area: ContentBox = {
    x: box.x,
    y: box.y + capHeight + 3,
    width: box.width,
    height: box.height - capHeight - 3,
  };
  elements.push(...drawItem(entry.item, area, measurer, { solution: true, compact: true, theme }));
  return elements;
}

function drawItem(
  item: PuzzleItem,
  box: ContentBox,
  measurer: TextMeasurer,
  options: DrawOptions,
): Element[] {
  const compact = options.compact ?? false;
  const { theme } = options;
  const palette = theme.colors;
  switch (item.kind) {
    case 'wordsearch':
      return wordSearchElements(item.puzzle, box, measurer, {
        solution: options.solution,
        compact,
        showWords: !options.solution,
        palette,
      });
    case 'maze':
      return mazeElements(item.puzzle, inset(box, compact ? 2 : 6), {
        solution: options.solution,
        compact,
        palette,
        ...(theme.id === NEUTRAL_THEME.id
          ? {}
          : { icons: { start: theme.icons.mazeStart, end: theme.icons.mazeEnd } }),
      });
    case 'sudoku': {
      const useSymbols = item.symbols ?? options.symbols ?? item.puzzle.size <= 6;
      const icons = theme.sudokuIcons.length > 0 ? theme.sudokuIcons : undefined;
      const legendHeight = useSymbols && !compact ? 12 : 0;
      const gridArea: ContentBox = { ...box, height: box.height - legendHeight };
      const elements = sudokuElements(item.puzzle, gridArea, measurer, {
        solution: options.solution,
        compact,
        symbols: useSymbols,
        palette,
        ...(icons ? { icons } : {}),
      });
      if (legendHeight > 0) {
        const width = Math.min(box.width, item.puzzle.size * 18);
        elements.push(
          ...sudokuLegendElements(
            item.puzzle,
            {
              x: box.x + (box.width - width) / 2,
              y: box.y + box.height - legendHeight + 2,
              width,
              height: 8,
            },
            measurer,
            { palette, ...(icons ? { icons } : {}) },
          ),
        );
      }
      return elements;
    }
    case 'dot-to-dot':
      return dotToDotElements(item.puzzle, inset(box, compact ? 3 : 8), measurer, {
        solution: options.solution,
        compact,
        palette,
      });
    case 'crossword':
      return crosswordElements(item.puzzle, inset(box, compact ? 3 : 8), measurer, {
        solution: options.solution,
        compact,
        palette,
      });
  }
}
