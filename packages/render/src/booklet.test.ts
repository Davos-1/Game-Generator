import { generateMaze, generateSudoku, generateWordSearch } from '@raetselheft/engine';
import { beforeAll, describe, expect, it } from 'vitest';
import { createMeasurer } from './fonts';
import type { TextMeasurer } from './measure';
import { loadFontsFromDisk } from './node';
import { bookletPages, coverPage, type PuzzleItem } from './pages';
import { A4, type PageLayout, type TextElement } from './primitives';
import { themeById } from './themes';

let measurer: TextMeasurer;

beforeAll(async () => {
  measurer = createMeasurer(await loadFontsFromDisk());
});

const entry = (index: number): { item: PuzzleItem; caption: string } => {
  const kinds = ['wordsearch', 'maze', 'sudoku'] as const;
  const kind = kinds[index % 3] as (typeof kinds)[number];
  if (kind === 'wordsearch') {
    return {
      item: {
        kind,
        puzzle: generateWordSearch({
          words: ['Schatz', 'Anker', 'Möwe', 'Insel'],
          seed: `h${index}`,
          width: 12,
        }),
      },
      caption: `Wortsuchrätsel ${index + 1}`,
    };
  }
  if (kind === 'maze') {
    return {
      item: { kind, puzzle: generateMaze({ seed: `h${index}`, difficulty: 'medium' }) },
      caption: `Labyrinth ${index + 1}`,
    };
  }
  return {
    item: { kind, puzzle: generateSudoku({ seed: `h${index}`, size: 6, difficulty: 'easy' }) },
    caption: `Sudoku ${index + 1}`,
  };
};

const texts = (page: PageLayout): string[] =>
  page.elements.filter((el): el is TextElement => el.type === 'text').map((el) => el.text);

describe('Deckblatt', () => {
  it('zeigt Titel, Name, Anlass, Datum und Gruss', () => {
    const page = coverPage(measurer, {
      title: 'Piraten-Rätselheft',
      name: 'Für Luca',
      occasion: 'Kindergeburtstag',
      date: '12. Oktober 2026',
      greeting: 'Viel Spass beim Rätseln!',
      theme: themeById('piraten'),
    });
    expect(texts(page)).toEqual([
      'Piraten-Rätselheft',
      'Für Luca',
      'Kindergeburtstag',
      '12. Oktober 2026',
      'Viel Spass beim Rätseln!',
    ]);
    expect(page.width).toBe(A4.width);
  });

  it('kommt auch ohne optionale Angaben aus', () => {
    const page = coverPage(measurer, { title: 'Rätselheft' });
    expect(texts(page)).toEqual(['Rätselheft']);
  });

  it('kürzt zu lange Titel statt über den Rand zu laufen', () => {
    const page = coverPage(measurer, {
      title: 'Ein masslos langer Titel für ein Rätselheft mit Namen',
    });
    const title = texts(page)[0] as string;
    expect(title.endsWith('…')).toBe(true);
  });
});

describe('Heft-Komposition', () => {
  it('ergibt Deckblatt, Rätselseiten und Lösungsteil', () => {
    const entries = Array.from({ length: 6 }, (_, i) => entry(i));
    const pages = bookletPages(entries, measurer, {
      title: 'Rätselheft',
      solutionsTitle: 'Lösungen',
      footerLeft: 'raetselheft.ch',
      theme: themeById('dschungel'),
    });
    // 1 Deckblatt + 6 Rätsel + Lösungsseiten
    expect(pages.length).toBeGreaterThanOrEqual(8);
    expect(texts(pages[0] as PageLayout)).toContain('Rätselheft');
    expect(texts(pages[1] as PageLayout)).toContain('Wortsuchrätsel 1');
    expect(texts(pages[7] as PageLayout)).toContain('Lösungen');
    // Seitennummern auf den Rätselseiten
    expect(texts(pages[1] as PageLayout)).toContain('1');
    expect(texts(pages[6] as PageLayout)).toContain('6');
  });

  it('setzt das Wasserzeichen auf jede Seite, auch aufs Deckblatt', () => {
    const entries = Array.from({ length: 4 }, (_, i) => entry(i));
    const pages = bookletPages(entries, measurer, {
      title: 'Vorschau',
      solutionsTitle: 'Lösungen',
      watermark: 'VORSCHAU',
    });
    for (const page of pages) {
      const marks = page.elements.filter(
        (el): el is TextElement => el.type === 'text' && el.text === 'VORSCHAU',
      );
      expect(marks.length, page.label).toBeGreaterThan(3);
      expect(page.elements.slice(-marks.length)).toEqual(marks);
    }
  });

  it('bleibt ohne Wasserzeichen sauber', () => {
    const pages = bookletPages([entry(0)], measurer, { title: 'Heft', solutionsTitle: 'Lösungen' });
    for (const page of pages) {
      expect(texts(page)).not.toContain('VORSCHAU');
    }
  });

  it('hält alle Seiten im Druckrand', () => {
    const entries = Array.from({ length: 8 }, (_, i) => entry(i));
    const pages = bookletPages(entries, measurer, {
      title: 'Rätselheft für Mia',
      name: 'Für Mia',
      solutionsTitle: 'Lösungen',
      theme: themeById('einhorn'),
    });
    for (const page of pages) {
      for (const el of page.elements) {
        if (el.type !== 'text') continue;
        expect(el.x).toBeGreaterThanOrEqual(0);
        expect(el.x).toBeLessThanOrEqual(A4.width);
        expect(el.y).toBeGreaterThanOrEqual(0);
        expect(el.y).toBeLessThanOrEqual(A4.height);
      }
    }
  });
});
