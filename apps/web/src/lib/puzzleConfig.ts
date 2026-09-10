import { NEUTRAL_THEME, THEMES, themeById } from '@raetselheft/render/themes';
import {
  CROSSWORD_TOPIC_CATEGORIES,
  CROSSWORD_TOPICS,
  MAX_CROSSWORD_TOPICS,
} from '@raetselheft/render/themes/crosswordTopics';
import { SHAPE_IDS } from '@raetselheft/engine';
import type {
  CrosswordDifficulty,
  Difficulty,
  DotToDotDifficulty,
  MazeDifficulty,
  ShadowMatchDifficulty,
  SudokuDifficulty,
  SudokuSize,
  UmlautMode,
} from '@raetselheft/engine';

export { CROSSWORD_TOPIC_CATEGORIES, CROSSWORD_TOPICS, MAX_CROSSWORD_TOPICS };

export type PuzzleKind =
  'wordsearch' | 'maze' | 'sudoku' | 'dot-to-dot' | 'shadow-match' | 'crossword';

interface BaseConfig {
  /** Id des Themen-Designs; «neutral» ist das Standarddesign. */
  theme: string;
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
  /**
   * Symbole statt Zahlen. Nur bei 4×4 und 6×6 sinnvoll; neun Formen wären für
   * Kinder zu viel. Standard: Symbole bei den Kindergrössen, Zahlen bei 9×9.
   */
  symbols: boolean;
}

export interface DotToDotConfig extends BaseConfig {
  kind: 'dot-to-dot';
  difficulty: DotToDotDifficulty;
  /** Welche Form verbunden wird; siehe SHAPE_CHOICES. */
  shapeId: string;
}

export interface ShadowMatchConfig extends BaseConfig {
  kind: 'shadow-match';
  difficulty: ShadowMatchDifficulty;
}

export interface CrosswordConfig extends BaseConfig {
  kind: 'crossword';
  difficulty: CrosswordDifficulty;
  /** Wort-Themen; leer bedeutet: die Wortliste des gewählten Themen-Designs. Mehrere sind kombinierbar. */
  topics: string[];
}

/**
 * Das Kreuzworträtsel kennt eine Stufe mehr als die übrigen Rätseltypen: die
 * Hinweise stehen im unteren Viertel, darüber ist Platz für ein grösseres
 * Gitter.
 */
export const CROSSWORD_DIFFICULTIES: readonly CrosswordDifficulty[] = [
  'easy',
  'medium',
  'hard',
  'extra-hard',
];

export type PuzzleConfig =
  | WordSearchConfig
  | MazeConfig
  | SudokuConfig
  | DotToDotConfig
  | ShadowMatchConfig
  | CrosswordConfig;

/** Auswahlliste der Punkte-zu-Punkte-Formen für die Oberfläche. */
export const SHAPE_CHOICES: readonly { id: string; name: string }[] = SHAPE_IDS.map((id) => ({
  id,
  name: id.charAt(0).toUpperCase() + id.slice(1),
}));

/** Wortliste eines Themas, gekürzt auf eine bequeme Anzahl fürs Gitter. */
export function themeWords(themeId: string, count = 12): string[] {
  return themeById(themeId).words.slice(0, count);
}

/** Auswahlliste für die Oberfläche: Standarddesign zuerst, dann die Themes. */
export const THEME_CHOICES: readonly { id: string; name: string; color: string }[] = [
  { id: NEUTRAL_THEME.id, name: NEUTRAL_THEME.name, color: NEUTRAL_THEME.colors.accent },
  ...THEMES.map((theme) => ({ id: theme.id, name: theme.name, color: theme.colors.accent })),
];

const randomSeed = (): string => Math.random().toString(36).slice(2, 8);

/** Kindergrössen zeigen standardmässig Symbole, das 9×9 immer Zahlen. */
export const defaultSymbols = (size: SudokuSize): boolean => size <= 6;

export function defaultConfig(kind: PuzzleKind): PuzzleConfig {
  const seed = randomSeed();
  switch (kind) {
    case 'wordsearch':
      return {
        kind,
        theme: NEUTRAL_THEME.id,
        title: 'Wortsuchrätsel',
        subtitle: '',
        seed,
        words: themeWords('piraten').join(', '),
        size: 12,
        difficulty: 'medium',
        umlauts: 'keep',
      };
    case 'maze':
      return {
        kind,
        theme: NEUTRAL_THEME.id,
        title: 'Labyrinth',
        subtitle: '',
        seed,
        difficulty: 'medium',
      };
    case 'sudoku':
      return {
        kind,
        theme: NEUTRAL_THEME.id,
        title: 'Sudoku',
        subtitle: '',
        seed,
        size: 9,
        difficulty: 'easy',
        symbols: defaultSymbols(9),
      };
    case 'dot-to-dot':
      return {
        kind,
        theme: NEUTRAL_THEME.id,
        title: 'Punkte-zu-Punkte',
        subtitle: '',
        seed,
        difficulty: 'medium',
        shapeId: SHAPE_IDS[0] as string,
      };
    case 'shadow-match':
      return {
        kind,
        theme: NEUTRAL_THEME.id,
        title: 'Schattenrätsel',
        subtitle: '',
        seed,
        difficulty: 'medium',
      };
    case 'crossword':
      return {
        kind,
        theme: NEUTRAL_THEME.id,
        title: 'Kreuzworträtsel',
        subtitle: '',
        seed,
        difficulty: 'medium',
        topics: [],
      };
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

const TOPIC_IDS = new Set(CROSSWORD_TOPICS.map((topic) => topic.id));

/** Nur bekannte, doppelfreie Ids, bis zur Höchstzahl kombinierbarer Wort-Themen. */
export function sanitizeTopics(ids: readonly string[]): string[] {
  const unique: string[] = [];
  for (const id of ids) {
    if (!TOPIC_IDS.has(id) || unique.includes(id)) continue;
    unique.push(id);
    if (unique.length >= MAX_CROSSWORD_TOPICS) break;
  }
  return unique;
}

/** Kurze Parameternamen, damit geteilte Links nicht ausufern. */
export function configToParams(config: PuzzleConfig): URLSearchParams {
  const params = new URLSearchParams();
  const base = defaultConfig(config.kind);
  const set = (key: string, value: string, fallback: string): void => {
    if (value !== fallback) params.set(key, value);
  };
  set('th', config.theme, base.theme);
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
      // Der Standard hängt an der Grösse; nur die Abweichung landet im Link.
      set('sy', config.symbols ? '1' : '0', defaultSymbols(config.size) ? '1' : '0');
      break;
    }
    case 'dot-to-dot': {
      const b = base as DotToDotConfig;
      set('d', config.difficulty, b.difficulty);
      set('fo', config.shapeId, b.shapeId);
      break;
    }
    case 'shadow-match':
      set('d', config.difficulty, (base as ShadowMatchConfig).difficulty);
      break;
    case 'crossword': {
      const b = base as CrosswordConfig;
      set('d', config.difficulty, b.difficulty);
      set('to', sanitizeTopics(config.topics).join(','), b.topics.join(','));
      break;
    }
  }
  return params;
}

/** Liest eine Konfiguration aus URL-Parametern; fehlende Werte kommen aus den Standardwerten. */
export function configFromParams(kind: PuzzleKind, params: URLSearchParams): PuzzleConfig {
  const base = defaultConfig(kind);
  const common = {
    theme: themeById(params.get('th') ?? undefined).id,
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
      const raw = clampInt(params.get('g'), 4, 9, b.size);
      const size: SudokuSize = raw === 4 || raw === 6 ? raw : 9;
      const symbols = params.get('sy');
      return {
        kind,
        ...common,
        size,
        difficulty: oneOf(params.get('d'), ['easy', 'medium', 'hard'] as const, b.difficulty),
        symbols: symbols === null ? defaultSymbols(size) : symbols === '1',
      };
    }
    case 'dot-to-dot': {
      const b = base as DotToDotConfig;
      return {
        kind,
        ...common,
        difficulty: oneOf(params.get('d'), ['easy', 'medium', 'hard'] as const, b.difficulty),
        shapeId: oneOf(params.get('fo'), SHAPE_IDS, b.shapeId),
      };
    }
    case 'shadow-match':
      return {
        kind,
        ...common,
        difficulty: oneOf(
          params.get('d'),
          ['easy', 'medium', 'hard'] as const,
          (base as ShadowMatchConfig).difficulty,
        ),
      };
    case 'crossword': {
      const b = base as CrosswordConfig;
      const topics = params.get('to');
      return {
        kind,
        ...common,
        difficulty: oneOf(params.get('d'), CROSSWORD_DIFFICULTIES, b.difficulty),
        topics: topics === null ? b.topics : sanitizeTopics(topics.split(',').filter(Boolean)),
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
