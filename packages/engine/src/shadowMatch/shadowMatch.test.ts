import { describe, expect, it } from 'vitest';
import { generateShadowMatch } from './generate';
import { SHAPE_COUNT_BY_DIFFICULTY, type ShadowMatchDifficulty } from './types';

const DIFFICULTIES: readonly ShadowMatchDifficulty[] = ['easy', 'medium', 'hard'];

describe('generateShadowMatch', () => {
  it('ist deterministisch für denselben Seed', () => {
    const a = generateShadowMatch({ seed: 'lucas', difficulty: 'medium' });
    const b = generateShadowMatch({ seed: 'lucas', difficulty: 'medium' });
    expect(a).toEqual(b);
  });

  it('liefert bei verschiedenen Seeds nicht immer dieselbe Reihenfolge', () => {
    const orders = new Set(
      Array.from({ length: 20 }, (_, i) =>
        generateShadowMatch({ seed: `seed-${i}`, difficulty: 'hard' }).shadowOrder.join(','),
      ),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  for (const difficulty of DIFFICULTIES) {
    it(`liefert bei «${difficulty}» die vorgesehene Anzahl Formen`, () => {
      const puzzle = generateShadowMatch({ seed: `check-${difficulty}`, difficulty });
      expect(puzzle.count).toBe(SHAPE_COUNT_BY_DIFFICULTY[difficulty]);
      expect(puzzle.shadowOrder).toHaveLength(SHAPE_COUNT_BY_DIFFICULTY[difficulty]);
    });
  }

  it('ordnet jede Form in den Schatten genau einmal zu', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 20; i++) {
        const puzzle = generateShadowMatch({ seed: `permutation-${difficulty}-${i}`, difficulty });
        expect([...puzzle.shadowOrder].sort((a, b) => a - b)).toEqual(
          Array.from({ length: puzzle.count }, (_, index) => index),
        );
      }
    }
  });

  it('legt nie eine Form direkt unter ihr eigenes Original (kein Fixpunkt)', () => {
    // Sonst wäre mindestens eine Zuordnung ohne Nachdenken geschenkt.
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 30; i++) {
        const puzzle = generateShadowMatch({ seed: `fixpunkt-${difficulty}-${i}`, difficulty });
        for (const [position, shape] of puzzle.shadowOrder.entries()) {
          expect(shape, `${difficulty} Seed ${i}`).not.toBe(position);
        }
      }
    }
  });
});
