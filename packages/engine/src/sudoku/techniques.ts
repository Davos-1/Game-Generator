import { bit, digitsOf, geometryFor, popcount, type Geometry } from './geometry';
import { candidatesFor, isConsistent } from './solver';
import type { RatingLevel, SudokuRating, SudokuSize, Technique } from './types';

/**
 * Technik-Solver: löst ein Sudoku ausschliesslich mit menschlichen
 * Lösungstechniken (kein Raten) und protokolliert, welche nötig waren.
 * Daraus entsteht das Rating.
 */

const LEVEL_OF: Readonly<Record<Technique, RatingLevel>> = {
  'naked-single': 'easy',
  'hidden-single': 'easy',
  'naked-pair': 'medium',
  'box-line': 'medium',
  'hidden-pair': 'hard',
  'naked-triple': 'hard',
  'x-wing': 'hard',
  guess: 'expert',
};

type Step = (state: State) => boolean;
type SolvableTechnique = Exclude<Technique, 'guess'>;

const ORDER: readonly SolvableTechnique[] = [
  'naked-single',
  'hidden-single',
  'naked-pair',
  'box-line',
  'hidden-pair',
  'naked-triple',
  'x-wing',
];

const LEVEL_RANK: Readonly<Record<RatingLevel, number>> = {
  easy: 0,
  medium: 1,
  hard: 2,
  expert: 3,
};

export interface TechniqueSolveResult {
  solved: boolean;
  grid: number[];
  rating: SudokuRating;
}

interface State {
  geo: Geometry;
  grid: number[];
  masks: number[];
}

export function solveWithTechniques(
  input: readonly number[],
  size: SudokuSize,
): TechniqueSolveResult {
  const geo = geometryFor(size);
  const state: State = { geo, grid: [...input], masks: candidatesFor(input, geo) };
  const used = new Set<Technique>();

  if (!isConsistent(state.grid, geo)) {
    return { solved: false, grid: state.grid, rating: makeRating(['guess']) };
  }

  // Immer die einfachste Technik zuerst; sobald eine greift, von vorne beginnen.
  outer: while (state.grid.some((v) => v === 0)) {
    for (const technique of ORDER) {
      if (STEPS[technique](state)) {
        used.add(technique);
        continue outer;
      }
    }
    used.add('guess');
    break;
  }

  const solved = state.grid.every((v) => v > 0) && isConsistent(state.grid, geo);
  return { solved, grid: state.grid, rating: makeRating([...used]) };
}

const rankInOrder = (t: Technique): number => (t === 'guess' ? ORDER.length : ORDER.indexOf(t));

function makeRating(techniques: readonly Technique[]): SudokuRating {
  let hardest: Technique = 'naked-single';
  for (const t of techniques) {
    if (LEVEL_RANK[LEVEL_OF[t]] > LEVEL_RANK[LEVEL_OF[hardest]]) hardest = t;
    else if (LEVEL_OF[t] === LEVEL_OF[hardest] && rankInOrder(t) > rankInOrder(hardest))
      hardest = t;
  }
  return { level: LEVEL_OF[hardest], hardestTechnique: hardest, techniques: [...techniques] };
}

function place(state: State, index: number, digit: number): void {
  state.grid[index] = digit;
  state.masks[index] = 0;
  for (const peer of state.geo.peers[index] as readonly number[]) {
    state.masks[peer] = (state.masks[peer] as number) & ~bit(digit);
  }
}

/** Entfernt Kandidaten `mask` aus `cells`; true, wenn sich etwas geändert hat. */
function eliminate(state: State, cells: readonly number[], mask: number): boolean {
  let changed = false;
  for (const index of cells) {
    if (state.grid[index]) continue;
    const before = state.masks[index] as number;
    const after = before & ~mask;
    if (after !== before) {
      state.masks[index] = after;
      changed = true;
    }
  }
  return changed;
}

const nakedSingle: Step = (state) => {
  for (let i = 0; i < state.grid.length; i++) {
    if (state.grid[i]) continue;
    const mask = state.masks[i] as number;
    if (popcount(mask) === 1) {
      place(state, i, digitsOf(mask, state.geo.size)[0] as number);
      return true;
    }
  }
  return false;
};

const hiddenSingle: Step = (state) => {
  for (const unit of state.geo.units) {
    for (let d = 1; d <= state.geo.size; d++) {
      let where = -1;
      let count = 0;
      for (const index of unit) {
        if (state.grid[index] === d) {
          count = -1;
          break;
        }
        if (!state.grid[index] && (state.masks[index] as number) & bit(d)) {
          count++;
          where = index;
        }
      }
      if (count === 1) {
        place(state, where, d);
        return true;
      }
    }
  }
  return false;
};

const nakedPair: Step = (state) => {
  for (const unit of state.geo.units) {
    const open = unit.filter((i) => !state.grid[i] && popcount(state.masks[i] as number) === 2);
    for (let a = 0; a < open.length; a++) {
      for (let b = a + 1; b < open.length; b++) {
        const ia = open[a] as number;
        const ib = open[b] as number;
        const mask = state.masks[ia] as number;
        if (mask !== state.masks[ib]) continue;
        const others = unit.filter((i) => i !== ia && i !== ib);
        if (eliminate(state, others, mask)) return true;
      }
    }
  }
  return false;
};

/** Pointing Pair/Triple und Box-Line-Reduction (Claiming). */
const boxLine: Step = (state) => {
  const { geo } = state;
  const lines = [...geo.rows, ...geo.cols];
  for (let d = 1; d <= geo.size; d++) {
    const m = bit(d);
    // Pointing: Ziffer in einer Box nur in einer Zeile/Spalte → aus Rest der Linie entfernen.
    for (const box of geo.boxes) {
      const cells = box.filter((i) => !state.grid[i] && (state.masks[i] as number) & m);
      if (cells.length < 2) continue;
      for (const line of lines) {
        if (!cells.every((i) => line.includes(i))) continue;
        const others = line.filter((i) => !box.includes(i));
        if (eliminate(state, others, m)) return true;
      }
    }
    // Claiming: Ziffer in einer Linie nur in einer Box → aus Rest der Box entfernen.
    for (const line of lines) {
      const cells = line.filter((i) => !state.grid[i] && (state.masks[i] as number) & m);
      if (cells.length < 2) continue;
      const box = geo.boxOf[cells[0] as number] as number;
      if (!cells.every((i) => geo.boxOf[i] === box)) continue;
      const others = (geo.boxes[box] as readonly number[]).filter((i) => !line.includes(i));
      if (eliminate(state, others, m)) return true;
    }
  }
  return false;
};

const hiddenPair: Step = (state) => {
  const { geo } = state;
  for (const unit of geo.units) {
    const positions: number[][] = [];
    for (let d = 1; d <= geo.size; d++) {
      positions[d] = unit.filter((i) => !state.grid[i] && (state.masks[i] as number) & bit(d));
    }
    for (let d1 = 1; d1 <= geo.size; d1++) {
      const p1 = positions[d1] as number[];
      if (p1.length !== 2) continue;
      for (let d2 = d1 + 1; d2 <= geo.size; d2++) {
        const p2 = positions[d2] as number[];
        if (p2.length !== 2 || p1[0] !== p2[0] || p1[1] !== p2[1]) continue;
        const keep = bit(d1) | bit(d2);
        let changed = false;
        for (const index of p1) {
          const before = state.masks[index] as number;
          if ((before & ~keep) !== 0) {
            state.masks[index] = before & keep;
            changed = true;
          }
        }
        if (changed) return true;
      }
    }
  }
  return false;
};

const nakedTriple: Step = (state) => {
  for (const unit of state.geo.units) {
    const open = unit.filter((i) => {
      if (state.grid[i]) return false;
      const n = popcount(state.masks[i] as number);
      return n === 2 || n === 3;
    });
    for (let a = 0; a < open.length; a++) {
      for (let b = a + 1; b < open.length; b++) {
        for (let c = b + 1; c < open.length; c++) {
          const ia = open[a] as number;
          const ib = open[b] as number;
          const ic = open[c] as number;
          const union =
            (state.masks[ia] as number) | (state.masks[ib] as number) | (state.masks[ic] as number);
          if (popcount(union) !== 3) continue;
          const others = unit.filter((i) => i !== ia && i !== ib && i !== ic);
          if (eliminate(state, others, union)) return true;
        }
      }
    }
  }
  return false;
};

const xWing: Step = (state) => {
  const { geo } = state;
  const size = geo.size;
  const candidatesIn = (line: readonly number[], d: number): number[] =>
    line.filter((i) => !state.grid[i] && (state.masks[i] as number) & bit(d));

  for (let d = 1; d <= size; d++) {
    for (const [primary, secondary, keyOf] of [
      [geo.rows, geo.cols, (i: number) => i % size],
      [geo.cols, geo.rows, (i: number) => Math.floor(i / size)],
    ] as const) {
      const candidates = primary.map((line) => candidatesIn(line, d));
      for (let a = 0; a < primary.length; a++) {
        const ca = candidates[a] as number[];
        if (ca.length !== 2) continue;
        for (let b = a + 1; b < primary.length; b++) {
          const cb = candidates[b] as number[];
          if (cb.length !== 2) continue;
          const ka = ca.map(keyOf);
          const kb = cb.map(keyOf);
          if (ka[0] !== kb[0] || ka[1] !== kb[1]) continue;
          const exclude = new Set([...ca, ...cb]);
          const targets = [
            ...(secondary[ka[0] as number] as readonly number[]),
            ...(secondary[ka[1] as number] as readonly number[]),
          ].filter((i) => !exclude.has(i));
          if (eliminate(state, targets, bit(d))) return true;
        }
      }
    }
  }
  return false;
};

const STEPS: Readonly<Record<SolvableTechnique, Step>> = {
  'naked-single': nakedSingle,
  'hidden-single': hiddenSingle,
  'naked-pair': nakedPair,
  'box-line': boxLine,
  'hidden-pair': hiddenPair,
  'naked-triple': nakedTriple,
  'x-wing': xWing,
};

export { LEVEL_OF as TECHNIQUE_LEVEL };
