import { describe, expect, it } from 'vitest';
import { bookletString, formatPrice, puzzleString, type PaymentInfo } from './payment';
import { defaultBooklet } from './bookletConfig';
import { defaultConfig } from './puzzleConfig';

const INFO: PaymentInfo = {
  enabled: true,
  prices: { single: 200, booklet: 500 },
  currency: 'CHF',
};

describe('Kennzeichnung der Konfiguration', () => {
  it('unterscheidet Einzelrätsel und Heft', () => {
    const single = puzzleString(defaultConfig('sudoku'));
    const booklet = bookletString(defaultBooklet());
    expect(single.startsWith('single:')).toBe(true);
    expect(booklet.startsWith('booklet:')).toBe(true);
    expect(single).not.toBe(booklet);
  });

  it('trennt die Rätseltypen, auch bei gleichen Einstellungen', () => {
    const seed = 'gleich';
    expect(puzzleString({ ...defaultConfig('maze'), seed })).not.toBe(
      puzzleString({ ...defaultConfig('sudoku'), seed }),
    );
  });

  it('bleibt für dieselbe Konfiguration gleich und ändert sich mit ihr', () => {
    const config = defaultConfig('sudoku');
    expect(puzzleString({ ...config })).toBe(puzzleString(config));
    // Ein anderes Rätsel ist ein anderer Kauf.
    expect(puzzleString({ ...config, seed: 'anders' })).not.toBe(puzzleString(config));
    expect(puzzleString({ ...config, difficulty: 'hard' })).not.toBe(puzzleString(config));
  });
});

describe('Preisangabe', () => {
  it('zeigt den Preis je Produkt', () => {
    expect(formatPrice(INFO, 'single')).toBe('CHF 2.00');
    expect(formatPrice(INFO, 'booklet')).toBe('CHF 5.00');
  });
});
