import { NEUTRAL_THEME, themeById } from '@raetselheft/render/themes';
import {
  defaultSymbols,
  newSeed,
  parseWords,
  sanitizeTopics,
  SHAPE_CHOICES,
  themeWords,
  type PuzzleKind,
} from './puzzleConfig';

export const MIN_ENTRIES = 4;
export const MAX_ENTRIES = 16;

/** Ein Rätsel im Heft. Titel und Theme kommen vom Heft, nicht vom Eintrag. */
export interface BookletEntry {
  /** Stabile Id für Listen und Drag-and-drop. */
  id: string;
  kind: PuzzleKind;
  seed: string;
  /** Seitentitel; leer bedeutet Standardtitel des Rätseltyps. */
  caption: string;
  difficulty: 'easy' | 'medium' | 'hard';
  /** Wortsuchrätsel: Rohtext der Wortliste. */
  words: string;
  /** Wortsuchrätsel: Gittergrösse. */
  size: number;
  /** Sudoku: 4, 6 oder 9. */
  sudokuSize: 4 | 6 | 9;
  /** Sudoku: Symbole statt Zahlen (nur bei 4×4 und 6×6). */
  sudokuSymbols: boolean;
  /** Punkte-zu-Punkte: welche Form verbunden wird. */
  dotToDotShapeId: string;
  /** Kreuzworträtsel: Wort-Themen; leer bedeutet die Wortliste des Heft-Themen-Designs. */
  crosswordTopics: string[];
}

export interface BookletConfig {
  theme: string;
  title: string;
  name: string;
  occasion: string;
  date: string;
  greeting: string;
  entries: BookletEntry[];
}

const id = (): string => Math.random().toString(36).slice(2, 9);

export function newEntry(kind: PuzzleKind, themeId: string): BookletEntry {
  return {
    id: id(),
    kind,
    seed: newSeed(),
    caption: '',
    difficulty: 'medium',
    words: themeWords(themeId, 12).join(', '),
    size: 12,
    // Für alle Typen gleich vorbelegt, damit der Wert einen Speicher-Rundlauf
    // unverändert übersteht; wirksam ist er nur beim Sudoku.
    sudokuSize: 6,
    sudokuSymbols: true,
    dotToDotShapeId: SHAPE_CHOICES[0]?.id ?? 'stern',
    crosswordTopics: [],
  };
}

export function defaultBooklet(): BookletConfig {
  const theme = 'piraten';
  return {
    theme,
    title: 'Rätselheft',
    name: '',
    occasion: '',
    date: '',
    greeting: 'Viel Spass beim Rätseln!',
    entries: [
      newEntry('wordsearch', theme),
      newEntry('maze', theme),
      newEntry('sudoku', theme),
      newEntry('wordsearch', theme),
    ],
  };
}

/** Kompakte Form für Speicher und Link: kurze Schlüssel, keine Standardwerte. */
interface CompactEntry {
  k: PuzzleKind;
  s: string;
  c?: string;
  d?: string;
  w?: string;
  g?: number;
  z?: number;
  y?: 0 | 1;
  f?: string;
  ct?: string;
}

interface CompactBooklet {
  th: string;
  t: string;
  n?: string;
  o?: string;
  da?: string;
  gr?: string;
  e: CompactEntry[];
}

export function toCompact(config: BookletConfig): CompactBooklet {
  const compact: CompactBooklet = {
    th: config.theme,
    t: config.title,
    e: config.entries.map((entry) => {
      const item: CompactEntry = { k: entry.kind, s: entry.seed };
      if (entry.caption) item.c = entry.caption;
      if (entry.difficulty !== 'medium') item.d = entry.difficulty;
      if (entry.kind === 'wordsearch') {
        item.w = parseWords(entry.words).join(',');
        if (entry.size !== 12) item.g = entry.size;
      }
      if (entry.kind === 'sudoku') {
        if (entry.sudokuSize !== 6) item.z = entry.sudokuSize;
        if (entry.sudokuSymbols !== defaultSymbols(entry.sudokuSize)) {
          item.y = entry.sudokuSymbols ? 1 : 0;
        }
      }
      if (
        entry.kind === 'dot-to-dot' &&
        entry.dotToDotShapeId !== (SHAPE_CHOICES[0]?.id ?? 'stern')
      ) {
        item.f = entry.dotToDotShapeId;
      }
      if (entry.kind === 'crossword' && entry.crosswordTopics.length > 0) {
        item.ct = sanitizeTopics(entry.crosswordTopics).join(',');
      }
      return item;
    }),
  };
  if (config.name) compact.n = config.name;
  if (config.occasion) compact.o = config.occasion;
  if (config.date) compact.da = config.date;
  if (config.greeting) compact.gr = config.greeting;
  return compact;
}

const asDifficulty = (value: unknown): 'easy' | 'medium' | 'hard' =>
  value === 'easy' || value === 'hard' ? value : 'medium';

const asKind = (value: unknown): PuzzleKind =>
  value === 'maze' || value === 'sudoku' || value === 'dot-to-dot' || value === 'crossword'
    ? value
    : 'wordsearch';

export function fromCompact(input: unknown): BookletConfig {
  const base = defaultBooklet();
  if (typeof input !== 'object' || input === null) return base;
  const compact = input as Partial<CompactBooklet>;
  const theme = themeById(compact.th).id;
  const entries = Array.isArray(compact.e) ? compact.e.slice(0, MAX_ENTRIES) : [];
  return {
    theme,
    title: typeof compact.t === 'string' ? compact.t : base.title,
    name: typeof compact.n === 'string' ? compact.n : '',
    occasion: typeof compact.o === 'string' ? compact.o : '',
    date: typeof compact.da === 'string' ? compact.da : '',
    greeting: typeof compact.gr === 'string' ? compact.gr : '',
    entries:
      entries.length > 0
        ? entries.map((item) => {
            const kind = asKind(item?.k);
            const fallback = newEntry(kind, theme);
            const sudokuSize: BookletEntry['sudokuSize'] =
              item?.z === 4 || item?.z === 9 ? item.z : 6;
            return {
              ...fallback,
              kind,
              seed: typeof item?.s === 'string' ? item.s : fallback.seed,
              caption: typeof item?.c === 'string' ? item.c : '',
              difficulty: asDifficulty(item?.d),
              words: typeof item?.w === 'string' ? parseWords(item.w).join(', ') : fallback.words,
              size: typeof item?.g === 'number' && item.g >= 8 && item.g <= 20 ? item.g : 12,
              sudokuSize,
              sudokuSymbols: item?.y === undefined ? defaultSymbols(sudokuSize) : item.y === 1,
              dotToDotShapeId:
                typeof item?.f === 'string' && SHAPE_CHOICES.some((choice) => choice.id === item.f)
                  ? item.f
                  : fallback.dotToDotShapeId,
              crosswordTopics:
                typeof item?.ct === 'string'
                  ? sanitizeTopics(item.ct.split(',').filter(Boolean))
                  : fallback.crosswordTopics,
            };
          })
        : base.entries,
  };
}

const STORAGE_KEY = 'raetselheft:booklet';

export function saveBooklet(config: BookletConfig): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toCompact(config)));
  } catch {
    // Privater Modus oder voller Speicher: Persistenz ist optional.
  }
}

export function loadBooklet(): BookletConfig | undefined {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? fromCompact(JSON.parse(raw)) : undefined;
  } catch {
    return undefined;
  }
}

/** Ab dieser Länge wird ein Link in manchen Browsern unzuverlässig. */
export const MAX_LINK_LENGTH = 1800;

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (text: string): Uint8Array => {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

async function squeeze(bytes: Uint8Array, format: 'deflate-raw'): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function expand(bytes: Uint8Array, format: 'deflate-raw'): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Heft-Konfiguration als komprimierter URL-Parameter. Ein Heft mit vielen
 * eigenen Wörtern wird schnell lang, deshalb wird der JSON-Text vor dem
 * Kodieren gepackt.
 */
export async function encodeBooklet(config: BookletConfig): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(toCompact(config)));
  return toBase64Url(await squeeze(json, 'deflate-raw'));
}

export async function decodeBooklet(param: string): Promise<BookletConfig | undefined> {
  try {
    const raw = await expand(fromBase64Url(param), 'deflate-raw');
    return fromCompact(JSON.parse(new TextDecoder().decode(raw)));
  } catch {
    return undefined;
  }
}

/** Sprechender Dateiname des Hefts. */
export function bookletFileName(config: BookletConfig): string {
  const slug = (text: string): string =>
    text
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  const theme = config.theme === NEUTRAL_THEME.id ? '' : slug(themeById(config.theme).name);
  const parts = [theme, slug(config.title), slug(config.name)].filter(Boolean);
  return `${parts.join('-') || 'raetselheft'}.pdf`;
}
