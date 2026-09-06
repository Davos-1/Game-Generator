import type { Maze } from '@raetselheft/engine';
import type { ContentBox } from '../page';
import { iconPath, type IconName } from '../icons';
import { COLORS, type Element, type Palette } from '../primitives';
import { fitBox } from './box';

export interface MazeDrawOptions {
  solution?: boolean;
  compact?: boolean;
  palette?: Palette;
  /** Icons für Eingang und Ausgang; ohne Angabe schlichte Dreiecke. */
  icons?: { start: IconName; end: IconName };
}

/**
 * Zeichnet ein Labyrinth: nur die geschlossenen Wände als Linien, bei Bedarf
 * der Lösungsweg als Linienzug durch die Zellmitten. Start und Ziel werden
 * mit «Start» und «Ziel» beschriftenden Pfeilen ergänzt (Dreiecke).
 */
export function mazeElements(
  maze: Maze,
  box: ContentBox,
  options: MazeDrawOptions = {},
): Element[] {
  const compact = options.compact ?? false;
  const palette = options.palette ?? COLORS;
  const area = fitBox(box, maze.width / maze.height);
  const cell = Math.min(area.width / maze.width, area.height / maze.height);
  const originX = area.x + (area.width - cell * maze.width) / 2;
  const originY = area.y + (area.height - cell * maze.height) / 2;
  const stroke = { color: palette.ink, width: compact ? 0.4 : 0.75, lineCap: 'square' as const };
  const elements: Element[] = [];

  const line = (x1: number, y1: number, x2: number, y2: number): void => {
    elements.push({ type: 'line', x1, y1, x2, y2, stroke });
  };

  for (let r = 0; r < maze.height; r++) {
    for (let c = 0; c < maze.width; c++) {
      const walls = maze.walls[r]?.[c];
      if (!walls) continue;
      const x = originX + c * cell;
      const y = originY + r * cell;
      // Jede Wand nur einmal zeichnen: Norden und Westen immer, Süden und
      // Osten nur am Rand (innere Wände teilen sich zwei Zellen).
      if (walls.north) line(x, y, x + cell, y);
      if (walls.west) line(x, y, x, y + cell);
      if (r === maze.height - 1 && walls.south) line(x, y + cell, x + cell, y + cell);
      if (c === maze.width - 1 && walls.east) line(x + cell, y, x + cell, y + cell);
    }
  }

  if (options.solution && maze.solution.length > 0) {
    elements.push({
      type: 'polyline',
      points: [
        [originX + (maze.start.col + 0.5) * cell, originY - cell * 0.5],
        ...maze.solution.map(
          (c) =>
            [originX + (c.col + 0.5) * cell, originY + (c.row + 0.5) * cell] as [number, number],
        ),
        [originX + (maze.end.col + 0.5) * cell, originY + maze.height * cell + cell * 0.5],
      ],
      stroke: {
        color: palette.solution,
        width: Math.max(0.4, cell * 0.22),
        lineCap: 'round',
        lineJoin: 'round',
      },
      opacity: 0.9,
    });
  }

  // Start- und Zielmarke vor dem Eingang bzw. nach dem Ausgang.
  const sx = originX + (maze.start.col + 0.5) * cell;
  const ex = originX + (maze.end.col + 0.5) * cell;
  const bottom = originY + maze.height * cell;
  const markSize = Math.max(cell * 1.4, compact ? 3 : 5);
  if (options.icons) {
    elements.push(
      {
        type: 'path',
        d: iconPath(options.icons.start, sx, originY - markSize * 0.7, markSize),
        fill: palette.accent,
      },
      {
        type: 'path',
        d: iconPath(options.icons.end, ex, bottom + markSize * 0.7, markSize),
        fill: palette.accent,
      },
    );
  } else {
    const arrow = cell * 0.34;
    elements.push(
      {
        type: 'path',
        d: `M ${sx - arrow} ${originY - cell * 0.8} L ${sx + arrow} ${originY - cell * 0.8} L ${sx} ${originY - cell * 0.15} Z`,
        fill: palette.accent,
      },
      {
        type: 'path',
        d: `M ${ex - arrow} ${bottom + cell * 0.15} L ${ex + arrow} ${bottom + cell * 0.15} L ${ex} ${bottom + cell * 0.8} Z`,
        fill: palette.accent,
      },
    );
  }
  return elements;
}
