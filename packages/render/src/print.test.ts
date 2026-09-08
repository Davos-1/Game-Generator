import {
  generateCrossword,
  generateDotToDot,
  generateMaze,
  generateShadowMatch,
  generateSudoku,
  generateWordSearch,
} from '@raetselheft/engine';
import { beforeAll, describe, expect, it } from 'vitest';
import { createMeasurer } from './fonts';
import type { TextMeasurer } from './measure';
import { loadFontsFromDisk } from './node';
import { crosswordEntriesFor } from './themes/crosswordEntries';
import { mazeElements } from './layout/maze';
import { bookletPages, puzzlePage, solutionPages, type PuzzleItem } from './pages';
import { MARGIN } from './page';
import { A4, MM_PER_PT, type PageLayout } from './primitives';
import { NEUTRAL_THEME, THEMES, type Theme } from './themes';

let measurer: TextMeasurer;

beforeAll(async () => {
  measurer = createMeasurer(await loadFontsFromDisk());
});

/** Relative Helligkeit nach WCAG; entscheidet über die Lesbarkeit im Graustufendruck. */
function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const channel = (start: number): number => {
    const raw = Number.parseInt(value.slice(start, start + 2), 16) / 255;
    return raw <= 0.03928 ? raw / 12.92 : ((raw + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

const contrastToWhite = (hex: string): number => 1.05 / (luminance(hex) + 0.05);

const items = (theme: Theme): PuzzleItem[] => [
  {
    kind: 'wordsearch',
    puzzle: generateWordSearch({
      words: theme.words.length > 0 ? theme.words.slice(0, 10) : ['Schatz', 'Anker', 'Möwe'],
      seed: `print-${theme.id}`,
      width: 14,
    }),
  },
  { kind: 'maze', puzzle: generateMaze({ seed: `print-${theme.id}`, difficulty: 'hard' }) },
  {
    kind: 'sudoku',
    puzzle: generateSudoku({ seed: `print-${theme.id}`, size: 6, difficulty: 'easy' }),
  },
  {
    kind: 'sudoku',
    puzzle: generateSudoku({ seed: `print9-${theme.id}`, size: 9, difficulty: 'hard' }),
  },
  {
    kind: 'dot-to-dot',
    puzzle: generateDotToDot({ seed: `print-${theme.id}`, difficulty: 'hard' }),
  },
  {
    kind: 'shadow-match',
    puzzle: generateShadowMatch({ seed: `print-${theme.id}`, difficulty: 'hard' }),
  },
  {
    kind: 'crossword',
    puzzle: generateCrossword({
      seed: `print-${theme.id}`,
      entries: crosswordEntriesFor(theme.id),
      difficulty: 'hard',
    }),
  },
];

/** Alle Seiten aller Themes, Rätsel- und Lösungsseiten. */
function everyPage(): { page: PageLayout; label: string }[] {
  const result: { page: PageLayout; label: string }[] = [];
  for (const theme of [NEUTRAL_THEME, ...THEMES]) {
    for (const item of items(theme)) {
      result.push({
        page: puzzlePage(item, measurer, { theme, title: 'Test', footerLeft: 'raetselheft.ch' }),
        label: `${theme.id}/${item.kind}`,
      });
    }
    const entries = items(theme).map((item, index) => ({ item, caption: `Rätsel ${index + 1}` }));
    for (const page of solutionPages(entries, measurer, { theme, title: 'Lösungen' })) {
      result.push({ page, label: `${theme.id}/Lösungen` });
    }
  }
  return result;
}

describe('Druckbarkeit', () => {
  it('hält auf jeder Seite das A4-Format ein', () => {
    for (const { page, label } of everyPage()) {
      expect(page.width, label).toBe(A4.width);
      expect(page.height, label).toBe(A4.height);
    }
  });

  it('hält überall mindestens 12 mm Rand ein', () => {
    for (const { page, label } of everyPage()) {
      for (const el of page.elements) {
        const points: [number, number][] = [];
        if (el.type === 'line') {
          points.push([el.x1, el.y1], [el.x2, el.y2]);
        } else if (el.type === 'polyline') {
          points.push(...el.points.map(([x, y]) => [x, y] as [number, number]));
        } else if (el.type === 'text') {
          points.push([el.x, el.y]);
        } else if (el.type === 'rect') {
          points.push([el.x, el.y], [el.x + el.width, el.y + el.height]);
        } else if (el.type === 'circle') {
          points.push([el.cx - el.r, el.cy - el.r], [el.cx + el.r, el.cy + el.r]);
        } else {
          for (const match of el.d.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)) {
            points.push([Number(match[1]), Number(match[2])]);
          }
        }
        for (const [x, y] of points) {
          // Halber Millimeter Nachsicht für Linienstärken und Rundungen.
          expect(x, `${label} x`).toBeGreaterThanOrEqual(MARGIN - 0.5);
          expect(x, `${label} x`).toBeLessThanOrEqual(A4.width - MARGIN + 0.5);
          expect(y, `${label} y`).toBeGreaterThanOrEqual(MARGIN - 0.5);
          expect(y, `${label} y`).toBeLessThanOrEqual(A4.height - MARGIN + 0.5);
        }
      }
    }
  });

  it('zeichnet keine Linie dünner als 0.25 mm', () => {
    for (const { page, label } of everyPage()) {
      for (const el of page.elements) {
        if (el.type === 'line' || el.type === 'polyline') {
          expect(el.stroke.width, label).toBeGreaterThanOrEqual(0.25);
        } else if ('stroke' in el && el.stroke) {
          expect(el.stroke.width, label).toBeGreaterThanOrEqual(0.25);
        }
      }
    }
  });

  it('setzt keine Schrift kleiner als 6 pt', () => {
    for (const { page, label } of everyPage()) {
      for (const el of page.elements) {
        if (el.type === 'text') expect(el.size, `${label}: ${el.text}`).toBeGreaterThanOrEqual(6);
      }
    }
  });

  it('füllt keine grossen Flächen (Tintenverbrauch)', () => {
    for (const { page, label } of everyPage()) {
      for (const el of page.elements) {
        if (el.type === 'rect' && el.fill) {
          const area = el.width * el.height;
          expect(area, label).toBeLessThan(A4.width * A4.height * 0.1);
        }
      }
    }
  });

  it('lässt jede Textfarbe auf Weiss genügend Kontrast (auch in Graustufen)', () => {
    for (const theme of [NEUTRAL_THEME, ...THEMES]) {
      // 4.5:1 ist die Schwelle für Fliesstext; Gitterlinien dürfen heller sein.
      expect(contrastToWhite(theme.colors.ink), `${theme.id} ink`).toBeGreaterThanOrEqual(4.5);
      expect(contrastToWhite(theme.colors.muted), `${theme.id} muted`).toBeGreaterThanOrEqual(3);
      expect(contrastToWhite(theme.colors.accent), `${theme.id} accent`).toBeGreaterThanOrEqual(3);
      expect(contrastToWhite(theme.colors.solution), `${theme.id} solution`).toBeGreaterThanOrEqual(
        3,
      );
      expect(contrastToWhite(theme.colors.grid), `${theme.id} grid`).toBeGreaterThanOrEqual(1.6);
    }
  });

  it('unterscheidet Vorgaben und Lösung auch ohne Farbe', () => {
    // Im Sudoku stehen Vorgaben und ergänzte Zahlen auf derselben Seite.
    // Bei Graustufendruck darf man sie nicht verwechseln.
    for (const theme of [NEUTRAL_THEME, ...THEMES]) {
      const difference = Math.abs(luminance(theme.colors.ink) - luminance(theme.colors.solution));
      expect(difference, `${theme.id}`).toBeGreaterThanOrEqual(0.05);
    }
  });

  it('lässt in Rätselzellen genug Platz für Handschrift', () => {
    // Kinder schreiben grob; unter 5 mm Zellhöhe wird es unbrauchbar.
    const sudoku = generateSudoku({ seed: 'zelle', size: 9, difficulty: 'easy' });
    const page = puzzlePage({ kind: 'sudoku', puzzle: sudoku }, measurer, { title: 'Sudoku' });
    const horizontal = page.elements
      .filter((el) => el.type === 'line' && el.y1 === el.y2)
      .map((el) => (el.type === 'line' ? el.y1 : 0))
      .sort((a, b) => a - b);
    const gaps = horizontal.slice(1).map((y, index) => y - (horizontal[index] as number));
    const cellHeight = Math.max(...gaps);
    expect(cellHeight).toBeGreaterThanOrEqual(5);
  });

  it('zeichnet das Labyrinth samt Marken innerhalb seines Rahmens', () => {
    // Ragte die Startmarke heraus, überlappte sie auf Lösungsseiten die
    // Beschriftung der Kachel.
    const box = { x: 20, y: 40, width: 80, height: 100 };
    for (const theme of [NEUTRAL_THEME, ...THEMES]) {
      for (const compact of [false, true]) {
        const elements = mazeElements(generateMaze({ seed: 'rahmen', difficulty: 'easy' }), box, {
          compact,
          palette: theme.colors,
          ...(theme.id === NEUTRAL_THEME.id
            ? {}
            : { icons: { start: theme.icons.mazeStart, end: theme.icons.mazeEnd } }),
        });
        for (const el of elements) {
          const points: [number, number][] =
            el.type === 'line'
              ? [
                  [el.x1, el.y1],
                  [el.x2, el.y2],
                ]
              : el.type === 'polyline'
                ? el.points.map(([x, y]) => [x, y] as [number, number])
                : el.type === 'path'
                  ? [...el.d.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)].map(
                      (m) => [Number(m[1]), Number(m[2])] as [number, number],
                    )
                  : [];
          for (const [x, y] of points) {
            expect(x, `${theme.id} x`).toBeGreaterThanOrEqual(box.x - 0.01);
            expect(x, `${theme.id} x`).toBeLessThanOrEqual(box.x + box.width + 0.01);
            expect(y, `${theme.id} y`).toBeGreaterThanOrEqual(box.y - 0.01);
            expect(y, `${theme.id} y`).toBeLessThanOrEqual(box.y + box.height + 0.01);
          }
        }
      }
    }
  });

  it('hält ein Heft mit sechzehn Rätseln in vernünftiger Seitenzahl', () => {
    const theme = THEMES[0] as Theme;
    const entries = Array.from({ length: 16 }, (_, index) => ({
      item: items(theme)[index % 4] as PuzzleItem,
      caption: `Rätsel ${index + 1}`,
    }));
    const pages = bookletPages(entries, measurer, {
      theme,
      title: 'Heft',
      solutionsTitle: 'Lösungen',
    });
    expect(pages.length).toBeGreaterThanOrEqual(17);
    expect(pages.length).toBeLessThanOrEqual(30);
  });

  it('bleibt bei der Schriftgrösse in den Rätselgittern lesbar', () => {
    const puzzle = generateWordSearch({
      words: ['Schatz', 'Anker', 'Insel', 'Möwe'],
      seed: 'lesbar',
      width: 20,
    });
    const page = puzzlePage({ kind: 'wordsearch', puzzle }, measurer, { title: 'Gross' });
    const letters = page.elements.filter((el) => el.type === 'text' && el.text.length === 1);
    for (const letter of letters) {
      if (letter.type !== 'text') continue;
      // 20×20 ist das grösste Gitter; auch dort müssen Buchstaben lesbar sein.
      expect(letter.size * MM_PER_PT).toBeGreaterThanOrEqual(2.5);
    }
  });
});
