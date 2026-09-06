import type { Cell, Direction } from './types';

export const DIRECTION_DELTAS: Readonly<Record<Direction, readonly [dRow: number, dCol: number]>> =
  {
    E: [0, 1],
    W: [0, -1],
    S: [1, 0],
    N: [-1, 0],
    SE: [1, 1],
    NW: [-1, -1],
    NE: [-1, 1],
    SW: [1, -1],
  };

/** Liefert die Zellen eines Worts der Länge `length` ab `start` in Richtung `direction`. */
export function cellsFor(start: Cell, direction: Direction, length: number): Cell[] {
  const [dRow, dCol] = DIRECTION_DELTAS[direction];
  const cells: Cell[] = [];
  for (let i = 0; i < length; i++) {
    cells.push({ row: start.row + dRow * i, col: start.col + dCol * i });
  }
  return cells;
}

/** Prüft, ob ein Wort der Länge `length` ab `start` in `direction` vollständig im Gitter liegt. */
export function fits(
  start: Cell,
  direction: Direction,
  length: number,
  width: number,
  height: number,
): boolean {
  const [dRow, dCol] = DIRECTION_DELTAS[direction];
  const endRow = start.row + dRow * (length - 1);
  const endCol = start.col + dCol * (length - 1);
  return (
    start.row >= 0 &&
    start.col >= 0 &&
    start.row < height &&
    start.col < width &&
    endRow >= 0 &&
    endCol >= 0 &&
    endRow < height &&
    endCol < width
  );
}
