import type { ShadowMatchPuzzle } from '@raetselheft/engine';
import type { ContentBox } from '../page';
import { iconPath, type IconName } from '../icons';
import { COLORS, type Element, type Palette } from '../primitives';
import { symbolForDigit, symbolPath } from '../symbols';
import { grid } from './box';

export interface ShadowMatchDrawOptions {
  /** Lösung zeigen: Verbindungslinien zwischen Original und Schatten. */
  solution?: boolean;
  compact?: boolean;
  palette?: Palette;
  /** Themen-Icons statt der geometrischen Standardsymbole. */
  icons?: readonly IconName[];
}

const shapePath = (
  shapeId: number,
  cx: number,
  cy: number,
  size: number,
  icons?: readonly IconName[],
): string => {
  const icon = icons?.[shapeId];
  return icon
    ? iconPath(icon, cx, cy, size)
    : symbolPath(symbolForDigit(shapeId + 1), cx, cy, size);
};

/**
 * Zeichnet ein Schattenrätsel: oben die Formen in fester Reihenfolge, unten
 * dieselben Formen als «Schatten» durcheinandergewürfelt. In der Lösung
 * verbindet eine Linie jede Form mit ihrem Schatten.
 */
export function shadowMatchElements(
  puzzle: ShadowMatchPuzzle,
  box: ContentBox,
  options: ShadowMatchDrawOptions = {},
): Element[] {
  const compact = options.compact ?? false;
  const palette = options.palette ?? COLORS;
  const gapX = compact ? 4 : 8;

  // Zellen bewusst quadratisch statt die ganze Boxhöhe zu füllen: sonst
  // läge zwischen den beiden Reihen ein unnötig grosser Leerraum, gerade
  // auf hohen Seiten mit wenig Inhalt.
  const cellWidth = (box.width - gapX * (puzzle.count - 1)) / puzzle.count;
  const rowGap = cellWidth * (compact ? 0.4 : 0.7);
  const rowHeight = Math.min(cellWidth, (box.height - rowGap) / 2);
  const blockHeight = rowHeight * 2 + rowGap;
  const blockY = box.y + (box.height - blockHeight) / 2;
  const topRow: ContentBox = { x: box.x, y: blockY, width: box.width, height: rowHeight };
  const bottomRow: ContentBox = {
    x: box.x,
    y: blockY + rowHeight + rowGap,
    width: box.width,
    height: rowHeight,
  };
  const topCells = grid(topRow, 1, puzzle.count, gapX);
  const bottomCells = grid(bottomRow, 1, puzzle.count, gapX);

  const size = Math.min(cellWidth, rowHeight) * 0.7;
  const elements: Element[] = [];

  // Position im Schattenstreifen für jede Form: die Umkehrung von shadowOrder.
  const bottomPositionOf: number[] = [];
  puzzle.shadowOrder.forEach((shapeId, position) => {
    bottomPositionOf[shapeId] = position;
  });

  for (let shapeId = 0; shapeId < puzzle.count; shapeId++) {
    const top = topCells[shapeId];
    if (!top) continue;
    elements.push({
      type: 'path',
      d: shapePath(shapeId, top.x + top.width / 2, top.y + top.height / 2, size, options.icons),
      fill: palette.accent,
    });
  }

  puzzle.shadowOrder.forEach((shapeId, position) => {
    const bottom = bottomCells[position];
    if (!bottom) return;
    elements.push({
      type: 'path',
      d: shapePath(
        shapeId,
        bottom.x + bottom.width / 2,
        bottom.y + bottom.height / 2,
        size,
        options.icons,
      ),
      fill: palette.ink,
    });
  });

  if (options.solution) {
    for (let shapeId = 0; shapeId < puzzle.count; shapeId++) {
      const top = topCells[shapeId];
      const bottom = bottomCells[bottomPositionOf[shapeId] as number];
      if (!top || !bottom) continue;
      elements.push({
        type: 'line',
        x1: top.x + top.width / 2,
        y1: top.y + top.height / 2 + size / 2,
        x2: bottom.x + bottom.width / 2,
        y2: bottom.y + bottom.height / 2 - size / 2,
        stroke: {
          color: palette.solution,
          width: Math.max(0.4, size * 0.08),
          lineCap: 'round',
        },
        opacity: 0.85,
      });
    }
  }

  return elements;
}
