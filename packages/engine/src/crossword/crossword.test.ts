import { describe, expect, it } from 'vitest';
import { generateCrossword } from './generate';
import {
  MIN_PLACED_WORDS,
  WORD_TARGET_BY_DIFFICULTY,
  type CrosswordDifficulty,
  type CrosswordEntry,
  type CrosswordPuzzle,
} from './types';

const DIFFICULTIES: readonly CrosswordDifficulty[] = ['easy', 'medium', 'hard'];

const ENTRIES: CrosswordEntry[] = [
  { word: 'Schatz', clue: 'Verborgener Reichtum' },
  { word: 'Anker', clue: 'Hält ein Schiff fest' },
  { word: 'Kapitän', clue: 'Führt die Mannschaft' },
  { word: 'Papagei', clue: 'Bunter Vogel an Bord' },
  { word: 'Insel', clue: 'Land im Meer' },
  { word: 'Segel', clue: 'Fängt den Wind' },
  { word: 'Truhe', clue: 'Bewahrt den Schatz auf' },
  { word: 'Karte', clue: 'Zeigt den Weg zum Ziel' },
  { word: 'Möwe', clue: 'Vogel am Strand' },
  { word: 'Fluch', clue: 'Böser Zauber' },
  { word: 'Säbel', clue: 'Krumme Klinge' },
  { word: 'Flagge', clue: 'Weht am Mast' },
];

/** Prüft, dass jedes Wort in Zelle für Zelle mit der Lösung übereinstimmt und im Feldbereich liegt. */
function expectWordsMatchSolution(puzzle: CrosswordPuzzle): void {
  for (const word of puzzle.words) {
    const dr = word.direction === 'down' ? 1 : 0;
    const dc = word.direction === 'across' ? 1 : 0;
    for (let i = 0; i < word.word.length; i++) {
      const r = word.row + dr * i;
      const c = word.col + dc * i;
      expect(r, `${word.word} Zeile`).toBeGreaterThanOrEqual(0);
      expect(r, `${word.word} Zeile`).toBeLessThan(puzzle.height);
      expect(c, `${word.word} Spalte`).toBeGreaterThanOrEqual(0);
      expect(c, `${word.word} Spalte`).toBeLessThan(puzzle.width);
      expect(puzzle.solution[r]?.[c], `${word.word}[${i}] bei (${r},${c})`).toBe(word.word[i]);
      expect(puzzle.fillable[r]?.[c]).toBe(true);
    }
  }
}

/** Jedes ausfüllbare Feld gehört zu mindestens einem der platzierten Wörter. */
function expectFillableCoveredByWords(puzzle: CrosswordPuzzle): void {
  const covered: boolean[][] = Array.from({ length: puzzle.height }, () =>
    Array<boolean>(puzzle.width).fill(false),
  );
  for (const word of puzzle.words) {
    const dr = word.direction === 'down' ? 1 : 0;
    const dc = word.direction === 'across' ? 1 : 0;
    for (let i = 0; i < word.word.length; i++) {
      (covered[word.row + dr * i] as boolean[])[word.col + dc * i] = true;
    }
  }
  for (let r = 0; r < puzzle.height; r++) {
    for (let c = 0; c < puzzle.width; c++) {
      expect(puzzle.fillable[r]?.[c]).toBe(covered[r]?.[c]);
    }
  }
}

describe('generateCrossword', () => {
  it('ist deterministisch für denselben Seed', () => {
    const a = generateCrossword({ seed: 'lucas', entries: ENTRIES, difficulty: 'medium' });
    const b = generateCrossword({ seed: 'lucas', entries: ENTRIES, difficulty: 'medium' });
    expect(a).toEqual(b);
  });

  for (const difficulty of DIFFICULTIES) {
    it(`platziert bei «${difficulty}» genug Wörter ohne Widersprüche`, () => {
      const puzzle = generateCrossword({
        seed: `check-${difficulty}`,
        entries: ENTRIES,
        difficulty,
      });
      expect(puzzle.words.length).toBeGreaterThanOrEqual(MIN_PLACED_WORDS);
      expect(puzzle.words.length).toBeLessThanOrEqual(WORD_TARGET_BY_DIFFICULTY[difficulty]);
      expectWordsMatchSolution(puzzle);
      expectFillableCoveredByWords(puzzle);
    });
  }

  it('platziert bei «hard» tendenziell mehr Wörter als bei «easy»', () => {
    // Nicht garantiert bei jedem Seed, aber im Schnitt über mehrere Seeds.
    const counts = (difficulty: CrosswordDifficulty): number[] =>
      Array.from(
        { length: 8 },
        (_, i) =>
          generateCrossword({ seed: `avg-${i}`, entries: ENTRIES, difficulty }).words.length,
      );
    const avg = (values: number[]): number => values.reduce((a, b) => a + b, 0) / values.length;
    expect(avg(counts('hard'))).toBeGreaterThan(avg(counts('easy')));
  });

  it('gibt jedem Startfeld genau eine Nummer, auch wenn sich zwei Wörter dort kreuzen', () => {
    const puzzle = generateCrossword({ seed: 'nummern', entries: ENTRIES, difficulty: 'hard' });
    const numberByStart = new Map<string, number>();
    for (const word of puzzle.words) {
      const key = `${word.row},${word.col}`;
      const existing = numberByStart.get(key);
      if (existing !== undefined) {
        expect(word.number, `${word.word} teilt sich Feld (${key})`).toBe(existing);
      } else {
        numberByStart.set(key, word.number);
      }
    }
    // Nummern sind fortlaufend ab 1, ohne Lücken oder Wiederholung an anderer Stelle.
    const numbers = [...new Set(puzzle.words.map((w) => w.number))].sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: numbers.length }, (_, i) => i + 1));
  });

  it('erlaubt keine Wörter, die sich unbeabsichtigt seitlich berühren', () => {
    // Für jedes ausfüllbare Feld: die quer zur Wortrichtung anliegenden
    // Felder gehören nur an echten Kreuzungen zu einem anderen Wort.
    const puzzle = generateCrossword({ seed: 'beruehrung', entries: ENTRIES, difficulty: 'hard' });
    const wordAt = new Map<string, { direction: string }[]>();
    for (const word of puzzle.words) {
      const dr = word.direction === 'down' ? 1 : 0;
      const dc = word.direction === 'across' ? 1 : 0;
      for (let i = 0; i < word.word.length; i++) {
        const key = `${word.row + dr * i},${word.col + dc * i}`;
        const list = wordAt.get(key) ?? [];
        list.push({ direction: word.direction });
        wordAt.set(key, list);
      }
    }
    for (const [key, entries] of wordAt) {
      // Ein Feld gehört zu höchstens einem Wort je Richtung.
      const directions = entries.map((e) => e.direction);
      expect(new Set(directions).size, key).toBe(directions.length);
    }
  });

  it('lehnt zu wenige gültige Wörter ab', () => {
    const tooFew = ENTRIES.slice(0, 2);
    expect(() => generateCrossword({ seed: 'x', entries: tooFew })).toThrow(RangeError);
  });

  it('ignoriert zu kurze, zu lange und doppelte Wörter', () => {
    const withJunk: CrosswordEntry[] = [
      ...ENTRIES,
      { word: 'Ei', clue: 'Zu kurz' },
      { word: 'Kapitän', clue: 'Duplikat' },
      { word: 'Ein-sehr-langes-wort-ohne-ende', clue: 'Zu lang' },
    ];
    const puzzle = generateCrossword({ seed: 'junk', entries: withJunk, difficulty: 'hard' });
    expectWordsMatchSolution(puzzle);
    expect(puzzle.words.filter((w) => w.word === 'EI')).toHaveLength(0);
  });
});
