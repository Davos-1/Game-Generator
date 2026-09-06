import { createRng } from '../random';
import { solveMaze } from './solve';
import {
  MAZE_SIZE_BY_DIFFICULTY,
  type Cell,
  type Maze,
  type MazeOptions,
  type Walls,
} from './types';

export const MIN_MAZE_SIZE = 5;
export const MAX_MAZE_SIZE = 40;

interface DirSpec {
  name: keyof Walls;
  opposite: keyof Walls;
  dr: number;
  dc: number;
}

/** Die vier Bewegungsrichtungen mit ihrer jeweiligen Gegenwand. */
const DIRECTIONS: readonly DirSpec[] = [
  { name: 'north', opposite: 'south', dr: -1, dc: 0 },
  { name: 'east', opposite: 'west', dr: 0, dc: 1 },
  { name: 'south', opposite: 'north', dr: 1, dc: 0 },
  { name: 'west', opposite: 'east', dr: 0, dc: -1 },
];

function cellKey(cell: Cell): string {
  return `${cell.row},${cell.col}`;
}

function emptyWalls(width: number, height: number): Walls[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ north: true, east: true, south: true, west: true })),
  );
}

function assertSize(value: number, name: string): void {
  if (!Number.isInteger(value) || value < MIN_MAZE_SIZE || value > MAX_MAZE_SIZE) {
    throw new RangeError(
      `${name} muss eine Ganzzahl zwischen ${MIN_MAZE_SIZE} und ${MAX_MAZE_SIZE} sein`,
    );
  }
}

function resolveSize(options: MazeOptions): { width: number; height: number } {
  const base = MAZE_SIZE_BY_DIFFICULTY[options.difficulty ?? 'medium'];
  const width = options.width ?? base.width;
  const height = options.height ?? base.height;
  assertSize(width, 'width');
  assertSize(height, 'height');
  return { width, height };
}

/**
 * Erzeugt ein perfektes Labyrinth (Spannbaum: genau ein Weg zwischen je zwei
 * Zellen) per Recursive Backtracker. Iterativ mit explizitem Stack umgesetzt,
 * damit auch ein 40×40-Labyrinth den Aufrufstack nie sprengt.
 *
 * Deterministisch: gleicher Seed und gleiche Optionen ergeben exakt dasselbe
 * Labyrinth. Wirft `RangeError`, wenn width/height ausserhalb [5, 40] liegen
 * oder keine Ganzzahl sind.
 */
export function generateMaze(options: MazeOptions): Maze {
  const { width, height } = resolveSize(options);
  const rng = createRng(options.seed);

  const walls = emptyWalls(width, height);
  const visited: boolean[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => false),
  );

  const start: Cell = { row: 0, col: 0 };
  const end: Cell = { row: height - 1, col: width - 1 };

  (visited[start.row] as boolean[])[start.col] = true;
  const stack: Cell[] = [start];
  // Pro Zelle einmal gewürfelte Richtungsreihenfolge; wird beim Abarbeiten
  // vorne weg konsumiert (shift), damit jede Richtung höchstens einmal
  // versucht wird.
  const pendingDirections = new Map<string, DirSpec[]>();

  const nextDirections = (cell: Cell): DirSpec[] => {
    const key = cellKey(cell);
    let dirs = pendingDirections.get(key);
    if (!dirs) {
      dirs = rng.shuffle(DIRECTIONS);
      pendingDirections.set(key, dirs);
    }
    return dirs;
  };

  while (stack.length > 0) {
    const current = stack[stack.length - 1] as Cell;
    const dirs = nextDirections(current);
    let advanced = false;

    while (dirs.length > 0) {
      const dir = dirs.shift() as DirSpec;
      const row = current.row + dir.dr;
      const col = current.col + dir.dc;
      if (row < 0 || row >= height || col < 0 || col >= width) continue;
      if ((visited[row] as boolean[])[col]) continue;

      const currentWalls = (walls[current.row] as Walls[])[current.col] as Walls;
      const neighbourWalls = (walls[row] as Walls[])[col] as Walls;
      currentWalls[dir.name] = false;
      neighbourWalls[dir.opposite] = false;
      (visited[row] as boolean[])[col] = true;
      stack.push({ row, col });
      advanced = true;
      break;
    }

    if (!advanced) stack.pop();
  }

  // Eingang oben links, Ausgang unten rechts.
  ((walls[start.row] as Walls[])[start.col] as Walls).north = false;
  ((walls[end.row] as Walls[])[end.col] as Walls).south = false;

  const solution = solveMaze({ width, height, walls }, start, end);

  return { width, height, walls, start, end, solution, seed: options.seed };
}
