import type { DotToDotPuzzle } from '@raetselheft/engine';
import type { TextMeasurer } from '../measure';
import type { ContentBox } from '../page';
import { COLORS, MM_PER_PT, type Element, type Palette } from '../primitives';
import { fitBox } from './box';

export interface DotToDotDrawOptions {
  /** Lösung zeigen: Punkte durch den Umriss verbunden. */
  solution?: boolean;
  compact?: boolean;
  palette?: Palette;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * Zeichnet ein Punkte-zu-Punkte-Rätsel: nummerierte Punkte ohne Linien; in
 * der Lösung zusätzlich der Umriss, der beim Verbinden entsteht.
 *
 * Punkt- und Nummerngrösse richten sich nach der Punktzahl (nicht nach
 * `compact`, das ergibt sich bereits aus der kleineren Box): je dichter eine
 * Form gepunktet ist (Stufe «schwer»), desto kleiner müssen Punkt und
 * Nummer sein, damit sich zwei benachbarte Nummern nicht berühren.
 */
export function dotToDotElements(
  puzzle: DotToDotPuzzle,
  box: ContentBox,
  measurer: TextMeasurer,
  options: DotToDotDrawOptions = {},
): Element[] {
  const palette = options.palette ?? COLORS;
  // Die Formen sind auf einem 0–100-Quadrat entworfen (siehe engine/dotToDot/shapes.ts).
  const area = fitBox(box, 1);
  const scale = area.width / 100;
  const count = puzzle.points.length;

  const dotRadius = clamp(1.6 - 0.018 * count, 0.55, 1.6) * scale;
  // Zielgrösse der Nummer in mm, abhängig von Punktdichte und verfügbarem
  // Platz; anschliessend in die «size»-Grösse (pt) umgerechnet, wie es auch
  // die anderen Layouts halten (vgl. Sudoku-Ziffern). Nach unten mit 6 pt
  // begrenzt, dem generellen Minimum fürs Drucken (siehe print.test.ts).
  const labelSizeMm = clamp(3.6 - 0.035 * count, 1.6, 3.6) * scale;
  const labelSize = clamp(labelSizeMm / MM_PER_PT, 6, 32);
  const labelGap = dotRadius + measurer.width('0', 'bodyBold', labelSize) * 0.7;
  const capHeight = measurer.capHeight('bodyBold', labelSize);

  const toMm = (point: { x: number; y: number }): [number, number] => [
    area.x + point.x * scale,
    area.y + point.y * scale,
  ];

  const centroid = puzzle.points.reduce(
    (sum, point) => ({ x: sum.x + point.x / count, y: sum.y + point.y / count }),
    { x: 0, y: 0 },
  );
  const [centroidX, centroidY] = toMm(centroid);

  const elements: Element[] = [];

  if (options.solution) {
    const linePoints = puzzle.points.map((point) => toMm(point));
    if (puzzle.closed && linePoints[0]) linePoints.push(linePoints[0]);
    elements.push({
      type: 'polyline',
      points: linePoints,
      stroke: {
        color: palette.solution,
        width: Math.max(0.4, dotRadius * 0.6),
        lineCap: 'round',
        lineJoin: 'round',
      },
      opacity: 0.9,
    });
  }

  for (const point of puzzle.points) {
    const [cx, cy] = toMm(point);
    elements.push({ type: 'circle', cx, cy, r: dotRadius, fill: palette.ink });

    // Die Nummer sitzt ausserhalb des Punkts, radial vom Formmittelpunkt
    // weg versetzt, damit sie nicht in der Fläche liegt, die die Linien
    // später durchqueren.
    const dx = cx - centroidX;
    const dy = cy - centroidY;
    const len = Math.hypot(dx, dy) || 1;
    const lx = cx + (dx / len) * labelGap;
    const ly = cy + (dy / len) * labelGap;

    elements.push({
      type: 'text',
      x: lx,
      y: ly + capHeight / 2,
      text: String(point.label),
      font: 'bodyBold',
      size: labelSize,
      color: palette.ink,
      align: 'middle',
    });
  }

  return elements;
}
