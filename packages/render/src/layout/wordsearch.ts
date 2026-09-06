import type { WordSearchPuzzle } from '@raetselheft/engine';
import type { TextMeasurer } from '../measure';
import type { ContentBox } from '../page';
import { COLORS, type Element, type Mm, type Palette } from '../primitives';
import { fitBox } from './box';

export interface WordSearchDrawOptions {
  /** Farbwelt; ohne Angabe das neutrale Standarddesign. */
  palette?: Palette;
  /** Lösung einzeichnen (Wörter umranden). */
  solution?: boolean;
  /** Wortliste unter dem Gitter zeigen. Standard true. */
  showWords?: boolean;
  /** Kleinere Schrift und dünnere Linien für Lösungskacheln. */
  compact?: boolean;
}

/**
 * Zeichnet ein Wortsuchrätsel in die Box: quadratisches Buchstabengitter,
 * darunter die Wortliste in Spalten. Bei `solution` werden die platzierten
 * Wörter mit einer Kapsel (abgerundete Linie) markiert.
 */
export function wordSearchElements(
  puzzle: WordSearchPuzzle,
  box: ContentBox,
  measurer: TextMeasurer,
  options: WordSearchDrawOptions = {},
): Element[] {
  const showWords = options.showWords ?? true;
  const compact = options.compact ?? false;
  const palette = options.palette ?? COLORS;
  const elements: Element[] = [];

  const wordsHeight = showWords ? wordListHeight(puzzle, box.width, compact) : 0;
  const gridArea: ContentBox = {
    x: box.x,
    y: box.y,
    width: box.width,
    height: Math.max(10, box.height - wordsHeight),
  };
  const gridBox = fitBox(gridArea, puzzle.width / puzzle.height);
  const cell = gridBox.width / puzzle.width;
  const lineWidth = compact ? 0.3 : 0.4;

  // Gitterlinien
  for (let r = 0; r <= puzzle.height; r++) {
    const y = gridBox.y + r * cell;
    elements.push({
      type: 'line',
      x1: gridBox.x,
      y1: y,
      x2: gridBox.x + gridBox.width,
      y2: y,
      stroke: { color: palette.grid, width: lineWidth },
    });
  }
  for (let c = 0; c <= puzzle.width; c++) {
    const x = gridBox.x + c * cell;
    elements.push({
      type: 'line',
      x1: x,
      y1: gridBox.y,
      x2: x,
      y2: gridBox.y + cell * puzzle.height,
      stroke: { color: palette.grid, width: lineWidth },
    });
  }

  // Lösungskapseln vor die Buchstaben zeichnen, damit die Schrift oben liegt.
  if (options.solution) {
    for (const placed of puzzle.placed) {
      const first = placed.cells[0];
      const last = placed.cells[placed.cells.length - 1];
      if (!first || !last) continue;
      elements.push({
        type: 'line',
        x1: gridBox.x + (first.col + 0.5) * cell,
        y1: gridBox.y + (first.row + 0.5) * cell,
        x2: gridBox.x + (last.col + 0.5) * cell,
        y2: gridBox.y + (last.row + 0.5) * cell,
        stroke: {
          color: palette.solution,
          width: cell * 0.82,
          lineCap: 'round',
        },
        opacity: 0.25,
      });
    }
  }

  // Buchstaben
  const letterSize = cell * 2.05; // pt, ergibt rund 72 % Zellhöhe
  puzzle.grid.forEach((row, r) => {
    row.forEach((letter, c) => {
      elements.push({
        type: 'text',
        x: gridBox.x + (c + 0.5) * cell,
        y: gridBox.y + (r + 0.5) * cell + measurer.capHeight('bodyBold', letterSize) / 2,
        text: letter,
        font: 'bodyBold',
        size: letterSize,
        color: palette.ink,
        align: 'middle',
      });
    });
  });

  if (showWords) {
    elements.push(
      ...wordListElements(
        puzzle,
        { ...box, y: gridBox.y + cell * puzzle.height + 6 },
        measurer,
        compact,
        palette,
      ),
    );
  }
  return elements;
}

const wordListColumns = (count: number): number => (count <= 8 ? 2 : count <= 18 ? 3 : 4);

function wordListHeight(puzzle: WordSearchPuzzle, _width: Mm, compact: boolean): Mm {
  const rows = Math.ceil(puzzle.placed.length / wordListColumns(puzzle.placed.length));
  return rows * (compact ? 4 : 5.5) + 8;
}

function wordListElements(
  puzzle: WordSearchPuzzle,
  box: ContentBox,
  measurer: TextMeasurer,
  compact: boolean,
  palette: Palette,
): Element[] {
  const words = puzzle.placed.map((p) => p.word);
  const cols = wordListColumns(words.length);
  const size = compact ? 8 : 10;
  const lineHeight = compact ? 4 : 5.5;
  const colWidth = box.width / cols;
  const capHeight = measurer.capHeight('body', size);
  return words.map((word, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      type: 'text',
      x: box.x + col * colWidth,
      y: box.y + capHeight + row * lineHeight,
      text: word,
      font: 'body',
      size,
      color: palette.ink,
    };
  });
}
