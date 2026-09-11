import { describe, expect, it } from 'vitest';
import {
  configFromParams,
  configToParams,
  CROSSWORD_TOPICS,
  type CrosswordConfig,
  defaultConfig,
  fileName,
  MAX_CROSSWORD_TOPICS,
  parseWords,
  sanitizeTopics,
  type PuzzleKind,
  type WordSearchConfig,
} from './puzzleConfig';

const KINDS: PuzzleKind[] = ['wordsearch', 'maze', 'sudoku', 'dot-to-dot', 'crossword'];

describe('parseWords', () => {
  it('trennt bei Komma, Semikolon und Zeilenumbruch', () => {
    expect(parseWords('Schatz, Anker;Möwe\nSegel')).toEqual(['Schatz', 'Anker', 'Möwe', 'Segel']);
  });

  it('ignoriert Leerraum und leere Einträge', () => {
    expect(parseWords('  , Anker ,,\n\n ')).toEqual(['Anker']);
  });
});

describe('URL-Parameter', () => {
  it('überstehen den Hin- und Rückweg für alle Rätseltypen', () => {
    for (const kind of KINDS) {
      const config = defaultConfig(kind);
      expect(configFromParams(kind, configToParams(config))).toEqual(config);
    }
  });

  it('lassen Standardwerte weg, damit Links kurz bleiben', () => {
    const params = configToParams(defaultConfig('maze'));
    expect([...params.keys()]).toEqual(['s']);
  });

  it('übernehmen geänderte Werte', () => {
    const base = defaultConfig('wordsearch') as WordSearchConfig;
    const config: WordSearchConfig = {
      ...base,
      words: 'Luca, Mia',
      size: 15,
      difficulty: 'hard',
      umlauts: 'expand',
      title: 'Lucas Rätsel',
    };
    const params = configToParams(config);
    expect(params.get('g')).toBe('15');
    expect(params.get('d')).toBe('hard');
    expect(configFromParams('wordsearch', params)).toEqual(config);
  });

  it('greifen bei unsinnigen Werten auf die Standardwerte zurück', () => {
    const params = new URLSearchParams({ g: '999', d: 'unmöglich', a: 'x' });
    const config = configFromParams('wordsearch', params) as WordSearchConfig;
    const base = defaultConfig('wordsearch') as WordSearchConfig;
    expect(config.size).toBe(base.size);
    expect(config.difficulty).toBe(base.difficulty);
    expect(config.umlauts).toBe(base.umlauts);
  });

  it('begrenzt die Sudoku-Grösse auf 4, 6 oder 9', () => {
    expect(configFromParams('sudoku', new URLSearchParams({ g: '7' }))).toMatchObject({ size: 9 });
    expect(configFromParams('sudoku', new URLSearchParams({ g: '4' }))).toMatchObject({ size: 4 });
  });

  it('fällt bei einer unbekannten Punkte-zu-Punkte-Form auf den Standard zurück', () => {
    const base = defaultConfig('dot-to-dot');
    const config = configFromParams('dot-to-dot', new URLSearchParams({ fo: 'unbekannt' }));
    expect(config).toMatchObject({ shapeId: (base as { shapeId: string }).shapeId });
  });

  it('kodiert und dekodiert mehrere Kreuzworträtsel-Wort-Themen', () => {
    const config: CrosswordConfig = {
      ...(defaultConfig('crossword') as CrosswordConfig),
      topics: ['tiere', 'weltraum'],
    };
    const params = configToParams(config);
    expect(params.get('to')).toBe('tiere,weltraum');
    expect(configFromParams('crossword', params)).toEqual(config);
  });

  it('lässt eine leere Themen-Auswahl ohne Parameter im Link', () => {
    const params = configToParams(defaultConfig('crossword'));
    expect(params.has('to')).toBe(false);
  });
});

describe('sanitizeTopics', () => {
  it('entfernt unbekannte Ids und Duplikate', () => {
    expect(sanitizeTopics(['tiere', 'gibt-es-nicht', 'tiere', 'weltraum'])).toEqual([
      'tiere',
      'weltraum',
    ]);
  });

  it('begrenzt auf die Höchstzahl kombinierbarer Themen', () => {
    const many = CROSSWORD_TOPICS.slice(0, MAX_CROSSWORD_TOPICS + 5).map((topic) => topic.id);
    expect(sanitizeTopics(many)).toHaveLength(MAX_CROSSWORD_TOPICS);
  });
});

describe('fileName', () => {
  it('baut einen sprechenden Namen ohne Umlaute', () => {
    const config = {
      ...defaultConfig('wordsearch'),
      title: 'Piraten-Rätsel',
      subtitle: 'für Luca',
    };
    expect(fileName(config)).toBe('piraten-raetsel-fuer-luca.pdf');
  });

  it('fällt ohne Titel auf den Rätseltyp zurück', () => {
    expect(fileName({ ...defaultConfig('maze'), title: '', subtitle: '' })).toBe('maze.pdf');
  });
});
