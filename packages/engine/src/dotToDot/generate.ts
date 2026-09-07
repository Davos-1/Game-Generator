import { createRng } from '../random';
import { SHAPE_IDS, shapeById } from './shapes';
import { POINT_COUNT_BY_DIFFICULTY, type DotToDotOptions, type DotToDotPuzzle } from './types';

/**
 * Verteilt `count` Punkte in gleichem Bogenabstand entlang eines
 * geschlossenen Polygons. Funktioniert unabhängig davon, wie viele
 * Eckpunkte die Ausgangsform hat: eine grobe Form lässt sich so auf viele
 * Punkte «aufblasen», eine feine Form auf wenige Punkte reduzieren.
 */
function resampleClosedPolygon(
  vertices: readonly (readonly [number, number])[],
  count: number,
): [number, number][] {
  const n = vertices.length;
  const edgeLengths = vertices.map((vertex, i) => {
    const next = vertices[(i + 1) % n] as readonly [number, number];
    return Math.hypot(next[0] - vertex[0], next[1] - vertex[1]);
  });
  const perimeter = edgeLengths.reduce((sum, length) => sum + length, 0);
  const step = perimeter / count;

  const points: [number, number][] = [];
  let edge = 0;
  let coveredBeforeEdge = 0;
  for (let k = 0; k < count; k++) {
    const target = k * step;
    while (edge < n - 1 && coveredBeforeEdge + (edgeLengths[edge] as number) < target) {
      coveredBeforeEdge += edgeLengths[edge] as number;
      edge++;
    }
    const a = vertices[edge] as readonly [number, number];
    const b = vertices[(edge + 1) % n] as readonly [number, number];
    const edgeLength = edgeLengths[edge] as number;
    const t = edgeLength > 0 ? (target - coveredBeforeEdge) / edgeLength : 0;
    points.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return points;
}

/**
 * Erzeugt ein Punkte-zu-Punkte-Rätsel: eine Form wird (sofern nicht fest
 * vorgegeben) per Seed ausgewählt und auf die zur Schwierigkeit passende
 * Punktanzahl umgerechnet. Deterministisch pro Seed und Optionen.
 */
export function generateDotToDot(options: DotToDotOptions): DotToDotPuzzle {
  const difficulty = options.difficulty ?? 'medium';
  const rng = createRng(`${String(options.seed)}:dot-to-dot`);
  const shapeId = options.shapeId ?? rng.pick(SHAPE_IDS);
  const shape = shapeById(shapeId);
  const count = POINT_COUNT_BY_DIFFICULTY[difficulty];
  const positions = resampleClosedPolygon(shape.vertices, count);

  return {
    shapeId: shape.id,
    difficulty,
    points: positions.map(([x, y], i) => ({ x, y, label: i + 1 })),
    closed: true,
    seed: options.seed,
  };
}
