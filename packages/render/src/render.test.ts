import {
  generateCrossword,
  generateDotToDot,
  generateMaze,
  generateShadowMatch,
  generateSudoku,
  generateWordSearch,
} from '@raetselheft/engine';
import { beforeAll, describe, expect, it } from 'vitest';
import { createMeasurer, createTableMeasurer } from './fonts';
import type { TextMeasurer } from './measure';
import { loadFontsFromDisk } from './node';
import { createPage, fitText, MARGIN } from './page';
import { puzzlePage, solutionPages, type PuzzleItem } from './pages';
import { renderPdf } from './pdf';
import { inflateSync } from 'node:zlib';
import * as fontkit from 'fontkit';
import { PDFDict, PDFDocument, PDFName, PDFRawStream, PDFRef } from 'pdf-lib';
import { A4, COLORS, PT_PER_MM, type PageLayout, type TextElement } from './primitives';
import { pageToSvg } from './svg';
import type { FontSet } from './fonts';

/** Liest die eingebetteten Schriftprogramme (FontFile2) aus einem PDF zurück. */
async function extractEmbeddedFonts(bytes: Uint8Array): Promise<fontkit.Font[]> {
  const doc = await PDFDocument.load(bytes);
  const result: fontkit.Font[] = [];
  for (const [, object] of doc.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFDict)) continue;
    const ref = object.get(PDFName.of('FontFile2'));
    if (!(ref instanceof PDFRef)) continue;
    const stream = doc.context.lookup(ref);
    if (!(stream instanceof PDFRawStream)) continue;
    const raw = stream.getContents();
    const isFlate = String(stream.dict.get(PDFName.of('Filter'))) === '/FlateDecode';
    const data = isFlate ? inflateSync(Buffer.from(raw)) : Buffer.from(raw);
    const font = fontkit.create(new Uint8Array(data));
    if (!('fonts' in font)) result.push(font);
  }
  return result;
}

let fonts: FontSet;
let measurer: TextMeasurer;

const WORDS = ['Schatz', 'Kapitän', 'Papagei', 'Schiff', 'Anker', 'Säbel', 'Insel', 'Kanone'];

const CROSSWORD_ENTRIES = [
  { word: 'Schatz', clue: 'Verborgener Reichtum' },
  { word: 'Anker', clue: 'Hält ein Schiff fest' },
  { word: 'Kapitän', clue: 'Führt die Mannschaft' },
  { word: 'Papagei', clue: 'Bunter Vogel an Bord' },
  { word: 'Insel', clue: 'Land im Meer' },
  { word: 'Segel', clue: 'Fängt den Wind' },
  { word: 'Truhe', clue: 'Bewahrt den Schatz auf' },
  { word: 'Karte', clue: 'Zeigt den Weg zum Ziel' },
];

const items = (): PuzzleItem[] => [
  { kind: 'wordsearch', puzzle: generateWordSearch({ words: WORDS, seed: 'render', width: 12 }) },
  { kind: 'maze', puzzle: generateMaze({ seed: 'render', difficulty: 'medium' }) },
  { kind: 'sudoku', puzzle: generateSudoku({ seed: 'render', size: 6, difficulty: 'easy' }) },
  { kind: 'sudoku', puzzle: generateSudoku({ seed: 'render9', size: 9, difficulty: 'easy' }) },
  { kind: 'dot-to-dot', puzzle: generateDotToDot({ seed: 'render', difficulty: 'medium' }) },
  {
    kind: 'shadow-match',
    puzzle: generateShadowMatch({ seed: 'render', difficulty: 'medium' }),
  },
  {
    kind: 'crossword',
    puzzle: generateCrossword({ seed: 'render', entries: CROSSWORD_ENTRIES, difficulty: 'medium' }),
  },
];

beforeAll(async () => {
  fonts = await loadFontsFromDisk();
  measurer = createMeasurer(fonts);
});

/** Alle Zeichenkoordinaten einer Seite, für die Randprüfung. */
function coordinates(page: PageLayout): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const add = (x: number, y: number): void => void points.push({ x, y });
  for (const el of page.elements) {
    switch (el.type) {
      case 'rect':
        add(el.x, el.y);
        add(el.x + el.width, el.y + el.height);
        break;
      case 'line':
        add(el.x1, el.y1);
        add(el.x2, el.y2);
        break;
      case 'polyline':
        for (const [x, y] of el.points) add(x, y);
        break;
      case 'circle':
        add(el.cx - el.r, el.cy - el.r);
        add(el.cx + el.r, el.cy + el.r);
        break;
      case 'path':
        for (const m of el.d.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)) {
          add(Number(m[1]), Number(m[2]));
        }
        break;
      case 'text':
        add(el.x, el.y);
        break;
    }
  }
  return points;
}

describe('Metrik-Tabelle', () => {
  it('misst exakt gleich wie fontkit', () => {
    const table = createTableMeasurer();
    const samples = [
      'Wortsuchrätsel',
      'Finde alle 12 Wörter',
      'raetselheft.ch',
      '«Grösse» – Übung für Zoë',
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      'abcdefghijklmnopqrstuvwxyz',
      '0123456789 .,;:!?-–—()',
      'ÄÖÜäöüßÉèçñŁł',
    ];
    for (const font of ['display', 'body', 'bodyBold'] as const) {
      for (const text of samples) {
        for (const size of [8, 10.5, 22]) {
          expect(table.width(text, font, size), `${font}/${text}`).toBeCloseTo(
            measurer.width(text, font, size),
            9,
          );
        }
      }
      expect(table.capHeight(font, 12)).toBeCloseTo(measurer.capHeight(font, 12), 9);
      expect(table.ascent(font, 12)).toBeCloseTo(measurer.ascent(font, 12), 9);
      expect(table.descent(font, 12)).toBeCloseTo(measurer.descent(font, 12), 9);
    }
  });

  it('nutzt für unbekannte Zeichen die Ersatzbreite', () => {
    const table = createTableMeasurer();
    expect(table.width('\u{1F600}', 'body', 10)).toBeGreaterThan(0);
  });
});

describe('Textmessung', () => {
  it('misst breitere Texte breiter und skaliert linear mit der Schriftgrösse', () => {
    expect(measurer.width('MM', 'body', 12)).toBeGreaterThan(measurer.width('II', 'body', 12));
    const single = measurer.width('Rätsel', 'body', 10);
    expect(measurer.width('Rätsel', 'body', 20)).toBeCloseTo(single * 2, 6);
  });

  it('kennt Umlaute und Anführungszeichen', () => {
    for (const text of ['ä', 'ö', 'ü', 'Ä', '«Grösse»', '1234567890']) {
      expect(measurer.width(text, 'body', 10)).toBeGreaterThan(0);
    }
  });

  it('capHeight liegt zwischen 0 und der Schriftgrösse', () => {
    const cap = measurer.capHeight('bodyBold', 12);
    expect(cap).toBeGreaterThan(0);
    expect(cap).toBeLessThan(12 * 0.353);
  });
});

describe('Seitenrahmen', () => {
  it('hält A4 und 12 mm Rand ein', () => {
    const { page, content } = createPage(measurer, { title: 'Wortsuchrätsel' });
    expect(page.width).toBe(A4.width);
    expect(page.height).toBe(A4.height);
    expect(content.x).toBeGreaterThanOrEqual(MARGIN);
    expect(content.x + content.width).toBeLessThanOrEqual(A4.width - MARGIN + 0.001);
    expect(content.y + content.height).toBeLessThanOrEqual(A4.height - MARGIN + 0.001);
  });

  it('kürzt zu lange Titel mit Auslassungszeichen', () => {
    const long = 'Ein sehr langer Titel für ein Rätsel, der niemals auf eine Zeile passt';
    const fitted = fitText(measurer, long, 'display', 22, 100);
    expect(fitted.endsWith('…')).toBe(true);
    expect(measurer.width(fitted, 'display', 22)).toBeLessThanOrEqual(100);
  });

  it('zeichnet das Wasserzeichen gedreht und zuoberst über dem Rätsel', () => {
    const page = puzzlePage(items()[1] as PuzzleItem, measurer, {
      title: 'Heft',
      watermark: 'VORSCHAU',
    });
    const marks = page.elements.filter(
      (el): el is TextElement => el.type === 'text' && el.text === 'VORSCHAU',
    );
    expect(marks.length).toBeGreaterThan(5);
    for (const mark of marks) {
      expect(mark.rotate).toBe(-30);
      // Kräftig genug, dass die Vorschau kein brauchbares Rätsel ist,
      // aber durchsichtig genug, um das Design zu beurteilen.
      expect(mark.opacity).toBeGreaterThanOrEqual(0.4);
      expect(mark.opacity).toBeLessThanOrEqual(0.6);
    }
    // Zuoberst heisst: die letzten Elemente der Seite sind die Wasserzeichen.
    expect(page.elements.slice(-marks.length)).toEqual(marks);
  });
});

describe('Rätselseiten', () => {
  it('bleiben für alle Rätseltypen innerhalb des Druckrands', () => {
    for (const item of items()) {
      const page = puzzlePage(item, measurer, { title: 'Test', footerLeft: 'raetselheft.ch' });
      for (const { x, y } of coordinates(page)) {
        expect(x, `${item.kind} x`).toBeGreaterThanOrEqual(MARGIN - 0.5);
        expect(x, `${item.kind} x`).toBeLessThanOrEqual(A4.width - MARGIN + 0.5);
        expect(y, `${item.kind} y`).toBeGreaterThanOrEqual(MARGIN - 0.5);
        expect(y, `${item.kind} y`).toBeLessThanOrEqual(A4.height - MARGIN + 0.5);
      }
    }
  });

  it('zeichnet Linien nie dünner als 0.25 mm (Druckbarkeit)', () => {
    for (const item of items()) {
      const page = puzzlePage(item, measurer, { title: 'Test' });
      for (const el of page.elements) {
        if (el.type === 'line' || el.type === 'polyline') {
          expect(el.stroke.width).toBeGreaterThanOrEqual(0.25);
        }
      }
    }
  });

  it('zeigt im Rätsel keine Lösung, in der Lösung aber alle Werte', () => {
    const sudoku = generateSudoku({ seed: 'sol', size: 9, difficulty: 'easy' });
    const item: PuzzleItem = { kind: 'sudoku', puzzle: sudoku };
    const puzzle = puzzlePage(item, measurer, { title: 'Sudoku' });
    const digits = (page: PageLayout): number =>
      page.elements.filter((el) => el.type === 'text' && /^[1-9]$/.test(el.text)).length;
    expect(digits(puzzle)).toBe(sudoku.givenCount);
    const [solution] = solutionPages([{ item, caption: 'Sudoku 1' }], measurer, {
      title: 'Lösungen',
    });
    expect(solution).toBeDefined();
    expect(digits(solution as PageLayout)).toBe(81);
  });

  it('verbindet beim Punkte-zu-Punkte nur in der Lösung, zeigt aber immer alle Nummern', () => {
    const dots = generateDotToDot({ seed: 'sol', difficulty: 'medium' });
    const item: PuzzleItem = { kind: 'dot-to-dot', puzzle: dots };
    const puzzle = puzzlePage(item, measurer, { title: 'Punkte-zu-Punkte' });
    const labels = (page: PageLayout): string[] =>
      page.elements
        .filter((el): el is TextElement => el.type === 'text' && /^\d+$/.test(el.text))
        .map((el) => el.text);
    // Ohne Lösung: alle Nummern sichtbar, aber keine Verbindungslinie.
    expect(labels(puzzle).sort((a, b) => Number(a) - Number(b))).toEqual(
      dots.points.map((p) => String(p.label)),
    );
    expect(puzzle.elements.some((el) => el.type === 'polyline')).toBe(false);
    expect(puzzle.elements.filter((el) => el.type === 'circle')).toHaveLength(dots.points.length);

    const [solution] = solutionPages([{ item, caption: 'Punkte 1' }], measurer, {
      title: 'Lösungen',
    });
    expect(solution).toBeDefined();
    const line = (solution as PageLayout).elements.find((el) => el.type === 'polyline');
    expect(line).toBeDefined();
    // Geschlossene Form: ein Punkt mehr als Nummern, da zurück zum ersten.
    expect(line?.type === 'polyline' ? line.points.length : 0).toBe(dots.points.length + 1);
    expect(labels(solution as PageLayout)).toHaveLength(dots.points.length);
  });

  it('verbindet beim Schattenrätsel nur in der Lösung, zeigt aber immer alle Formen', () => {
    const match = generateShadowMatch({ seed: 'sol', difficulty: 'hard' });
    const item: PuzzleItem = { kind: 'shadow-match', puzzle: match };
    const puzzle = puzzlePage(item, measurer, { title: 'Schattenrätsel' });
    // Je eine Form oben und unten: doppelt so viele Pfade wie Formen.
    expect(puzzle.elements.filter((el) => el.type === 'path')).toHaveLength(match.count * 2);
    // Die einzige Linie im Rätsel ist der Trennstrich unter dem Titel, keine
    // Verbindung zwischen Form und Schatten.
    const matchLines = (page: PageLayout): number =>
      page.elements.filter((el) => el.type === 'line' && el.stroke.color === COLORS.solution)
        .length;
    expect(matchLines(puzzle)).toBe(0);

    const [solution] = solutionPages([{ item, caption: 'Schatten 1' }], measurer, {
      title: 'Lösungen',
    });
    expect(solution).toBeDefined();
    expect(matchLines(solution as PageLayout)).toBe(match.count);
  });

  it('zeigt beim Kreuzworträtsel im Rätsel keine Buchstaben, in der Lösung alle', () => {
    const crossword = generateCrossword({
      seed: 'sol',
      entries: CROSSWORD_ENTRIES,
      difficulty: 'medium',
    });
    const item: PuzzleItem = { kind: 'crossword', puzzle: crossword };
    const puzzle = puzzlePage(item, measurer, { title: 'Kreuzworträtsel' });
    const letters = (page: PageLayout): TextElement[] =>
      page.elements.filter((el): el is TextElement => el.type === 'text' && el.font === 'bodyBold');
    // Ohne Lösung stehen nur die (fetten) Hinweis-Überschriften, keine Buchstaben.
    expect(letters(puzzle).some((el) => /^[A-ZÄÖÜ]$/.test(el.text))).toBe(false);
    // Aber gesperrte Felder (schwarz) und die Nummern sind schon sichtbar.
    const totalCells = crossword.width * crossword.height;
    const blocked = crossword.fillable.flat().filter((v) => !v).length;
    expect(puzzle.elements.filter((el) => el.type === 'rect' && el.fill)).toHaveLength(blocked);
    expect(blocked).toBeLessThan(totalCells);

    const [solution] = solutionPages([{ item, caption: 'Kreuzworträtsel 1' }], measurer, {
      title: 'Lösungen',
    });
    expect(solution).toBeDefined();
    const solutionLetters = letters(solution as PageLayout).filter((el) =>
      /^[A-ZÄÖÜ]$/.test(el.text),
    );
    const fillableCount = crossword.fillable.flat().filter(Boolean).length;
    expect(solutionLetters).toHaveLength(fillableCount);
  });

  it('verteilt Lösungen nach Grösse: 4 kleine oder 2 grosse pro Seite', () => {
    const maze: PuzzleItem = {
      kind: 'maze',
      puzzle: generateMaze({ seed: 'm', difficulty: 'easy' }),
    };
    const kids: PuzzleItem = {
      kind: 'sudoku',
      puzzle: generateSudoku({ seed: 'k', size: 4, difficulty: 'easy' }),
    };
    const big: PuzzleItem = {
      kind: 'wordsearch',
      puzzle: generateWordSearch({ words: WORDS, seed: 'w', width: 10 }),
    };
    const small = Array.from({ length: 4 }, (_, i) => ({
      item: i % 2 ? maze : kids,
      caption: `R${i}`,
    }));
    expect(solutionPages(small, measurer, { title: 'Lösungen' })).toHaveLength(1);
    const large = Array.from({ length: 4 }, (_, i) => ({ item: big, caption: `R${i}` }));
    expect(solutionPages(large, measurer, { title: 'Lösungen' })).toHaveLength(2);
  });
});

describe('SVG-Ausgabe', () => {
  it('erzeugt gültiges SVG mit mm-viewBox und pt-Schriftgrössen', () => {
    const page = puzzlePage(items()[0] as PuzzleItem, measurer, { title: 'Wortsuchrätsel' });
    const svg = pageToSvg(page);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain(`viewBox="0 0 ${A4.width} ${A4.height}"`);
    expect(svg).toContain('font-kerning:none');
    // Schriftgrösse in Millimetern (Benutzereinheiten der viewBox), nicht in pt.
    expect(svg).toMatch(/font-size="[\d.]+"/);
    expect(svg).not.toMatch(/font-size="[\d.]+pt"/);
    expect(svg.endsWith('</svg>')).toBe(true);
    // Keine unbalancierten Tags: jede Öffnung hat eine Schliessung.
    expect(svg.split('<text').length - 1).toBe(svg.split('</text>').length - 1);
  });

  it('rechnet Punkt in Millimeter um', () => {
    const page: PageLayout = {
      width: 10,
      height: 10,
      elements: [{ type: 'text', x: 1, y: 1, text: 'A', font: 'body', size: 72 }],
    };
    // 72 pt entsprechen einem Zoll, also 25.4 mm.
    expect(pageToSvg(page)).toContain('font-size="25.4"');
  });

  it('maskiert Sonderzeichen in Texten', () => {
    const page: PageLayout = {
      width: 10,
      height: 10,
      elements: [{ type: 'text', x: 1, y: 1, text: 'A & B < C "D"', font: 'body', size: 10 }],
    };
    const svg = pageToSvg(page);
    expect(svg).toContain('A &amp; B &lt; C &quot;D&quot;');
  });
});

describe('PDF-Ausgabe', () => {
  it('erzeugt ein PDF mit einer A4-Seite pro Layout', async () => {
    const pages = items().map((item) => puzzlePage(item, measurer, { title: item.kind }));
    const bytes = await renderPdf(pages, fonts, { title: 'Testheft' });
    expect(new TextDecoder().decode(bytes.slice(0, 8)).startsWith('%PDF-1.')).toBe(true);

    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBe(pages.length);
    expect(loaded.getTitle()).toBe('Testheft');
    const { width, height } = loaded.getPage(0).getSize();
    expect(width).toBeCloseTo(A4.width * PT_PER_MM, 1);
    expect(height).toBeCloseTo(A4.height * PT_PER_MM, 1);
  });

  it('bettet alle drei Schriften ein', async () => {
    const page = puzzlePage(items()[1] as PuzzleItem, measurer, { title: 'Labyrinth' });
    const bytes = await renderPdf([page], fonts);
    // Ohne Objektströme neu speichern, damit die Struktur im Klartext prüfbar ist.
    const plain = await (await PDFDocument.load(bytes)).save({ useObjectStreams: false });
    const text = new TextDecoder('latin1').decode(plain);
    expect(text.match(/\/FontFile2/g)).toHaveLength(3);
    expect(text).toMatch(/\/BaseFont\s*\/Nunito-Bold/);
  });

  it('enthält für jedes gezeichnete Zeichen eine Glyphe im eingebetteten Font', async () => {
    // Die Untermengen-Funktion von pdf-lib liess bei diesen Schriften Glyphen
    // weg (Buchstaben fehlten im Druck). Dieser Test hält den Fall fest.
    const page = puzzlePage(items()[0] as PuzzleItem, measurer, {
      title: 'Wortsuchrätsel für Zoë',
      subtitle: 'Finde alle 12 Wörter – «grosse Übung»',
      footerLeft: 'raetselheft.ch',
    });
    const bytes = await renderPdf([page], fonts);
    const embedded = await extractEmbeddedFonts(bytes);
    expect(embedded.length).toBe(3);
    const used = new Set<number>();
    for (const el of page.elements) {
      if (el.type === 'text') for (const ch of el.text) used.add(ch.codePointAt(0) as number);
    }
    expect(used.size).toBeGreaterThan(20);
    for (const font of embedded) {
      for (const code of used) {
        expect(font.hasGlyphForCodePoint(code), `${String.fromCodePoint(code)} fehlt`).toBe(true);
      }
    }
  });

  it('bleibt für ein 16-seitiges Heft unter 2 MB', async () => {
    const list = items();
    const pages = Array.from({ length: 16 }, (_, i) =>
      puzzlePage(list[i % list.length] as PuzzleItem, measurer, { title: `Seite ${i + 1}` }),
    );
    const bytes = await renderPdf(pages, fonts);
    expect(bytes.byteLength).toBeLessThan(2_000_000);
  });
});
