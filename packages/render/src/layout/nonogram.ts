import type { NonogramPuzzle } from '@raetselheft/engine';
import type { TextMeasurer } from '../measure';
import type { ContentBox } from '../page';
import { COLORS, type Element, type Palette } from '../primitives';
import { fitBox } from './box';

export interface NonogramDrawOptions {
  /** Lösung zeigen: die ausgemalten Felder des Bildes füllen. */
  solution?: boolean;
  compact?: boolean;
  palette?: Palette;
}

/** Alle fünf Felder eine kräftigere Linie — so verzählt man sich nicht. */
const GROUP = 5;

/**
 * Zeichnet ein Nonogramm: links und oben die Randzahlen, rechts unten das
 * Gitter. Die Randspalten wachsen mit der längsten Zahlenreihe, damit das
 * Gitter so gross wie möglich bleibt.
 */
export function nonogramElements(
  puzzle: NonogramPuzzle,
  box: ContentBox,
  measurer: TextMeasurer,
  options: NonogramDrawOptions = {},
): Element[] {
  const compact = options.compact ?? false;
  const palette = options.palette ?? COLORS;

  // Eine leere Zeile wird als «0» angeschrieben; die Engine liefert dafür
  // eine leere Liste.
  const rowClues = puzzle.rowClues.map((clue) => (clue.length > 0 ? [...clue] : [0]));
  const columnClues = puzzle.columnClues.map((clue) => (clue.length > 0 ? [...clue] : [0]));
  const leftCells = Math.max(...rowClues.map((clue) => clue.length));
  const topCells = Math.max(...columnClues.map((clue) => clue.length));

  // Das Ganze bleibt ein Raster aus gleich grossen Feldern: Randzahlen sitzen
  // in genau so breiten Spalten wie die Rätselfelder selbst.
  const columns = leftCells + puzzle.width;
  const rows = topCells + puzzle.height;
  const area = fitBox(box, columns / rows);
  const cell = area.width / columns;
  const gridX = area.x + leftCells * cell;
  const gridY = area.y + topCells * cell;
  const gridWidth = puzzle.width * cell;
  const gridHeight = puzzle.height * cell;

  const elements: Element[] = [];

  if (options.solution) {
    for (let row = 0; row < puzzle.height; row++) {
      for (let col = 0; col < puzzle.width; col++) {
        if (!puzzle.solution[row * puzzle.width + col]) continue;
        elements.push({
          type: 'rect',
          x: gridX + col * cell,
          y: gridY + row * cell,
          width: cell,
          height: cell,
          fill: palette.solution,
        });
      }
    }
  }

  const thin = { color: palette.grid, width: compact ? 0.25 : 0.3 };
  const thick = { color: palette.ink, width: compact ? 0.45 : 0.7 };
  const isGroupLine = (index: number, total: number): boolean =>
    index % GROUP === 0 || index === total;

  for (let row = 0; row <= puzzle.height; row++) {
    const y = gridY + row * cell;
    const bold = isGroupLine(row, puzzle.height);
    elements.push({
      type: 'line',
      // Die kräftigen Linien ziehen sich durch die Randzahlen hindurch, damit
      // sich Zahl und Zeile auch bei grossen Gittern zuordnen lassen.
      x1: bold ? area.x : gridX,
      y1: y,
      x2: gridX + gridWidth,
      y2: y,
      stroke: bold ? thick : thin,
    });
  }
  for (let col = 0; col <= puzzle.width; col++) {
    const x = gridX + col * cell;
    const bold = isGroupLine(col, puzzle.width);
    elements.push({
      type: 'line',
      x1: x,
      y1: bold ? area.y : gridY,
      x2: x,
      y2: gridY + gridHeight,
      stroke: bold ? thick : thin,
    });
  }

  // Schriftgrösse an der Feldgrösse: knapp zwei Drittel, damit auch eine
  // zweistellige Zahl im Feld bleibt.
  const size = cell * 1.5;
  const capHeight = measurer.capHeight('body', size);

  rowClues.forEach((clue, row) => {
    const cy = gridY + (row + 0.5) * cell + capHeight / 2;
    clue.forEach((value, index) => {
      // Rechtsbündig ans Gitter: die letzte Zahl steht direkt daneben.
      const slot = leftCells - clue.length + index;
      elements.push({
        type: 'text',
        x: area.x + (slot + 0.5) * cell,
        y: cy,
        text: String(value),
        font: 'body',
        size,
        color: palette.ink,
        align: 'middle',
      });
    });
  });

  columnClues.forEach((clue, col) => {
    const cx = gridX + (col + 0.5) * cell;
    clue.forEach((value, index) => {
      // Unten bündig ans Gitter: die letzte Zahl steht direkt darüber.
      const slot = topCells - clue.length + index;
      elements.push({
        type: 'text',
        x: cx,
        y: area.y + (slot + 0.5) * cell + capHeight / 2,
        text: String(value),
        font: 'body',
        size,
        color: palette.ink,
        align: 'middle',
      });
    });
  });

  return elements;
}
