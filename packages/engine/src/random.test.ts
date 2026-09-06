import { describe, expect, it } from 'vitest';
import { createRng, hashSeed } from './random';

describe('createRng', () => {
  it('liefert für denselben Seed dieselbe Sequenz', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('liefert für verschiedene Seeds verschiedene Sequenzen', () => {
    const a = createRng('piraten');
    const b = createRng('einhorn');
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('next() bleibt im Intervall [0, 1)', () => {
    const rng = createRng(1);
    for (let i = 0; i < 10_000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() deckt beide Grenzen ab und verlässt den Bereich nie', () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 5_000; i++) {
      const v = rng.int(3, 6);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
  });

  it('int() wirft bei ungültigem Bereich', () => {
    const rng = createRng(1);
    expect(() => rng.int(5, 2)).toThrow(RangeError);
    expect(() => rng.int(0.5, 2)).toThrow(RangeError);
  });

  it('shuffle() ist eine Permutation und verändert das Original nicht', () => {
    const rng = createRng('shuffle');
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = rng.shuffle(original);
    expect(original).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...shuffled].sort((x, y) => x - y)).toEqual(original);
  });

  it('pick() wirft bei leerem Array', () => {
    expect(() => createRng(1).pick([])).toThrow(RangeError);
  });
});

describe('hashSeed', () => {
  it('ist deterministisch und liefert einen 32-Bit-Wert', () => {
    expect(hashSeed('luca')).toBe(hashSeed('luca'));
    expect(hashSeed('luca')).not.toBe(hashSeed('Luca'));
    expect(hashSeed('')).toBeGreaterThanOrEqual(0);
    expect(hashSeed('x')).toBeLessThanOrEqual(0xffffffff);
  });
});
