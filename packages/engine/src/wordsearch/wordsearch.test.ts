import { describe, expect, it } from 'vitest';
import { generateWordSearch } from './generate';
import { blacklistVariants, normalizeWord } from './normalize';
import { findWord } from './solver';
import { DIRECTIONS_BY_DIFFICULTY, type Direction, type WordSearchPuzzle } from './types';
import { validateWordSearch } from './validate';
import { DEFAULT_BLACKLIST } from './data/blacklist';

/** Themen-Wortliste als Test-Fixture (die echten Listen kommen mit AP6). */
const PIRATEN = [
  'Schatz',
  'Kapitän',
  'Papagei',
  'Schiff',
  'Anker',
  'Säbel',
  'Insel',
  'Kanone',
  'Piratenflagge',
  'Kompass',
  'Seeräuber',
  'Augenklappe',
  'Holzbein',
  'Truhe',
  'Karte',
  'Matrose',
  'Meer',
  'Welle',
  'Sturm',
  'Fernrohr',
  'Goldmünze',
  'Hafen',
  'Steuerrad',
  'Mast',
  'Segel',
  'Kajüte',
  'Planke',
  'Rum',
  'Enterhaken',
  'Käpten',
];

const NAMEN = ['Luca', 'Mia', 'Noah', 'Elin', 'Jonas', 'Lena'];

function expectAllPlacedValid(puzzle: WordSearchPuzzle): void {
  const result = validateWordSearch(puzzle, DEFAULT_BLACKLIST);
  expect(result.issues).toEqual([]);
  expect(result.ok).toBe(true);
  expect(puzzle.grid).toHaveLength(puzzle.height);
  for (const row of puzzle.grid) {
    expect(row).toHaveLength(puzzle.width);
    for (const letter of row) expect(letter).toMatch(/^[A-ZÄÖÜ]$/);
  }
}

describe('normalizeWord', () => {
  it('schreibt gross und entfernt Sonderzeichen', () => {
    expect(normalizeWord("  Käpt'n Blau-Bart ", 'keep')).toBe('KÄPTNBLAUBART');
  });

  it('behält Umlaute im Modus keep und löst sie im Modus expand auf', () => {
    expect(normalizeWord('Säbel', 'keep')).toBe('SÄBEL');
    expect(normalizeWord('Säbel', 'expand')).toBe('SAEBEL');
    expect(normalizeWord('Übung', 'expand')).toBe('UEBUNG');
  });

  it('macht aus ß immer SS', () => {
    expect(normalizeWord('Strasse', 'keep')).toBe('STRASSE');
    expect(normalizeWord('Straße', 'keep')).toBe('STRASSE');
    expect(normalizeWord('GROẞ', 'keep')).toBe('GROSS');
  });

  it('reduziert Akzente auf Grundbuchstaben', () => {
    expect(normalizeWord('Café', 'keep')).toBe('CAFE');
    expect(normalizeWord('Zoë', 'keep')).toBe('ZOE');
  });

  it('liefert beide Blacklist-Varianten', () => {
    expect(blacklistVariants('Arschloch')).toEqual(['ARSCHLOCH']);
    expect(blacklistVariants('Fötzel')).toEqual(['FÖTZEL', 'FOETZEL']);
  });
});

describe('findWord (Solver)', () => {
  const grid = [
    ['S', 'C', 'H', 'A', 'T', 'Z'],
    ['O', 'X', 'X', 'N', 'X', 'X'],
    ['N', 'X', 'X', 'K', 'X', 'X'],
    ['N', 'X', 'X', 'E', 'X', 'X'],
    ['E', 'X', 'X', 'R', 'X', 'X'],
    ['O', 'T', 'T', 'O', 'X', 'X'],
  ];

  it('findet horizontale und vertikale Wörter', () => {
    expect(findWord(grid, 'SCHATZ')).toEqual([
      expect.objectContaining({ start: { row: 0, col: 0 }, direction: 'E' }),
    ]);
    expect(findWord(grid, 'ANKER')).toEqual([
      expect.objectContaining({ start: { row: 0, col: 3 }, direction: 'S' }),
    ]);
    expect(findWord(grid, 'SONNE')).toHaveLength(1);
  });

  it('findet rückwärts gelesene Wörter und Palindrome in beide Richtungen', () => {
    expect(findWord(grid, 'ZTAHCS')).toEqual([
      expect.objectContaining({ start: { row: 0, col: 5 }, direction: 'W' }),
    ]);
    expect(
      findWord(grid, 'OTTO')
        .map((o) => o.direction)
        .sort(),
    ).toEqual(['E', 'W']);
  });

  it('respektiert die Richtungsauswahl', () => {
    expect(findWord(grid, 'ZTAHCS', ['E', 'S'])).toEqual([]);
  });

  it('findet nichts, was nicht da ist', () => {
    expect(findWord(grid, 'PIRAT')).toEqual([]);
    expect(findWord(grid, '')).toEqual([]);
  });
});

describe('generateWordSearch', () => {
  it('platziert alle Wörter und liefert ein validierbares Gitter', () => {
    const puzzle = generateWordSearch({ words: PIRATEN.slice(0, 12), seed: 'test-1', width: 14 });
    expect(puzzle.rejected).toEqual([]);
    expect(puzzle.unplaced).toEqual([]);
    expect(puzzle.placed).toHaveLength(12);
    expectAllPlacedValid(puzzle);
  });

  it('ist deterministisch: gleicher Seed ergibt exakt dasselbe Rätsel', () => {
    const a = generateWordSearch({ words: PIRATEN, seed: 'piraten-2026', width: 16, height: 18 });
    const b = generateWordSearch({ words: PIRATEN, seed: 'piraten-2026', width: 16, height: 18 });
    expect(a).toEqual(b);
  });

  it('verschiedene Seeds ergeben verschiedene Gitter', () => {
    const a = generateWordSearch({ words: PIRATEN.slice(0, 8), seed: 1, width: 10 });
    const b = generateWordSearch({ words: PIRATEN.slice(0, 8), seed: 2, width: 10 });
    expect(a.grid).not.toEqual(b.grid);
  });

  it('hält sich an die Richtungen der Schwierigkeitsstufe', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const allowed = new Set<Direction>(DIRECTIONS_BY_DIFFICULTY[difficulty]);
      for (let i = 0; i < 5; i++) {
        const puzzle = generateWordSearch({
          words: PIRATEN.slice(0, 10),
          seed: `${difficulty}-${i}`,
          width: 12,
          difficulty,
        });
        expect(puzzle.unplaced).toEqual([]);
        for (const p of puzzle.placed) expect(allowed.has(p.direction)).toBe(true);
      }
    }
  });

  it('nutzt bei «hard» tatsächlich auch Rückwärts-Richtungen', () => {
    const puzzle = generateWordSearch({
      words: PIRATEN,
      seed: 'hard',
      width: 18,
      difficulty: 'hard',
    });
    const dirs = new Set(puzzle.placed.map((p) => p.direction));
    expect([...dirs].some((d) => ['W', 'N', 'NW', 'SW'].includes(d))).toBe(true);
  });

  it('akzeptiert eine explizite Richtungsauswahl', () => {
    const puzzle = generateWordSearch({ words: NAMEN, seed: 'dirs', width: 8, directions: ['S'] });
    for (const p of puzzle.placed) expect(p.direction).toBe('S');
  });

  it('behält Umlaute im Gitter und mischt Umlaute unter die Füllbuchstaben', () => {
    const puzzle = generateWordSearch({
      words: ['Säbel', 'Kapitän', 'Kajüte'],
      seed: 'uml',
      width: 10,
    });
    expect(puzzle.placed.map((p) => p.word).sort()).toEqual(['KAJÜTE', 'KAPITÄN', 'SÄBEL']);
    expectAllPlacedValid(puzzle);
  });

  it('löst Umlaute im Modus expand auf und verwendet dann keine Umlaut-Füllbuchstaben', () => {
    const puzzle = generateWordSearch({
      words: ['Säbel', 'Kapitän', 'Kajüte'],
      seed: 'uml',
      width: 10,
      umlauts: 'expand',
    });
    expect(puzzle.placed.map((p) => p.word).sort()).toEqual(['KAJUETE', 'KAPITAEN', 'SAEBEL']);
    for (const row of puzzle.grid) for (const l of row) expect(l).toMatch(/^[A-Z]$/);
  });

  it('verwendet keine Umlaut-Füllbuchstaben, wenn kein Wort einen Umlaut hat', () => {
    const puzzle = generateWordSearch({ words: NAMEN, seed: 'plain', width: 8 });
    for (const row of puzzle.grid) for (const l of row) expect(l).toMatch(/^[A-Z]$/);
  });

  it('sortiert ungültige Eingaben aus und nennt den Grund', () => {
    const puzzle = generateWordSearch({
      words: ['Schatz', 'schatz', '', '---', 'Piratenschatzkiste', 'Arsch'],
      seed: 'reject',
      width: 8,
    });
    expect(puzzle.placed.map((p) => p.word)).toEqual(['SCHATZ']);
    expect(puzzle.rejected).toEqual([
      { original: 'schatz', reason: 'duplicate' },
      { original: '', reason: 'empty' },
      { original: '---', reason: 'empty' },
      { original: 'Piratenschatzkiste', reason: 'too-long' },
      { original: 'Arsch', reason: 'blacklisted' },
    ]);
  });

  it('erlaubt Teilwörter (ARM in ARMBAND) und hält die Lösung trotzdem eindeutig', () => {
    const puzzle = generateWordSearch({ words: ['Armband', 'Arm', 'Band'], seed: 'sub', width: 8 });
    expect(puzzle.unplaced).toEqual([]);
    expectAllPlacedValid(puzzle);
  });

  it('meldet nicht platzierbare Wörter statt zu scheitern', () => {
    const many = Array.from(
      { length: 40 },
      (_, i) =>
        `WORTQ${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + Math.floor(i / 26))}Q`,
    );
    const puzzle = generateWordSearch({ words: many, seed: 'full', width: 8, maxAttempts: 3 });
    expect(puzzle.placed.length + puzzle.unplaced.length).toBe(40);
    expect(puzzle.unplaced.length).toBeGreaterThan(0);
    expectAllPlacedValid(puzzle);
  });

  it('wirft bei ungültiger Gittergrösse', () => {
    expect(() => generateWordSearch({ words: NAMEN, seed: 1, width: 7 })).toThrow(RangeError);
    expect(() => generateWordSearch({ words: NAMEN, seed: 1, width: 21 })).toThrow(RangeError);
    expect(() => generateWordSearch({ words: NAMEN, seed: 1, width: 10.5 })).toThrow(RangeError);
    expect(() => generateWordSearch({ words: NAMEN, seed: 1, directions: [] })).toThrow(RangeError);
  });

  it('schreibt ein Blacklist-Wort nie zufällig ins Gitter', () => {
    // «SAU» entsteht in einem 20×20-Gitter ohne Prüfung in etwa jedem zweiten Fall zufällig.
    for (let i = 0; i < 20; i++) {
      const puzzle = generateWordSearch({
        words: ['Schiff', 'Anker'],
        seed: `bl-${i}`,
        width: 20,
        difficulty: 'hard',
        blacklist: ['SAU'],
      });
      expect(findWord(puzzle.grid, 'SAU')).toEqual([]);
    }
  });

  it('weist Nutzerwörter nur bei exakter Übereinstimmung mit der Blacklist ab', () => {
    const puzzle = generateWordSearch({
      words: ['Dinosaurier', 'Sextant', 'Mongolei'],
      seed: 'substr',
      width: 12,
    });
    expect(puzzle.rejected).toEqual([]);
    expect(puzzle.unplaced).toEqual([]);
    expectAllPlacedValid(puzzle);
  });
});

describe('validateWordSearch', () => {
  it('erkennt Abweichungen zwischen Lösung und Gitter', () => {
    const puzzle = generateWordSearch({ words: NAMEN, seed: 'v', width: 8 });
    const grid = puzzle.grid.map((row) => [...row]);
    const first = puzzle.placed[0];
    if (!first) throw new Error('kein Wort platziert');
    const cell = first.cells[0];
    if (!cell) throw new Error('keine Zelle');
    (grid[cell.row] as string[])[cell.col] = first.word[0] === 'Q' ? 'Z' : 'Q';
    const result = validateWordSearch({ grid, placed: puzzle.placed });
    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({ kind: 'grid-mismatch', word: first.word });
  });

  it('erkennt Blacklist-Treffer in beiden Umlaut-Schreibweisen', () => {
    const grid = [
      ['F', 'O', 'E', 'T', 'Z', 'E', 'L', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
    ];
    const result = validateWordSearch({ grid, placed: [] }, ['Fötzel']);
    expect(result.issues).toContainEqual({ kind: 'blacklisted', word: 'FOETZEL' });
  });
});

describe('Abnahme AP2: 100 generierte Rätsel', () => {
  it('sind alle vollständig, eindeutig und frei von Blacklist-Wörtern', () => {
    const sizes = [8, 10, 12, 15, 20];
    const difficulties = ['easy', 'medium', 'hard'] as const;
    const modes = ['keep', 'expand'] as const;
    let count = 0;
    for (let i = 0; i < 100; i++) {
      const width = sizes[i % sizes.length] as number;
      const height = sizes[(i * 7 + 3) % sizes.length] as number;
      const difficulty = difficulties[i % 3] as (typeof difficulties)[number];
      const umlauts = modes[i % 2] as (typeof modes)[number];
      const maxLen = Math.max(width, height);
      const pool = [...PIRATEN, ...NAMEN].filter((w) => w.length <= maxLen);
      const wordCount = Math.min(pool.length, 4 + (i % 9));
      const words = pool.slice(i % 5, (i % 5) + wordCount);

      const puzzle = generateWordSearch({
        words,
        seed: `ap2-${i}`,
        width,
        height,
        difficulty,
        umlauts,
      });
      expect(puzzle.rejected).toEqual([]);
      expect(puzzle.unplaced, `Rätsel ${i} (${width}×${height}, ${words.length} Wörter)`).toEqual(
        [],
      );
      expectAllPlacedValid(puzzle);
      count++;
    }
    expect(count).toBe(100);
  });
});
