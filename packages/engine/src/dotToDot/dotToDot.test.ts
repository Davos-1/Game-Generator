import { describe, expect, it } from 'vitest';
import { generateDotToDot } from './generate';
import { SHAPE_IDS } from './shapes';
import { POINT_COUNT_BY_DIFFICULTY, type DotToDotDifficulty } from './types';

const DIFFICULTIES: readonly DotToDotDifficulty[] = ['easy', 'medium', 'hard'];

/** Kürzester Abstand zwischen zwei verschiedenen Punkten. */
function minPairDistance(points: readonly { x: number; y: number }[]): number {
  let min = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i] as { x: number; y: number };
      const b = points[j] as { x: number; y: number };
      min = Math.min(min, Math.hypot(a.x - b.x, a.y - b.y));
    }
  }
  return min;
}

describe('generateDotToDot', () => {
  it('ist deterministisch für denselben Seed', () => {
    const a = generateDotToDot({ seed: 'lucas', difficulty: 'medium' });
    const b = generateDotToDot({ seed: 'lucas', difficulty: 'medium' });
    expect(a).toEqual(b);
  });

  it('wählt bei verschiedenen Seeds nicht immer dieselbe Form', () => {
    const shapes = new Set(
      Array.from({ length: 20 }, (_, i) => generateDotToDot({ seed: `seed-${i}` }).shapeId),
    );
    expect(shapes.size).toBeGreaterThan(1);
  });

  it('respektiert eine fest vorgegebene Form', () => {
    const puzzle = generateDotToDot({ seed: 'irgendein-seed', shapeId: 'stern' });
    expect(puzzle.shapeId).toBe('stern');
  });

  it('lehnt eine unbekannte Form ab', () => {
    expect(() => generateDotToDot({ seed: 'x', shapeId: 'unbekannt' })).toThrow(RangeError);
  });

  for (const difficulty of DIFFICULTIES) {
    it(`liefert bei «${difficulty}» die vorgesehene Punktanzahl für jede Form`, () => {
      for (const shapeId of SHAPE_IDS) {
        const puzzle = generateDotToDot({ seed: `check-${shapeId}`, difficulty, shapeId });
        expect(puzzle.points.length).toBe(POINT_COUNT_BY_DIFFICULTY[difficulty]);
      }
    });
  }

  it('nummeriert die Punkte lückenlos aufsteigend ab 1', () => {
    const puzzle = generateDotToDot({ seed: 'nummern', difficulty: 'hard' });
    expect(puzzle.points.map((point) => point.label)).toEqual(
      Array.from({ length: puzzle.points.length }, (_, i) => i + 1),
    );
  });

  it('hält alle Punkte innerhalb des 0–100-Felds', () => {
    for (const shapeId of SHAPE_IDS) {
      const puzzle = generateDotToDot({ seed: `rand-${shapeId}`, difficulty: 'hard', shapeId });
      for (const point of puzzle.points) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(100);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(100);
      }
    }
  });

  // Kritisch fürs Drucken: bei jeder Form und Stufe müssen sich die Nummern
  // beim Ausdrucken nicht berühren. 3 Einheiten auf dem 0–100-Feld entsprechen
  // bei A4-Grösse rund 5 mm, genug Platz für eine zweistellige Nummer.
  for (const difficulty of DIFFICULTIES) {
    it(`hält bei «${difficulty}» für jede Form genug Abstand zwischen den Punkten`, () => {
      for (const shapeId of SHAPE_IDS) {
        const puzzle = generateDotToDot({ seed: `abstand-${shapeId}`, difficulty, shapeId });
        const min = minPairDistance(puzzle.points);
        expect(min, `${shapeId}/${difficulty}: ${min.toFixed(2)}`).toBeGreaterThanOrEqual(3);
      }
    });
  }

  it('gibt bei mehr Punkten (höhere Stufe) einen kleineren Punktabstand', () => {
    for (const shapeId of SHAPE_IDS) {
      const easy = generateDotToDot({ seed: 'stufen', difficulty: 'easy', shapeId });
      const hard = generateDotToDot({ seed: 'stufen', difficulty: 'hard', shapeId });
      expect(minPairDistance(hard.points)).toBeLessThan(minPairDistance(easy.points));
    }
  });
});
