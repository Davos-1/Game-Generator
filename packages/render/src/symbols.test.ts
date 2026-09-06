import { describe, expect, it } from 'vitest';
import { SYMBOL_ORDER, symbolForDigit, symbolPath, type SymbolName } from './symbols';

/** Zerlegt einen Pfad-String in seine Zahlen-Koordinatenpaare (x, y). */
function extractPoints(path: string): Array<[number, number]> {
  const numbers = (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  expect(numbers.length % 2).toBe(0);
  const points: Array<[number, number]> = [];
  for (let i = 0; i < numbers.length; i += 2) {
    const x = numbers[i];
    const y = numbers[i + 1];
    if (x === undefined || y === undefined) {
      throw new Error('unerwartete Zahlen-Extraktion');
    }
    points.push([x, y]);
  }
  return points;
}

describe('symbolForDigit', () => {
  it('bildet Ziffern 1..6 in der Reihenfolge von SYMBOL_ORDER ab', () => {
    expect(symbolForDigit(1)).toBe('circle');
    expect(symbolForDigit(2)).toBe('square');
    expect(symbolForDigit(3)).toBe('triangle');
    expect(symbolForDigit(4)).toBe('star');
    expect(symbolForDigit(5)).toBe('heart');
    expect(symbolForDigit(6)).toBe('diamond');
    SYMBOL_ORDER.forEach((symbol, index) => {
      expect(symbolForDigit(index + 1)).toBe(symbol);
    });
  });

  it('wirft RangeError ausserhalb von 1..6', () => {
    expect(() => symbolForDigit(0)).toThrow(RangeError);
    expect(() => symbolForDigit(7)).toThrow(RangeError);
    expect(() => symbolForDigit(-1)).toThrow(RangeError);
    expect(() => symbolForDigit(3.5)).toThrow(RangeError);
    expect(() => symbolForDigit(Number.NaN)).toThrow(RangeError);
  });
});

describe('symbolPath', () => {
  const cx = 0;
  const cy = 0;
  const size = 10;
  const r = size / 2;
  const tolerance = 0.01;

  it.each(SYMBOL_ORDER)('Pfad für "%s" beginnt mit M und endet mit Z', (name: SymbolName) => {
    const path = symbolPath(name, cx, cy, size);
    expect(path.startsWith('M')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
  });

  it.each(SYMBOL_ORDER)(
    'Pfad für "%s" enthält nur M/L/C/Z-Befehle und Zahlen',
    (name: SymbolName) => {
      const path = symbolPath(name, cx, cy, size);
      // Nur die Buchstaben M, L, C, Z sind als Befehle erlaubt.
      expect(path).toMatch(/^[MLCZ0-9.\- ]+$/);
      const letters = path.match(/[A-Za-z]/g) ?? [];
      expect(letters.length).toBeGreaterThan(0);
      for (const letter of letters) {
        expect(['M', 'L', 'C', 'Z']).toContain(letter);
      }
    },
  );

  it.each(SYMBOL_ORDER)(
    'alle Koordinaten von "%s" liegen innerhalb des umschliessenden Quadrats',
    (name: SymbolName) => {
      const path = symbolPath(name, cx, cy, size);
      const points = extractPoints(path);
      expect(points.length).toBeGreaterThan(0);
      for (const [x, y] of points) {
        expect(x).toBeGreaterThanOrEqual(cx - r - tolerance);
        expect(x).toBeLessThanOrEqual(cx + r + tolerance);
        expect(y).toBeGreaterThanOrEqual(cy - r - tolerance);
        expect(y).toBeLessThanOrEqual(cy + r + tolerance);
      }
    },
  );

  it('der Pfad für Grösse 10 bei (0,0) parst in mindestens 4 Punkte (Beispiel: Stern)', () => {
    const path = symbolPath('star', cx, cy, size);
    const points = extractPoints(path);
    expect(points.length).toBeGreaterThanOrEqual(4);
  });

  it('jedes Symbol liefert einen nicht-leeren, wohlgeformten Pfad', () => {
    for (const name of SYMBOL_ORDER) {
      const path = symbolPath(name, 12.5, -3.25, 7.5);
      expect(path.length).toBeGreaterThan(0);
      expect(path.startsWith('M')).toBe(true);
      expect(path.endsWith('Z')).toBe(true);
    }
  });
});
