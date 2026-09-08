import { createRng, type Rng } from '../random';
import { normalizeWord } from '../wordsearch/normalize';
import {
  MAX_WORD_LENGTH,
  MIN_PLACED_WORDS,
  MIN_WORD_LENGTH,
  WORD_TARGET_BY_DIFFICULTY,
  type CrosswordDirection,
  type CrosswordOptions,
  type CrosswordPuzzle,
  type CrosswordWord,
} from './types';

interface Candidate {
  word: string;
  clue: string;
}

interface Placement {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: CrosswordDirection;
}

/** Startpunkt des ersten Worts; Koordinaten dürfen beim Bauen negativ werden, am Ende wird zugeschnitten. */
const ORIGIN = 40;

/** Bereitet die Eingabe auf: normalisiert, entfernt Duplikate und unpassende Längen. */
function prepareCandidates(entries: readonly { word: string; clue: string }[]): Candidate[] {
  const seen = new Set<string>();
  const candidates: Candidate[] = [];
  for (const entry of entries) {
    const word = normalizeWord(entry.word, 'keep');
    if (word.length < MIN_WORD_LENGTH || word.length > MAX_WORD_LENGTH) continue;
    if (seen.has(word)) continue;
    seen.add(word);
    candidates.push({ word, clue: entry.clue });
  }
  return candidates;
}

/** Zufällige Reihenfolge, längere Wörter im Schnitt zuerst: sie tragen das Gitter. */
function orderCandidates(candidates: readonly Candidate[], rng: Rng): Candidate[] {
  return rng
    .shuffle(candidates)
    .map((candidate, index) => ({ candidate, index }))
    .sort((a, b) => b.candidate.word.length - a.candidate.word.length || a.index - b.index)
    .map(({ candidate }) => candidate);
}

function letterAt(grid: Map<string, string>, row: number, col: number): string | undefined {
  return grid.get(`${row},${col}`);
}

/**
 * Prüft, ob `word` an (row, col) in `direction` gesetzt werden darf: keine
 * widersprüchlichen Buchstaben, keine Berührung mit fremden Wortenden, keine
 * parallel anliegenden Buchstaben ausser an echten Kreuzungen.
 */
function canPlace(
  grid: Map<string, string>,
  word: string,
  row: number,
  col: number,
  direction: CrosswordDirection,
): boolean {
  const dr = direction === 'down' ? 1 : 0;
  const dc = direction === 'across' ? 1 : 0;
  // Vor dem Start und nach dem Ende muss das Feld leer sein.
  if (letterAt(grid, row - dr, col - dc) !== undefined) return false;
  if (letterAt(grid, row + dr * word.length, col + dc * word.length) !== undefined) return false;

  let crossings = 0;
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const existing = letterAt(grid, r, c);
    if (existing !== undefined) {
      if (existing !== word[i]) return false;
      crossings++;
      continue;
    }
    // Kein Nachbar quer zur Laufrichtung, sonst entstünde ein ungeplanter Buchstabenlauf.
    const sideA = direction === 'across' ? letterAt(grid, r - 1, c) : letterAt(grid, r, c - 1);
    const sideB = direction === 'across' ? letterAt(grid, r + 1, c) : letterAt(grid, r, c + 1);
    if (sideA !== undefined || sideB !== undefined) return false;
  }
  return crossings > 0;
}

function place(
  grid: Map<string, string>,
  word: string,
  row: number,
  col: number,
  direction: CrosswordDirection,
): void {
  const dr = direction === 'down' ? 1 : 0;
  const dc = direction === 'across' ? 1 : 0;
  for (let i = 0; i < word.length; i++) {
    grid.set(`${row + dr * i},${col + dc * i}`, word[i] as string);
  }
}

/** Sucht alle gültigen Kreuzungs-Positionen für `word` gegen die bereits gesetzten Wörter. */
function findPlacements(
  grid: Map<string, string>,
  placed: readonly Placement[],
  word: string,
): { row: number; col: number; direction: CrosswordDirection; crossings: number }[] {
  const options: { row: number; col: number; direction: CrosswordDirection; crossings: number }[] =
    [];
  for (const existing of placed) {
    const perpendicular: CrosswordDirection = existing.direction === 'across' ? 'down' : 'across';
    for (let i = 0; i < existing.word.length; i++) {
      for (let j = 0; j < word.length; j++) {
        if (existing.word[i] !== word[j]) continue;
        const row = perpendicular === 'down' ? existing.row - j : existing.row + i;
        const col = perpendicular === 'down' ? existing.col + i : existing.col - j;
        if (!canPlace(grid, word, row, col, perpendicular)) continue;
        let crossings = 0;
        for (let k = 0; k < word.length; k++) {
          const r = perpendicular === 'down' ? row + k : row;
          const c = perpendicular === 'down' ? col : col + k;
          if (letterAt(grid, r, c) !== undefined) crossings++;
        }
        options.push({ row, col, direction: perpendicular, crossings });
      }
    }
  }
  return options;
}

/** Baut ein Gitter aus möglichst vielen der gegebenen Kandidaten. */
function buildGrid(candidates: readonly Candidate[], target: number, rng: Rng): Placement[] {
  const ordered = orderCandidates(candidates, rng);
  const grid = new Map<string, string>();
  const placed: Placement[] = [];

  const first = ordered[0];
  if (!first) return placed;
  const startRow = ORIGIN;
  const startCol = ORIGIN;
  place(grid, first.word, startRow, startCol, 'across');
  placed.push({ ...first, row: startRow, col: startCol, direction: 'across' });

  for (const candidate of ordered.slice(1)) {
    if (placed.length >= target) break;
    const options = findPlacements(grid, placed, candidate.word);
    if (options.length === 0) continue;
    // Bei mehreren Optionen die mit den meisten Kreuzungen wählen (dichteres
    // Gitter), unter Gleichstand zufällig für Abwechslung je Seed.
    const best = Math.max(...options.map((o) => o.crossings));
    const bestOptions = options.filter((o) => o.crossings === best);
    const choice = rng.pick(bestOptions);
    place(grid, candidate.word, choice.row, choice.col, choice.direction);
    placed.push({ ...candidate, row: choice.row, col: choice.col, direction: choice.direction });
  }
  return placed;
}

/** Nummeriert die Startfelder wie im gedruckten Kreuzworträtsel üblich. */
function numberWords(
  placed: readonly Placement[],
  minRow: number,
  minCol: number,
): CrosswordWord[] {
  const starts = new Map<string, number>();
  const sorted = [...placed].sort((a, b) => a.row - b.row || a.col - b.col);
  const uniqueStarts = Array.from(new Set(sorted.map((p) => `${p.row},${p.col}`))).sort((a, b) => {
    const [ar, ac] = a.split(',').map(Number);
    const [br, bc] = b.split(',').map(Number);
    return (ar as number) - (br as number) || (ac as number) - (bc as number);
  });
  uniqueStarts.forEach((key, index) => starts.set(key, index + 1));

  return placed.map((p) => ({
    word: p.word,
    clue: p.clue,
    row: p.row - minRow,
    col: p.col - minCol,
    direction: p.direction,
    number: starts.get(`${p.row},${p.col}`) as number,
  }));
}

/**
 * Erzeugt ein Kreuzworträtsel aus einer Wort-Hinweis-Liste. Deterministisch
 * pro Seed; bei zu wenig platzierbaren Wörtern wird mit abgeleitetem Seed
 * neu gemischt.
 */
export function generateCrossword(options: CrosswordOptions): CrosswordPuzzle {
  const difficulty = options.difficulty ?? 'medium';
  const target = WORD_TARGET_BY_DIFFICULTY[difficulty];
  const candidates = prepareCandidates(options.entries);
  if (candidates.length < MIN_PLACED_WORDS) {
    throw new RangeError(
      `Mindestens ${MIN_PLACED_WORDS} gültige Wörter nötig, ${candidates.length} übergeben`,
    );
  }

  const maxAttempts = 30;
  let best: Placement[] = [];
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rng = createRng(`${String(options.seed)}:crossword:${attempt}`);
    const placed = buildGrid(candidates, target, rng);
    if (placed.length > best.length) best = placed;
    if (placed.length >= Math.min(target, candidates.length)) break;
    if (placed.length >= MIN_PLACED_WORDS && attempt >= 5) break;
  }
  if (best.length < MIN_PLACED_WORDS) {
    throw new Error('Konnte kein Kreuzworträtsel mit genug Wörtern erzeugen.');
  }

  let minRow = Infinity;
  let minCol = Infinity;
  let maxRow = -Infinity;
  let maxCol = -Infinity;
  for (const p of best) {
    const endRow = p.direction === 'down' ? p.row + p.word.length - 1 : p.row;
    const endCol = p.direction === 'across' ? p.col + p.word.length - 1 : p.col;
    minRow = Math.min(minRow, p.row);
    minCol = Math.min(minCol, p.col);
    maxRow = Math.max(maxRow, endRow);
    maxCol = Math.max(maxCol, endCol);
  }
  const width = maxCol - minCol + 1;
  const height = maxRow - minRow + 1;
  const words = numberWords(best, minRow, minCol);

  const solution: string[][] = Array.from({ length: height }, () => Array<string>(width).fill(''));
  const fillable: boolean[][] = Array.from({ length: height }, () =>
    Array<boolean>(width).fill(false),
  );
  for (const p of words) {
    const dr = p.direction === 'down' ? 1 : 0;
    const dc = p.direction === 'across' ? 1 : 0;
    for (let i = 0; i < p.word.length; i++) {
      const r = p.row + dr * i;
      const c = p.col + dc * i;
      (solution[r] as string[])[c] = p.word[i] as string;
      (fillable[r] as boolean[])[c] = true;
    }
  }

  return { width, height, solution, fillable, words, difficulty, seed: options.seed };
}
