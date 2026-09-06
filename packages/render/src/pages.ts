import type { Maze, SudokuPuzzle, WordSearchPuzzle } from '@raetselheft/engine';
import type { TextMeasurer } from './measure';
import { grid as gridBoxes, inset } from './layout/box';
import { mazeElements } from './layout/maze';
import { sudokuElements, sudokuLegendElements } from './layout/sudoku';
import { wordSearchElements } from './layout/wordsearch';
import { createPage, type ContentBox, type PageFrameOptions } from './page';
import { COLORS, type Element, type PageLayout } from './primitives';

/** Ein Rätsel mit seinem Typ; die Layout-Schicht kennt nur diese drei Formen. */
export type PuzzleItem =
  | { kind: 'wordsearch'; puzzle: WordSearchPuzzle }
  | { kind: 'maze'; puzzle: Maze }
  | { kind: 'sudoku'; puzzle: SudokuPuzzle };

export interface PuzzlePageOptions extends PageFrameOptions {
  /** Symbole statt Ziffern beim Sudoku erzwingen oder unterdrücken. */
  symbols?: boolean;
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
      solution: false,
      ...(options.symbols !== undefined ? { symbols: options.symbols } : {}),
    }),
    ...watermark,
  );
  return page;
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
        page.elements.push(...captionedTile(entry, cell, measurer));
      });
    });
    page.elements.push(...watermark);
    pages.push(page);
  }
  return pages;
}

const needsFullRow = (item: PuzzleItem): boolean =>
  item.kind === 'wordsearch' || (item.kind === 'sudoku' && item.puzzle.size === 9);

function captionedTile(
  entry: { item: PuzzleItem; caption: string },
  box: ContentBox,
  measurer: TextMeasurer,
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
      color: COLORS.muted,
    },
  ];
  const area: ContentBox = {
    x: box.x,
    y: box.y + capHeight + 3,
    width: box.width,
    height: box.height - capHeight - 3,
  };
  elements.push(...drawItem(entry.item, area, measurer, { solution: true, compact: true }));
  return elements;
}

function drawItem(
  item: PuzzleItem,
  box: ContentBox,
  measurer: TextMeasurer,
  options: { solution: boolean; compact?: boolean; symbols?: boolean },
): Element[] {
  const compact = options.compact ?? false;
  switch (item.kind) {
    case 'wordsearch':
      return wordSearchElements(item.puzzle, box, measurer, {
        solution: options.solution,
        compact,
        showWords: !options.solution,
      });
    case 'maze':
      return mazeElements(item.puzzle, inset(box, compact ? 2 : 6), {
        solution: options.solution,
        compact,
      });
    case 'sudoku': {
      const useSymbols = options.symbols ?? item.puzzle.size <= 6;
      const legendHeight = useSymbols && !compact ? 12 : 0;
      const gridArea: ContentBox = { ...box, height: box.height - legendHeight };
      const elements = sudokuElements(item.puzzle, gridArea, measurer, {
        solution: options.solution,
        compact,
        symbols: useSymbols,
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
          ),
        );
      }
      return elements;
    }
  }
}
