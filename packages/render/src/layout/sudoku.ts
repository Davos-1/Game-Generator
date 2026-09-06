import type { SudokuPuzzle } from '@raetselheft/engine';
import type { TextMeasurer } from '../fonts';
import type { ContentBox } from '../page';
import { COLORS, type Element } from '../primitives';
import { symbolForDigit, symbolPath } from '../symbols';
import { fitBox } from './box';

export interface SudokuDrawOptions {
  /** Lösung zeigen: fehlende Werte in Akzentfarbe ergänzen. */
  solution?: boolean;
  compact?: boolean;
  /**
   * Symbole statt Ziffern. Standard: bei 4×4 und 6×6 an, bei 9×9 aus
   * (neun klar unterscheidbare Formen sind für Kinder zu viel).
   */
  symbols?: boolean;
}

/** Zeichnet ein Sudoku mit dünnen Zell- und dicken Boxlinien. */
export function sudokuElements(
  puzzle: SudokuPuzzle,
  box: ContentBox,
  measurer: TextMeasurer,
  options: SudokuDrawOptions = {},
): Element[] {
  const compact = options.compact ?? false;
  const useSymbols = options.symbols ?? puzzle.size <= 6;
  const area = fitBox(box, 1);
  const cell = area.width / puzzle.size;
  const elements: Element[] = [];

  const thin = { color: COLORS.grid, width: compact ? 0.25 : 0.35 };
  const thick = { color: COLORS.ink, width: compact ? 0.5 : 0.9 };

  for (let r = 0; r <= puzzle.size; r++) {
    const y = area.y + r * cell;
    const bold = r % puzzle.boxRows === 0 || r === puzzle.size;
    elements.push({
      type: 'line',
      x1: area.x,
      y1: y,
      x2: area.x + area.width,
      y2: y,
      stroke: bold ? thick : thin,
    });
  }
  for (let c = 0; c <= puzzle.size; c++) {
    const x = area.x + c * cell;
    const bold = c % puzzle.boxCols === 0 || c === puzzle.size;
    elements.push({
      type: 'line',
      x1: x,
      y1: area.y,
      x2: x,
      y2: area.y + area.width,
      stroke: bold ? thick : thin,
    });
  }

  const digitSize = cell * 1.9;
  const capHeight = measurer.capHeight('bodyBold', digitSize);
  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      const given = puzzle.givens[r]?.[c] ?? 0;
      const value = given || (options.solution ? (puzzle.solution[r]?.[c] ?? 0) : 0);
      if (!value) continue;
      const color = given ? COLORS.ink : COLORS.solution;
      const cx = area.x + (c + 0.5) * cell;
      const cy = area.y + (r + 0.5) * cell;
      if (useSymbols) {
        elements.push({
          type: 'path',
          d: symbolPath(symbolForDigit(value), cx, cy, cell * 0.56),
          fill: color,
        });
      } else {
        elements.push({
          type: 'text',
          x: cx,
          y: cy + capHeight / 2,
          text: String(value),
          font: 'bodyBold',
          size: digitSize,
          color,
          align: 'middle',
        });
      }
    }
  }
  return elements;
}

/** Legende «Symbol = Ziffer» für die Kindervariante. */
export function sudokuLegendElements(
  puzzle: SudokuPuzzle,
  box: ContentBox,
  measurer: TextMeasurer,
): Element[] {
  const elements: Element[] = [];
  const size = 6;
  const gap = box.width / puzzle.size;
  for (let d = 1; d <= puzzle.size; d++) {
    const cx = box.x + (d - 0.5) * gap;
    elements.push({
      type: 'path',
      d: symbolPath(symbolForDigit(d), cx - 3, box.y + size / 2, size),
      fill: COLORS.ink,
    });
    elements.push({
      type: 'text',
      x: cx + 2,
      y: box.y + size / 2 + measurer.capHeight('body', 10) / 2,
      text: `= ${d}`,
      font: 'body',
      size: 10,
      color: COLORS.muted,
    });
  }
  return elements;
}
