import { describe, expect, it } from 'vitest';
import { allLandingPages, KIND_SLUG, PUZZLE_KINDS, relatedPages, SLUG_TO_KIND } from './landing';

const pages = allLandingPages();

describe('Landing-Pages', () => {
  it('haben je Rätseltyp eindeutige Adressen', () => {
    // Doppelte Adressen liessen im Bauprozess still eine Seite verschwinden.
    for (const kind of PUZZLE_KINDS) {
      const slugs = pages.filter((page) => page.kind === kind).map((page) => page.slug);
      expect(new Set(slugs).size, kind).toBe(slugs.length);
    }
  });

  it('erzeugen keine Seiten wie «hochzeit-hochzeit»', () => {
    for (const page of pages) {
      expect(page.slug).not.toMatch(/^([a-z]+)-\1$/);
    }
  });

  it('liegen in der geplanten Grössenordnung (30 bis 80 Seiten)', () => {
    // Obergrenze mit AP12 (fünfter Rätseltyp) von 65 auf 80 angehoben: mehr
    // Rätseltypen erhöhen die Seitenzahl proportional zu Themen und Anlässen.
    expect(pages.length).toBeGreaterThanOrEqual(30);
    expect(pages.length).toBeLessThanOrEqual(80);
  });

  it('haben durchwegs eigene Titel und Beschreibungen', () => {
    // Gleiche Beschreibungen auf mehreren Seiten wertet die Suche ab.
    const titles = pages.map((page) => page.title);
    const descriptions = pages.map((page) => page.description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it('nennen in jeder Beschreibung den Rätseltyp', () => {
    const names = {
      wordsearch: 'Wortsuchrätsel',
      maze: 'Labyrinth',
      sudoku: 'Sudoku',
      'dot-to-dot': 'Punkte-zu-Punkte',
      crossword: 'Kreuzworträtsel',
    } as const;
    for (const page of pages) {
      expect(page.description, page.description).toContain(names[page.kind]);
    }
  });

  it('haben Titel und Beschreibung in brauchbarer Länge', () => {
    for (const page of pages) {
      expect(page.title.length, page.title).toBeGreaterThan(15);
      expect(page.title.length, page.title).toBeLessThanOrEqual(70);
      expect(page.description.length, page.description).toBeGreaterThan(60);
      expect(page.description.length, page.description).toBeLessThanOrEqual(200);
    }
  });

  it('verwenden korrekte Bestimmungswörter', () => {
    const headings = pages.map((page) => page.heading);
    expect(headings).toContain('Einhorn-Wortsuchrätsel zum Ausdrucken');
    expect(headings).toContain('Hochzeits-Sudoku zum Ausdrucken');
    expect(headings).toContain('Weihnachts-Labyrinth zum Ausdrucken');
    expect(headings.some((heading) => heading.includes('Einhörner-'))).toBe(false);
  });

  it('bilden Rätseltyp und Adressteil aufeinander ab', () => {
    for (const kind of PUZZLE_KINDS) {
      expect(SLUG_TO_KIND[KIND_SLUG[kind]]).toBe(kind);
    }
  });

  it('enthalten kein ß', () => {
    for (const page of pages) {
      expect(`${page.title} ${page.description} ${page.heading}`).not.toMatch(/ß/);
    }
  });

  it('verlinken auf verwandte, aber nicht auf sich selbst', () => {
    for (const page of pages.slice(0, 12)) {
      const related = relatedPages(page, pages);
      expect(related.length).toBeGreaterThan(0);
      for (const other of related) {
        expect(`${other.kind}/${other.slug}`).not.toBe(`${page.kind}/${page.slug}`);
      }
    }
  });
});
