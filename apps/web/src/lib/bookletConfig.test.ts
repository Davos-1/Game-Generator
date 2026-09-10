import { describe, expect, it } from 'vitest';
import { buildBookletItems } from './render';
import {
  bookletFileName,
  defaultBooklet,
  fromCompact,
  MAX_ENTRIES,
  MIN_ENTRIES,
  newEntry,
  toCompact,
} from './bookletConfig';

describe('Heft-Konfiguration', () => {
  it('startet mit vier Rätseln und einem Theme', () => {
    const booklet = defaultBooklet();
    expect(booklet.entries).toHaveLength(MIN_ENTRIES);
    expect(booklet.theme).toBe('piraten');
    expect(new Set(booklet.entries.map((entry) => entry.id)).size).toBe(MIN_ENTRIES);
  });

  it('übersteht die kompakte Form unverändert', () => {
    const booklet = defaultBooklet();
    const restored = fromCompact(toCompact(booklet));
    // Ids werden neu vergeben, alles andere bleibt gleich.
    expect(restored.entries.map(({ id: _id, ...rest }) => rest)).toEqual(
      booklet.entries.map(({ id: _id, ...rest }) => rest),
    );
    expect({ ...restored, entries: [] }).toEqual({ ...booklet, entries: [] });
  });

  it('lässt Standardwerte in der kompakten Form weg', () => {
    const compact = toCompact({ ...defaultBooklet(), name: '', occasion: '', date: '' });
    expect(compact.n).toBeUndefined();
    expect(compact.o).toBeUndefined();
    expect(compact.e[0]?.d).toBeUndefined();
  });

  it('übersteht die kompakte Form auch mit einer gewählten Punkte-zu-Punkte-Form', () => {
    const booklet = defaultBooklet();
    const withShape = {
      ...booklet,
      entries: [{ ...newEntry('dot-to-dot', booklet.theme), dotToDotShapeId: 'pfeil' }],
    };
    const restored = fromCompact(toCompact(withShape));
    expect(restored.entries[0]?.dotToDotShapeId).toBe('pfeil');
  });

  it('verträgt kaputte Eingaben', () => {
    expect(fromCompact(null).entries).toHaveLength(MIN_ENTRIES);
    expect(fromCompact({ th: 'gibt-es-nicht', e: [] }).theme).toBe('neutral');
    const wild = fromCompact({
      th: 'piraten',
      t: 'X',
      e: [{ k: 'unfug', s: 5, g: 99, z: 7, f: 'gibt-es-nicht' }],
    });
    expect(wild.entries[0]?.kind).toBe('wordsearch');
    expect(wild.entries[0]?.size).toBe(12);
    expect(wild.entries[0]?.sudokuSize).toBe(6);
    expect(wild.entries[0]?.dotToDotShapeId).toBe('stern');
  });

  it('begrenzt die Anzahl Rätsel', () => {
    const many = Array.from({ length: 30 }, () => ({ k: 'maze' as const, s: 'x' }));
    expect(fromCompact({ th: 'piraten', t: 'X', e: many }).entries).toHaveLength(MAX_ENTRIES);
  });

  it('übernimmt Wortlisten des Themas für neue Einträge', () => {
    expect(newEntry('wordsearch', 'einhorn').words).toContain('Einhorn');
    expect(newEntry('sudoku', 'piraten').sudokuSize).toBe(6);
  });
});

describe('Rätsel eines Hefts', () => {
  it('erzeugt für jeden Eintrag ein Rätsel, auch für Sudokus', () => {
    const booklet = defaultBooklet();
    const withSudoku = {
      ...booklet,
      entries: [
        ...booklet.entries,
        { ...newEntry('sudoku', booklet.theme), sudokuSize: 4 as const },
        { ...newEntry('sudoku', booklet.theme), sudokuSize: 9 as const },
      ],
    };
    const { entries, notes } = buildBookletItems(withSudoku);
    expect(notes).toEqual([]);
    expect(entries).toHaveLength(withSudoku.entries.length);
    const sizes = entries.flatMap((entry) =>
      entry.item.kind === 'sudoku' ? [entry.item.puzzle.size] : [],
    );
    expect(sizes).toEqual([6, 4, 9]);
  });

  it('erzeugt auch Punkte-zu-Punkte-Einträge mit ihrer gewählten Form', () => {
    const booklet = defaultBooklet();
    const withDots = {
      ...booklet,
      entries: [
        ...booklet.entries,
        { ...newEntry('dot-to-dot', booklet.theme), dotToDotShapeId: 'herz' },
      ],
    };
    const { entries, notes } = buildBookletItems(withDots);
    expect(notes).toEqual([]);
    expect(entries).toHaveLength(withDots.entries.length);
    const shapeIds = entries.flatMap((entry) =>
      entry.item.kind === 'dot-to-dot' ? [entry.item.puzzle.shapeId] : [],
    );
    expect(shapeIds).toEqual(['herz']);
  });

  it('erzeugt auch Schattenrätsel-Einträge mit ihrer Schwierigkeit', () => {
    const booklet = defaultBooklet();
    const withShadow = {
      ...booklet,
      entries: [
        ...booklet.entries,
        { ...newEntry('shadow-match', booklet.theme), difficulty: 'hard' as const },
      ],
    };
    const { entries, notes } = buildBookletItems(withShadow);
    expect(notes).toEqual([]);
    expect(entries).toHaveLength(withShadow.entries.length);
    const counts = entries.flatMap((entry) =>
      entry.item.kind === 'shadow-match' ? [entry.item.puzzle.count] : [],
    );
    expect(counts).toEqual([6]);
  });

  it('erzeugt auch Kreuzworträtsel-Einträge mit ihrer Schwierigkeit', () => {
    const booklet = defaultBooklet();
    const withCrossword = {
      ...booklet,
      entries: [
        ...booklet.entries,
        { ...newEntry('crossword', booklet.theme), difficulty: 'hard' as const },
      ],
    };
    const { entries, notes } = buildBookletItems(withCrossword);
    expect(notes).toEqual([]);
    expect(entries).toHaveLength(withCrossword.entries.length);
    const difficulties = entries.flatMap((entry) =>
      entry.item.kind === 'crossword' ? [entry.item.puzzle.difficulty] : [],
    );
    expect(difficulties).toEqual(['hard']);
  });

  it('kombiniert bei Kreuzworträtsel-Einträgen mehrere gewählte Wort-Themen', () => {
    const booklet = defaultBooklet();
    const withTopics = {
      ...booklet,
      entries: [
        {
          ...newEntry('crossword', booklet.theme),
          difficulty: 'hard' as const,
          crosswordTopics: ['tiere', 'weltraum'],
        },
      ],
    };
    const { entries, notes } = buildBookletItems(withTopics);
    expect(notes).toEqual([]);
    const puzzle = entries[0]?.item.kind === 'crossword' ? entries[0].item.puzzle : undefined;
    expect(puzzle?.words.length).toBeGreaterThanOrEqual(4);
  });

  it('meldet fehlerhafte Einträge, statt sie stumm zu verwerfen', () => {
    const booklet = defaultBooklet();
    const broken = {
      ...booklet,
      entries: [{ ...newEntry('wordsearch', booklet.theme), words: '' }, ...booklet.entries],
    };
    const { entries, notes } = buildBookletItems(broken);
    expect(entries).toHaveLength(booklet.entries.length);
    expect(notes[0]).toContain('1.');
  });
});

describe('Dateiname', () => {
  it('nennt Theme, Titel und Namen ohne Umlaute', () => {
    const booklet = { ...defaultBooklet(), title: 'Rätselheft', name: 'Für Luca' };
    expect(bookletFileName(booklet)).toBe('piraten-raetselheft-fuer-luca.pdf');
  });

  it('lässt das Standarddesign im Namen weg', () => {
    const booklet = { ...defaultBooklet(), theme: 'neutral', title: 'Heft', name: '' };
    expect(bookletFileName(booklet)).toBe('heft.pdf');
  });
});
