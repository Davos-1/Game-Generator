import { describe, expect, it } from 'vitest';
import { generateMaze, MAX_MAZE_SIZE, MIN_MAZE_SIZE } from './generate';
import { isPerfectMaze, solveMaze } from './solve';
import { MAZE_SIZE_BY_DIFFICULTY, type Cell, type Maze, type Walls } from './types';

/** Prüft, ob zwischen zwei benachbarten Zellen die Wand offen ist (Quellzellen-Seite). */
function isOpenBetween(maze: Pick<Maze, 'walls'>, a: Cell, b: Cell): boolean {
  const walls = maze.walls[a.row]?.[a.col];
  if (!walls) return false;
  const dr = b.row - a.row;
  const dc = b.col - a.col;
  if (dr === -1 && dc === 0) return !walls.north;
  if (dr === 1 && dc === 0) return !walls.south;
  if (dr === 0 && dc === 1) return !walls.east;
  if (dr === 0 && dc === -1) return !walls.west;
  return false; // nicht benachbart
}

function isAdjacent(a: Cell, b: Cell): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

function expectValidSolution(maze: Maze): void {
  expect(maze.solution[0]).toEqual(maze.start);
  expect(maze.solution[maze.solution.length - 1]).toEqual(maze.end);
  for (let i = 0; i + 1 < maze.solution.length; i++) {
    const a = maze.solution[i] as Cell;
    const b = maze.solution[i + 1] as Cell;
    expect(isAdjacent(a, b)).toBe(true);
    expect(isOpenBetween(maze, a, b)).toBe(true);
  }
  const seen = new Set(maze.solution.map((c) => `${c.row},${c.col}`));
  expect(seen.size).toBe(maze.solution.length);
  expect(maze.solution).toEqual(solveMaze(maze, maze.start, maze.end));
}

function closedWalls(): Walls {
  return { north: true, east: true, south: true, west: true };
}

describe('generateMaze', () => {
  it('ist deterministisch: gleicher Seed ergibt exakt dasselbe Labyrinth', () => {
    const a = generateMaze({ seed: 'labyrinth-2026', width: 12, height: 14 });
    const b = generateMaze({ seed: 'labyrinth-2026', width: 12, height: 14 });
    expect(a).toEqual(b);
  });

  it('verschiedene Seeds ergeben verschiedene Labyrinthe', () => {
    const a = generateMaze({ seed: 1, width: 12, height: 12 });
    const b = generateMaze({ seed: 2, width: 12, height: 12 });
    expect(a.walls).not.toEqual(b.walls);
  });

  it('verwendet die Grösse der Schwierigkeitsstufe', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const maze = generateMaze({ seed: 'diff', difficulty });
      expect(maze.width).toBe(MAZE_SIZE_BY_DIFFICULTY[difficulty].width);
      expect(maze.height).toBe(MAZE_SIZE_BY_DIFFICULTY[difficulty].height);
    }
  });

  it('greift ohne Angabe auf «medium» zurück', () => {
    const maze = generateMaze({ seed: 'default' });
    expect(maze.width).toBe(MAZE_SIZE_BY_DIFFICULTY.medium.width);
    expect(maze.height).toBe(MAZE_SIZE_BY_DIFFICULTY.medium.height);
  });

  it('explizite Grösse übersteuert die Schwierigkeitsstufe', () => {
    const maze = generateMaze({ seed: 'override', difficulty: 'hard', width: 9, height: 11 });
    expect(maze.width).toBe(9);
    expect(maze.height).toBe(11);
  });

  it('wirft RangeError bei ungültiger Grösse', () => {
    expect(() => generateMaze({ seed: 1, width: 4, height: 10 })).toThrow(RangeError);
    expect(() => generateMaze({ seed: 1, width: 41, height: 10 })).toThrow(RangeError);
    expect(() => generateMaze({ seed: 1, width: 10.5, height: 10 })).toThrow(RangeError);
    expect(() => generateMaze({ seed: 1, width: 10, height: 4 })).toThrow(RangeError);
    expect(() => generateMaze({ seed: 1, width: 10, height: 41 })).toThrow(RangeError);
    expect(() => generateMaze({ seed: 1, width: 10, height: 10.5 })).toThrow(RangeError);
  });

  it('akzeptiert die Grenzwerte 5 und 40', () => {
    expect(() =>
      generateMaze({ seed: 1, width: MIN_MAZE_SIZE, height: MIN_MAZE_SIZE }),
    ).not.toThrow();
    expect(() =>
      generateMaze({ seed: 1, width: MAX_MAZE_SIZE, height: MAX_MAZE_SIZE }),
    ).not.toThrow();
  });

  it('liefert für 50 Labyrinthe unterschiedlicher Grösse und Seeds ein perfektes Labyrinth', () => {
    let count = 0;
    for (let i = 0; i < 50; i++) {
      const width = MIN_MAZE_SIZE + (i % (MAX_MAZE_SIZE - MIN_MAZE_SIZE + 1));
      const height = MIN_MAZE_SIZE + ((i * 7 + 3) % (MAX_MAZE_SIZE - MIN_MAZE_SIZE + 1));
      const maze = generateMaze({ seed: `perfect-${i}`, width, height });
      expect(isPerfectMaze(maze), `Labyrinth ${i} (${width}×${height})`).toBe(true);
      expectValidSolution(maze);
      count++;
    }
    expect(count).toBe(50);
  });

  it('erzeugt ein 40×40-Labyrinth in unter 200ms', () => {
    const started = Date.now();
    generateMaze({ seed: 'perf', width: 40, height: 40 });
    expect(Date.now() - started).toBeLessThan(200);
  });
});

describe('solveMaze', () => {
  it('liefert [] für ein unerreichbares Ziel (alle Wände geschlossen)', () => {
    const walls: Walls[][] = [
      [closedWalls(), closedWalls()],
      [closedWalls(), closedWalls()],
    ];
    const maze = { width: 2, height: 2, walls };
    expect(solveMaze(maze, { row: 0, col: 0 }, { row: 1, col: 1 })).toEqual([]);
  });

  it('findet den bekannten Weg in einem handgebauten 2×2-Labyrinth', () => {
    // Spannbaum: (0,0)-(1,0), (0,0)-(0,1), (0,1)-(1,1). Eingang oben links, Ausgang unten rechts.
    const walls: Walls[][] = [
      [
        { north: false, east: false, south: false, west: true },
        { north: true, east: true, south: false, west: false },
      ],
      [
        { north: false, east: true, south: true, west: true },
        { north: false, east: true, south: false, west: true },
      ],
    ];
    const maze = { width: 2, height: 2, walls };
    expect(isPerfectMaze(maze)).toBe(true);
    const path = solveMaze(maze, { row: 0, col: 0 }, { row: 1, col: 1 });
    expect(path).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 1 },
    ]);
  });

  it('liefert eine einelementige Liste, wenn Start gleich Ziel ist', () => {
    const maze = generateMaze({ seed: 'solve', width: 10, height: 10 });
    expect(solveMaze(maze, maze.start, maze.start)).toEqual([maze.start]);
  });
});
