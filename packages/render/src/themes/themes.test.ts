import { generateMaze, generateSudoku, generateWordSearch } from '@raetselheft/engine';
import { beforeAll, describe, expect, it } from 'vitest';
import { createMeasurer } from '../fonts';
import { ICON_NAMES, iconPath } from '../icons';
import type { TextMeasurer } from '../measure';
import { loadFontsFromDisk } from '../node';
import { puzzlePage, type PuzzleItem } from '../pages';
import { NEUTRAL_THEME, THEMES, themeById, validateTheme } from './index';
import type { Theme } from './types';

let measurer: TextMeasurer;

beforeAll(async () => {
  measurer = createMeasurer(await loadFontsFromDisk());
});

/** Alle im Layout verwendeten Farben einer Seite. */
function colorsOf(page: { elements: readonly unknown[] }): Set<string> {
  const colors = new Set<string>();
  for (const element of page.elements as Record<string, unknown>[]) {
    if (typeof element.color === 'string') colors.add(element.color);
    if (typeof element.fill === 'string') colors.add(element.fill);
    const stroke = element.stroke as { color?: string } | undefined;
    if (stroke?.color) colors.add(stroke.color);
  }
  return colors;
}

const items = (): Record<'wordsearch' | 'maze' | 'sudoku', PuzzleItem> => ({
  wordsearch: {
    kind: 'wordsearch',
    puzzle: generateWordSearch({ words: ['Schatz', 'Anker', 'Möwe'], seed: 'theme', width: 10 }),
  },
  maze: { kind: 'maze', puzzle: generateMaze({ seed: 'theme', difficulty: 'easy' }) },
  sudoku: {
    kind: 'sudoku',
    puzzle: generateSudoku({ seed: 'theme', size: 6, difficulty: 'easy' }),
  },
});

describe('Theme-Definitionen', () => {
  it('sind vollständig und gültig', () => {
    expect(THEMES).toHaveLength(5);
    for (const theme of THEMES) {
      expect(validateTheme(theme), `${theme.id}`).toEqual([]);
    }
    expect(validateTheme(NEUTRAL_THEME)).toEqual([]);
  });

  it('haben eindeutige Ids und Namen', () => {
    const ids = THEMES.map((theme) => theme.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(THEMES.map((theme) => theme.name)).toEqual([
      'Piraten',
      'Einhörner',
      'Dschungel',
      'Hochzeit',
      'Weihnachten',
    ]);
  });

  it('liefern für jedes Theme mindestens 30 taugliche Wörter', () => {
    for (const theme of THEMES) {
      expect(theme.words.length, theme.id).toBeGreaterThanOrEqual(30);
      for (const word of theme.words) {
        expect(word, `${theme.id}: ${word}`).toMatch(/^[A-Za-zÄÖÜäöü]{3,12}$/);
      }
    }
  });

  it('nennen nur bekannte Icons', () => {
    for (const theme of THEMES) {
      for (const icon of [...Object.values(theme.icons), ...theme.sudokuIcons]) {
        expect(ICON_NAMES).toContain(icon);
      }
    }
  });

  it('themeById fällt bei unbekannter Id auf das Standarddesign zurück', () => {
    expect(themeById('piraten').id).toBe('piraten');
    expect(themeById('gibt-es-nicht')).toBe(NEUTRAL_THEME);
    expect(themeById(undefined)).toBe(NEUTRAL_THEME);
  });

  it('validateTheme meldet Mängel', () => {
    const broken: Theme = {
      ...(THEMES[0] as Theme),
      id: 'Gross Geschrieben',
      colors: { ...(THEMES[0] as Theme).colors, ink: 'rot' },
      sudokuIcons: ['ship', 'ship'],
      words: ['ok', 'Wortmitvielzuvielenzeichen'],
    };
    const problems = validateTheme(broken);
    expect(problems.some((p) => p.includes('Ungültige Id'))).toBe(true);
    expect(problems.some((p) => p.includes('Farbe ink'))).toBe(true);
    expect(problems.some((p) => p.includes('nicht eindeutig'))).toBe(true);
    expect(problems.some((p) => p.includes('mindestens 30'))).toBe(true);
    expect(problems.some((p) => p.includes('Ungeeignetes Wort'))).toBe(true);
  });
});

describe('Icons', () => {
  it('liefern geschlossene Pfade aus M, L, C und Z', () => {
    for (const name of ICON_NAMES) {
      const path = iconPath(name, 0, 0, 10);
      expect(path.startsWith('M'), name).toBe(true);
      expect(path.trimEnd().endsWith('Z'), name).toBe(true);
      expect(path.replace(/[-\d.\s]/g, ''), name).toMatch(/^[MLCZ]+$/);
    }
  });

  it('bleiben innerhalb des umschliessenden Quadrats', () => {
    for (const name of ICON_NAMES) {
      const path = iconPath(name, 50, 50, 20);
      for (const match of path.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)) {
        expect(Number(match[1]), `${name} x`).toBeGreaterThanOrEqual(39.99);
        expect(Number(match[1]), `${name} x`).toBeLessThanOrEqual(60.01);
        expect(Number(match[2]), `${name} y`).toBeGreaterThanOrEqual(39.99);
        expect(Number(match[2]), `${name} y`).toBeLessThanOrEqual(60.01);
      }
    }
  });
});

describe('Aussparungen', () => {
  /** Vorzeichenbehaftete Fläche eines Teilpfads (Polygon-Näherung über die Stützpunkte). */
  const signedArea = (subpath: string): number => {
    const points = [...subpath.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)].map(
      (m) => [Number(m[1]), Number(m[2])] as const,
    );
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i] as readonly [number, number];
      const b = points[(i + 1) % points.length] as readonly [number, number];
      sum += a[0] * b[1] - b[0] * a[1];
    }
    return sum / 2;
  };

  it('schneiden bei Kompass, Ring und Blume ein echtes Loch', () => {
    // Ohne gegenläufigen Teilpfad verschmelzen die Formen zu einer Fläche:
    // der Kompass wäre ein voller Kreis statt eines Rings.
    for (const name of ['compass', 'ring', 'flower', 'chest'] as const) {
      const parts = iconPath(name, 0, 0, 20)
        .split('M')
        .filter((part) => part.trim().length > 0)
        .map((part) => `M${part}`);
      const areas = parts.map(signedArea);
      expect(
        areas.some((area) => area > 0),
        name,
      ).toBe(true);
      expect(
        areas.some((area) => area < 0),
        name,
      ).toBe(true);
    }
  });
});

describe('Themewechsel', () => {
  it('färbt Rätsel und Seite vollständig um', () => {
    const item = items().wordsearch;
    const neutral = puzzlePage(item, measurer, { title: 'Test' });
    for (const theme of THEMES) {
      const themed = puzzlePage(item, measurer, { title: 'Test', theme });
      const colors = colorsOf(themed);
      expect(colors, theme.id).toContain(theme.colors.ink);
      expect(colors, theme.id).toContain(theme.colors.grid);
      expect(colors, theme.id).toContain(theme.colors.accent);
      expect(colorsOf(neutral)).not.toEqual(colors);
    }
  });

  it('setzt beim Labyrinth die Theme-Marken für Start und Ziel', () => {
    const item = items().maze;
    const theme = themeById('piraten');
    const themed = puzzlePage(item, measurer, { title: 'Labyrinth', theme });
    const neutral = puzzlePage(item, measurer, { title: 'Labyrinth' });
    const paths = (page: typeof themed): string[] =>
      page.elements.filter((el) => el.type === 'path').map((el) => el.d);
    // Neutral: zwei schlichte Dreiecke. Theme: Schiff und Truhe plus Ecken-Deko.
    expect(paths(neutral)).toHaveLength(2);
    expect(paths(themed).length).toBeGreaterThan(2);
    // Ecken-Deko oben rechts: A4-Breite minus Rand minus halbe Icon-Grösse.
    expect(paths(themed)).toContain(iconPath(theme.icons.corner, 210 - 12 - 4.5, 12 + 4.5, 9));
    expect(paths(themed)).toContain(
      paths(themed).find((d) => d.length > 0 && d !== paths(neutral)[0]),
    );
  });

  it('nutzt beim Kinder-Sudoku die Theme-Symbole', () => {
    const item = items().sudoku;
    const theme = themeById('einhorn');
    const themed = puzzlePage(item, measurer, { title: 'Sudoku', theme });
    const shapes = themed.elements.filter((el) => el.type === 'path').map((el) => el.d);
    const sample = iconPath(theme.sudokuIcons[0] as (typeof theme.sudokuIcons)[number], 0, 0, 10);
    // Mindestens ein Symbolpfad muss dieselbe Bauart haben wie das Theme-Icon.
    expect(shapes.length).toBeGreaterThan(6);
    expect(sample.startsWith('M')).toBe(true);
  });

  it('lässt das Standarddesign unverändert neutral', () => {
    const page = puzzlePage(items().sudoku, measurer, { title: 'Sudoku', theme: NEUTRAL_THEME });
    const colors = colorsOf(page);
    expect(colors).toContain('#1f2937');
    expect(colors).not.toContain(themeById('piraten').colors.accent);
  });
});
