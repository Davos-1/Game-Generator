import type {
  Difficulty,
  MazeDifficulty,
  SudokuDifficulty,
  SudokuSize,
  UmlautMode,
} from '@raetselheft/engine';

export type PuzzleKind = 'wordsearch' | 'maze' | 'sudoku';

interface BaseConfig {
  /** Freier Titel über dem Rätsel. */
  title: string;
  /** Zweite Zeile, z. B. Anlass oder Name. */
  subtitle: string;
  /** Bestimmt das konkrete Rätsel; «Neu würfeln» setzt einen neuen Wert. */
  seed: string;
}

export interface WordSearchConfig extends BaseConfig {
  kind: 'wordsearch';
  /** Rohtext der Wortliste, durch Komma oder Zeilenumbruch getrennt. */
  words: string;
  size: number;
  difficulty: Difficulty;
  umlauts: UmlautMode;
}

export interface MazeConfig extends BaseConfig {
  kind: 'maze';
  difficulty: MazeDifficulty;
}

export interface SudokuConfig extends BaseConfig {
  kind: 'sudoku';
  size: SudokuSize;
  difficulty: SudokuDifficulty;
}

export type PuzzleConfig = WordSearchConfig | MazeConfig | SudokuConfig;

export const WORD_EXAMPLES: Readonly<Record<string, readonly string[]>> = {
  piraten: [
    'Schatz',
    'Kapitän',
    'Papagei',
    'Schiff',
    'Anker',
    'Säbel',
    'Insel',
    'Kanone',
    'Kompass',
    'Truhe',
    'Segel',
    'Möwe',
  ],
  einhorn: [
    'Einhorn',
    'Regenbogen',
    'Zauber',
    'Glitzer',
    'Wolke',
    'Fee',
    'Horn',
    'Mähne',
    'Sterne',
    'Wunsch',
    'Krone',
    'Wiese',
  ],
  dschungel: [
    'Affe',
    'Tiger',
    'Liane',
    'Papagei',
    'Schlange',
    'Urwald',
    'Frosch',
    'Elefant',
    'Banane',
    'Fluss',
    'Käfer',
    'Blatt',
  ],
  hochzeit: [
    'Braut',
    'Bräutigam',
    'Ringe',
    'Torte',
    'Tanz',
    'Blumen',
    'Kirche',
    'Liebe',
    'Ehe',
    'Sekt',
    'Kutsche',
    'Kuss',
  ],
};

const randomSeed = (): string => Math.random().toString(36).slice(2, 8);

export function defaultConfig(kind: PuzzleKind): PuzzleConfig {
  const seed = randomSeed();
  switch (kind) {
    case 'wordsearch':
      return {
        kind,
        title: 'Wortsuchrätsel',
        subtitle: '',
        seed,
        words: (WORD_EXAMPLES.piraten ?? []).join(', '),
        size: 12,
        difficulty: 'medium',
        umlauts: 'keep',
      };
    case 'maze':
      return { kind, title: 'Labyrinth', subtitle: '', seed, difficulty: 'medium' };
    case 'sudoku':
      return { kind, title: 'Sudoku', subtitle: '', seed, size: 9, difficulty: 'easy' };
  }
}

export const newSeed = randomSeed;

/** Zerlegt die Eingabe in einzelne Wörter (Komma, Semikolon oder Zeilenumbruch). */
export function parseWords(input: string): string[] {
  return input
    .split(/[,;\n\r]+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0);
}

const clampInt = (value: string | null, min: number, max: number, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
};

const oneOf = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

/** Kurze Parameternamen, damit geteilte Links nicht ausufern. */
export function configToParams(config: PuzzleConfig): URLSearchParams {
  const params = new URLSearchParams();
  const base = defaultConfig(config.kind);
  const set = (key: string, value: string, fallback: string): void => {
    if (value !== fallback) params.set(key, value);
  };
  set('t', config.title, base.title);
  set('u', config.subtitle, base.subtitle);
  params.set('s', config.seed);
  switch (config.kind) {
    case 'wordsearch': {
      const b = base as WordSearchConfig;
      set('w', parseWords(config.words).join(','), parseWords(b.words).join(','));
      set('g', String(config.size), String(b.size));
      set('d', config.difficulty, b.difficulty);
      set('a', config.umlauts, b.umlauts);
      break;
    }
    case 'maze':
      set('d', config.difficulty, (base as MazeConfig).difficulty);
      break;
    case 'sudoku': {
      const b = base as SudokuConfig;
      set('g', String(config.size), String(b.size));
      set('d', config.difficulty, b.difficulty);
      break;
    }
  }
  return params;
}

/** Liest eine Konfiguration aus URL-Parametern; fehlende Werte kommen aus den Standardwerten. */
export function configFromParams(kind: PuzzleKind, params: URLSearchParams): PuzzleConfig {
  const base = defaultConfig(kind);
  const common = {
    title: params.get('t') ?? base.title,
    subtitle: params.get('u') ?? base.subtitle,
    seed: params.get('s') ?? base.seed,
  };
  switch (kind) {
    case 'wordsearch': {
      const b = base as WordSearchConfig;
      const words = params.get('w');
      return {
        kind,
        ...common,
        words: words ? parseWords(words).join(', ') : b.words,
        size: clampInt(params.get('g'), 8, 20, b.size),
        difficulty: oneOf(params.get('d'), ['easy', 'medium', 'hard'] as const, b.difficulty),
        umlauts: oneOf(params.get('a'), ['keep', 'expand'] as const, b.umlauts),
      };
    }
    case 'maze':
      return {
        kind,
        ...common,
        difficulty: oneOf(
          params.get('d'),
          ['easy', 'medium', 'hard'] as const,
          (base as MazeConfig).difficulty,
        ),
      };
    case 'sudoku': {
      const b = base as SudokuConfig;
      const size = clampInt(params.get('g'), 4, 9, b.size);
      return {
        kind,
        ...common,
        size: size === 4 || size === 6 ? size : 9,
        difficulty: oneOf(params.get('d'), ['easy', 'medium', 'hard'] as const, b.difficulty),
      };
    }
  }
}

const storageKey = (kind: PuzzleKind): string => `raetselheft:config:${kind}`;

/** Letzte Konfiguration lesen; bei defekten Daten oder ohne Speicher gibt es die Standardwerte. */
export function loadConfig(kind: PuzzleKind): PuzzleConfig | undefined {
  try {
    const raw = window.localStorage.getItem(storageKey(kind));
    if (!raw) return undefined;
    const params = new URLSearchParams(String(JSON.parse(raw)));
    return configFromParams(kind, params);
  } catch {
    return undefined;
  }
}

export function saveConfig(config: PuzzleConfig): void {
  try {
    window.localStorage.setItem(
      storageKey(config.kind),
      JSON.stringify(configToParams(config).toString()),
    );
  } catch {
    // Privater Modus oder voller Speicher: Persistenz ist optional.
  }
}

/** Sprechender Dateiname, z. B. «piraten-wortsuchraetsel-luca.pdf». */
export function fileName(config: PuzzleConfig): string {
  const slug = (text: string): string =>
    text
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  const parts = [slug(config.title), slug(config.subtitle)].filter(Boolean);
  return `${parts.join('-') || config.kind}.pdf`;
}
