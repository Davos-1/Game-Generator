import type { Cell, Maze, Walls } from './types';

type MazeGrid = Pick<Maze, 'width' | 'height' | 'walls'>;

interface Delta {
  dr: number;
  dc: number;
  wall: keyof Walls;
}

/** Bewegungsrichtungen mit der jeweils zu prüfenden Wand auf der Quellzelle. */
const DELTAS: readonly Delta[] = [
  { dr: -1, dc: 0, wall: 'north' },
  { dr: 0, dc: 1, wall: 'east' },
  { dr: 1, dc: 0, wall: 'south' },
  { dr: 0, dc: -1, wall: 'west' },
];

function cellKey(cell: Cell): string {
  return `${cell.row},${cell.col}`;
}

function wallsAt(maze: MazeGrid, cell: Cell): Walls | undefined {
  return maze.walls[cell.row]?.[cell.col];
}

/** Liefert alle Nachbarzellen, die von `cell` aus ohne Wand erreichbar sind. */
function openNeighbours(maze: MazeGrid, cell: Cell): Cell[] {
  const result: Cell[] = [];
  const walls = wallsAt(maze, cell);
  if (!walls) return result;
  for (const delta of DELTAS) {
    if (walls[delta.wall]) continue;
    const row = cell.row + delta.dr;
    const col = cell.col + delta.dc;
    if (row < 0 || row >= maze.height || col < 0 || col >= maze.width) continue;
    result.push({ row, col });
  }
  return result;
}

/**
 * Kürzester Weg von `from` nach `to` per Breitensuche (BFS). Bewegung zwischen
 * zwei Nachbarzellen ist nur erlaubt, wenn die Wand auf der Quellzelle offen
 * ist. Liefert `[]`, wenn `to` von `from` aus nicht erreichbar ist.
 */
export function solveMaze(maze: MazeGrid, from: Cell, to: Cell): Cell[] {
  const start = cellKey(from);
  const goal = cellKey(to);
  const cameFrom = new Map<string, Cell>();
  const visited = new Set<string>([start]);
  const queue: Cell[] = [from];

  let found = start === goal;
  for (let i = 0; i < queue.length && !found; i++) {
    const current = queue[i] as Cell;
    for (const next of openNeighbours(maze, current)) {
      const key = cellKey(next);
      if (visited.has(key)) continue;
      visited.add(key);
      cameFrom.set(key, current);
      if (key === goal) {
        found = true;
        break;
      }
      queue.push(next);
    }
  }

  if (!found) return [];

  const path: Cell[] = [to];
  let key = goal;
  while (key !== start) {
    const prev = cameFrom.get(key);
    if (!prev) return [];
    path.push(prev);
    key = cellKey(prev);
  }
  return path.reverse();
}

/**
 * Prüft, ob `maze` ein perfektes Labyrinth ist (Spannbaum): alle Zellen von
 * (0,0) aus erreichbar, genau width*height-1 offene innere Wandpaare, die
 * Wandflags zwischen Nachbarzellen konsistent, und alle Aussenwände
 * geschlossen bis auf Eingang (Nordwand von (0,0)) und Ausgang (Südwand der
 * Zelle unten rechts).
 */
export function isPerfectMaze(maze: MazeGrid): boolean {
  const { width, height, walls } = maze;
  if (width < 1 || height < 1) return false;

  // Erreichbarkeit + Konsistenz + Zählung offener innerer Wandpaare.
  let openPairs = 0;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const cell = walls[row]?.[col];
      if (!cell) return false;

      // Ostwand mit Westwand der rechten Nachbarzelle vergleichen.
      if (col + 1 < width) {
        const rightCell = walls[row]?.[col + 1];
        if (!rightCell) return false;
        if (cell.east !== rightCell.west) return false;
        if (!cell.east) openPairs++;
      }
      // Südwand mit Nordwand der unteren Nachbarzelle vergleichen.
      if (row + 1 < height) {
        const belowCell = walls[row + 1]?.[col];
        if (!belowCell) return false;
        if (cell.south !== belowCell.north) return false;
        if (!cell.south) openPairs++;
      }
    }
  }

  // Eingang/Ausgang und übrige Aussenwände explizit prüfen.
  for (let col = 0; col < width; col++) {
    const top = walls[0]?.[col];
    const bottom = walls[height - 1]?.[col];
    if (!top || !bottom) return false;
    const isEntrance = col === 0;
    const isExit = col === width - 1;
    if (isEntrance) {
      if (top.north) return false; // Eingang muss offen sein
    } else if (!top.north) {
      return false; // sonst muss die Nordwand geschlossen sein
    }
    if (isExit) {
      if (bottom.south) return false; // Ausgang muss offen sein
    } else if (!bottom.south) {
      return false; // sonst muss die Südwand geschlossen sein
    }
  }
  for (let row = 0; row < height; row++) {
    const left = walls[row]?.[0];
    const right = walls[row]?.[width - 1];
    if (!left || !right) return false;
    if (!left.west) return false;
    if (!right.east) return false;
  }

  if (openPairs !== width * height - 1) return false;

  const reachable = solveMazeReachableCount(maze);
  return reachable === width * height;
}

function solveMazeReachableCount(maze: MazeGrid): number {
  const visited = new Set<string>([cellKey({ row: 0, col: 0 })]);
  const queue: Cell[] = [{ row: 0, col: 0 }];
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i] as Cell;
    for (const next of openNeighbours(maze, current)) {
      const key = cellKey(next);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push(next);
    }
  }
  return visited.size;
}
