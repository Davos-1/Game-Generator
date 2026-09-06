import { createRng, type Rng } from '../random';
import { DEFAULT_BLACKLIST } from './data/blacklist';
import { GERMAN_LETTER_FREQUENCY, GERMAN_UMLAUT_FREQUENCY } from './data/letterFrequency';
import { cellsFor, fits } from './directions';
import { blacklistVariants, normalizeWord } from './normalize';
import { findWord } from './solver';
import {
  DIRECTIONS_BY_DIFFICULTY,
  type Cell,
  type Direction,
  type PlacedWord,
  type RejectedWord,
  type WordSearchOptions,
  type WordSearchPuzzle,
} from './types';
import { validateWordSearch, type ValidationIssue } from './validate';

export const MIN_SIZE = 8;
export const MAX_SIZE = 20;

/** Obergrenze an Platzierungsversuchen pro Durchlauf, damit das Backtracking nie explodiert. */
const PLACEMENT_BUDGET = 20_000;
/** Wie oft die Füllbuchstaben neu gewürfelt werden, bevor die Platzierung verworfen wird. */
const FILL_ATTEMPTS = 30;

interface Candidate {
  start: Cell;
  direction: Direction;
  cells: Cell[];
}

interface NormalizedWord {
  word: string;
  original: string;
}

/**
 * Erzeugt ein Wortsuchrätsel. Deterministisch: gleicher Seed und gleiche
 * Optionen ergeben exakt dasselbe Gitter.
 *
 * Wirft `RangeError` bei ungültiger Gittergrösse und `Error`, wenn auch nach
 * allen Versuchen kein gültiges Gitter entsteht (praktisch nur bei absurden
 * Eingaben wie 30 Zwanzig-Buchstaben-Wörtern auf 8×8).
 */
export function generateWordSearch(options: WordSearchOptions): WordSearchPuzzle {
  const width = options.width ?? 12;
  const height = options.height ?? width;
  assertSize(width, 'width');
  assertSize(height, 'height');

  const umlauts = options.umlauts ?? 'keep';
  const directions = [
    ...(options.directions ?? DIRECTIONS_BY_DIFFICULTY[options.difficulty ?? 'medium']),
  ];
  if (directions.length === 0) throw new RangeError('Mindestens eine Richtung ist nötig');
  const blacklist = options.blacklist ?? DEFAULT_BLACKLIST;
  // Nur exakte Treffer weisen ein Nutzerwort ab; Teilwörter (SAU in DINOSAURIER) sind erlaubt.
  const blacklistNormalized = blacklist.flatMap(blacklistVariants).filter((w) => w.length >= 2);
  const maxAttempts = options.maxAttempts ?? 20;

  const { accepted, rejected } = prepareWords(options.words, {
    umlauts,
    maxLength: Math.max(width, height),
    blacklist: blacklistNormalized,
  });

  const useUmlautFillers = umlauts === 'keep' && accepted.some((w) => /[ÄÖÜ]/.test(w.word));
  const fillerAlphabet = useUmlautFillers
    ? [...GERMAN_LETTER_FREQUENCY, ...GERMAN_UMLAUT_FREQUENCY]
    : [...GERMAN_LETTER_FREQUENCY];

  let best: { placed: PlacedWord[]; grid: string[][] } | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rng = createRng(`${String(options.seed)}:${attempt}`);
    const placement = placeWords(accepted, width, height, directions, rng);

    if (!best || placement.placed.length > best.placed.length) best = placement;
    if (placement.placed.length < accepted.length) continue;

    const filled = fillAndValidate(placement, fillerAlphabet, blacklist, rng);
    if (filled.ok) return finish(filled.grid, placement.placed);
  }

  // Kein vollständiger Durchlauf: bestes Teilergebnis füllen und Rest als «unplaced» melden.
  // Wörter, die durch die Platzierung selbst mehrdeutig wurden, fliegen nacheinander raus.
  let partial = best ?? { placed: [], grid: emptyGrid(width, height) };
  for (let round = 0; round <= partial.placed.length; round++) {
    const rng = createRng(`${String(options.seed)}:partial:${round}`);
    const filled = fillAndValidate(partial, fillerAlphabet, blacklist, rng);
    if (filled.ok) return finish(filled.grid, partial.placed);
    const ambiguous = new Set(
      filled.issues.flatMap((i) =>
        i.kind === 'not-unique' || i.kind === 'grid-mismatch' ? [i.word] : [],
      ),
    );
    if (ambiguous.size === 0) break;
    partial = rebuild(
      partial.placed.filter((p) => !ambiguous.has(p.word)),
      width,
      height,
    );
  }
  throw new Error('Konnte kein gültiges Gitter erzeugen. Weniger oder kürzere Wörter wählen.');

  function finish(grid: string[][], placed: PlacedWord[]): WordSearchPuzzle {
    const placedSet = new Set(placed.map((p) => p.word));
    return {
      width,
      height,
      grid,
      placed,
      unplaced: accepted.filter((w) => !placedSet.has(w.word)).map((w) => w.word),
      rejected,
      directions,
      umlauts,
      seed: options.seed,
    };
  }
}

function emptyGrid(width: number, height: number): string[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => ''));
}

/** Baut das Gitter nur aus den übergebenen Platzierungen neu auf. */
function rebuild(
  placed: PlacedWord[],
  width: number,
  height: number,
): { placed: PlacedWord[]; grid: string[][] } {
  const grid = emptyGrid(width, height);
  for (const p of placed) {
    p.cells.forEach((cell, i) => {
      (grid[cell.row] as string[])[cell.col] = p.word[i] as string;
    });
  }
  return { placed, grid };
}

function assertSize(value: number, name: string): void {
  if (!Number.isInteger(value) || value < MIN_SIZE || value > MAX_SIZE) {
    throw new RangeError(`${name} muss eine Ganzzahl zwischen ${MIN_SIZE} und ${MAX_SIZE} sein`);
  }
}

function prepareWords(
  input: readonly string[],
  opts: { umlauts: 'keep' | 'expand'; maxLength: number; blacklist: readonly string[] },
): { accepted: NormalizedWord[]; rejected: RejectedWord[] } {
  const accepted: NormalizedWord[] = [];
  const rejected: RejectedWord[] = [];
  const seen = new Set<string>();

  for (const original of input) {
    const word = normalizeWord(original, opts.umlauts);
    if (word.length < 2) {
      rejected.push({ original, reason: 'empty' });
    } else if (word.length > opts.maxLength) {
      rejected.push({ original, reason: 'too-long' });
    } else if (seen.has(word)) {
      rejected.push({ original, reason: 'duplicate' });
    } else if (opts.blacklist.includes(word)) {
      rejected.push({ original, reason: 'blacklisted' });
    } else {
      seen.add(word);
      accepted.push({ word, original });
    }
  }

  // Längste zuerst: schwer platzierbare Wörter kommen dran, solange das Gitter leer ist.
  accepted.sort((a, b) => b.word.length - a.word.length);
  return { accepted, rejected };
}

function placeWords(
  words: readonly NormalizedWord[],
  width: number,
  height: number,
  directions: readonly Direction[],
  rng: Rng,
): { placed: PlacedWord[]; grid: string[][] } {
  const grid = emptyGrid(width, height);
  const placed: PlacedWord[] = [];
  const placedCellSets: Set<string>[] = [];
  let bestPlaced: PlacedWord[] = [];
  let bestGrid: string[][] = grid.map((row) => [...row]);
  let budget = PLACEMENT_BUDGET;

  const candidatesFor = (word: string): Candidate[] => {
    const result: Candidate[] = [];
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        for (const direction of directions) {
          const start = { row, col };
          if (!fits(start, direction, word.length, width, height)) continue;
          const cells = cellsFor(start, direction, word.length);
          let conflict = false;
          let freeCells = 0;
          for (let i = 0; i < cells.length; i++) {
            const cell = cells[i] as Cell;
            const existing = grid[cell.row]?.[cell.col] ?? '';
            if (existing === '') freeCells++;
            else if (existing !== word[i]) {
              conflict = true;
              break;
            }
          }
          // Mindestens eine freie Zelle, sonst läge das Wort komplett in einem anderen.
          if (!conflict && freeCells > 0) result.push({ start, direction, cells });
        }
      }
    }
    return rng.shuffle(result);
  };

  const backtrack = (index: number): boolean => {
    if (index === words.length) return true;
    const entry = words[index] as NormalizedWord;
    for (const candidate of candidatesFor(entry.word)) {
      if (budget-- <= 0) return false;
      const written: Cell[] = [];
      candidate.cells.forEach((cell, i) => {
        const row = grid[cell.row] as string[];
        if (row[cell.col] === '') {
          row[cell.col] = entry.word[i] as string;
          written.push(cell);
        }
      });
      // Das Wort darf durch bereits gesetzte Buchstaben nicht ein zweites Mal lesbar sein
      // (z. B. diagonal durch mehrere parallele Wörter hindurch).
      if (readings(grid, entry.word, placedCellSets) !== 1) {
        for (const cell of written) (grid[cell.row] as string[])[cell.col] = '';
        continue;
      }
      placed.push({
        word: entry.word,
        original: entry.original,
        start: candidate.start,
        direction: candidate.direction,
        cells: candidate.cells,
      });
      placedCellSets.push(new Set(candidate.cells.map((c) => `${c.row},${c.col}`)));
      if (placed.length > bestPlaced.length) {
        bestPlaced = [...placed];
        bestGrid = grid.map((row) => [...row]);
      }
      if (backtrack(index + 1)) return true;
      placed.pop();
      placedCellSets.pop();
      for (const cell of written) (grid[cell.row] as string[])[cell.col] = '';
      if (budget <= 0) return false;
    }
    return false;
  };

  if (backtrack(0)) return { placed, grid };
  return { placed: bestPlaced, grid: bestGrid };
}

/** Anzahl verschiedener Lesarten (Zellmengen) eines Worts im Gitter; leere Zellen passen nie. */
function readings(
  grid: readonly (readonly string[])[],
  word: string,
  placedCellSets: readonly ReadonlySet<string>[],
): number {
  const keys = new Set<string>();
  for (const occ of findWord(grid, word)) {
    const cellKeys = occ.cells.map((c) => `${c.row},${c.col}`);
    // Lesarten innerhalb eines anderen Worts (ARM in ARMBAND) sind erlaubt und zählen nicht.
    if (placedCellSets.some((set) => cellKeys.every((k) => set.has(k)))) continue;
    keys.add([...cellKeys].sort().join('|'));
  }
  return keys.size;
}

type FillResult =
  { ok: true; grid: string[][] } | { ok: false; issues: readonly ValidationIssue[] };

function fillAndValidate(
  placement: { placed: PlacedWord[]; grid: string[][] },
  alphabet: readonly (readonly [string, number])[],
  blacklist: readonly string[],
  rng: Rng,
): FillResult {
  const totalWeight = alphabet.reduce((sum, [, w]) => sum + w, 0);
  const pickLetter = (): string => {
    let r = rng.next() * totalWeight;
    for (const [letter, weight] of alphabet) {
      r -= weight;
      if (r <= 0) return letter;
    }
    return alphabet[alphabet.length - 1]?.[0] ?? 'E';
  };

  let issues: readonly ValidationIssue[] = [];
  for (let attempt = 0; attempt < FILL_ATTEMPTS; attempt++) {
    const grid = placement.grid.map((row) =>
      row.map((letter) => (letter === '' ? pickLetter() : letter)),
    );
    const result = validateWordSearch({ grid, placed: placement.placed }, blacklist);
    if (result.ok) return { ok: true, grid };
    issues = result.issues;
    // Strukturelle Probleme (Mehrdeutigkeit durch die Platzierung) löst kein Neu-Füllen.
    if (issues.some((i) => i.kind === 'not-unique' || i.kind === 'grid-mismatch')) break;
  }
  return { ok: false, issues };
}
