import type { SudokuSize } from './types';

/** Feste Geometrie eines Sudoku-Gitters: Einheiten (Zeilen, Spalten, Boxen) und Peers. */
export interface Geometry {
  size: SudokuSize;
  boxRows: number;
  boxCols: number;
  /** Alle Einheiten als Listen von Zellindizes (row * size + col). */
  units: readonly (readonly number[])[];
  rows: readonly (readonly number[])[];
  cols: readonly (readonly number[])[];
  boxes: readonly (readonly number[])[];
  /** Für jede Zelle die Einheiten, in denen sie liegt. */
  unitsOf: readonly (readonly (readonly number[])[])[];
  /** Für jede Zelle alle anderen Zellen, die eine Einheit mit ihr teilen. */
  peers: readonly (readonly number[])[];
  /** Box-Index jeder Zelle. */
  boxOf: readonly number[];
}

const BOX_DIMS: Readonly<Record<SudokuSize, readonly [rows: number, cols: number]>> = {
  4: [2, 2],
  6: [2, 3],
  9: [3, 3],
};

const cache = new Map<SudokuSize, Geometry>();

export function geometryFor(size: SudokuSize): Geometry {
  const cached = cache.get(size);
  if (cached) return cached;

  const [boxRows, boxCols] = BOX_DIMS[size];
  const boxesPerRow = size / boxCols;
  const rows: number[][] = [];
  const cols: number[][] = [];
  const boxes: number[][] = Array.from({ length: size }, () => []);
  const boxOf: number[] = [];

  for (let r = 0; r < size; r++) {
    rows.push([]);
    cols.push([]);
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const index = r * size + c;
      const box = Math.floor(r / boxRows) * boxesPerRow + Math.floor(c / boxCols);
      (rows[r] as number[]).push(index);
      (cols[c] as number[]).push(index);
      (boxes[box] as number[]).push(index);
      boxOf.push(box);
    }
  }

  const units = [...rows, ...cols, ...boxes];
  const unitsOf: number[][][] = [];
  const peers: number[][] = [];
  for (let index = 0; index < size * size; index++) {
    const mine = units.filter((u) => u.includes(index));
    unitsOf.push(mine);
    const set = new Set<number>();
    for (const u of mine) for (const other of u) if (other !== index) set.add(other);
    peers.push([...set]);
  }

  const geometry: Geometry = {
    size,
    boxRows,
    boxCols,
    units,
    rows,
    cols,
    boxes,
    unitsOf,
    peers,
    boxOf,
  };
  cache.set(size, geometry);
  return geometry;
}

/** Bitmaske eines Kandidaten: Ziffer d entspricht Bit (d - 1). */
export const bit = (digit: number): number => 1 << (digit - 1);

export const popcount = (mask: number): number => {
  let n = 0;
  let m = mask;
  while (m) {
    m &= m - 1;
    n++;
  }
  return n;
};

/** Ziffern einer Bitmaske, aufsteigend. */
export function digitsOf(mask: number, size: number): number[] {
  const digits: number[] = [];
  for (let d = 1; d <= size; d++) if (mask & bit(d)) digits.push(d);
  return digits;
}

/** Bitmaske mit allen Ziffern 1..size. */
export const fullMask = (size: number): number => (1 << size) - 1;
