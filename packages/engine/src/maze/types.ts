import type { Cell } from '../grid';
/** Schwierigkeitsstufe; bestimmt das Standard-Zellenraster (siehe MAZE_SIZE_BY_DIFFICULTY). */
export type MazeDifficulty = 'easy' | 'medium' | 'hard';

/** Zellenraster pro Schwierigkeitsstufe, abgestimmt auf A4-Hochformat. */
export const MAZE_SIZE_BY_DIFFICULTY: Readonly<
  Record<MazeDifficulty, { width: number; height: number }>
> = {
  easy: { width: 10, height: 12 },
  medium: { width: 16, height: 20 },
  hard: { width: 24, height: 32 },
};

export type { Cell } from '../grid';

export interface Walls {
  north: boolean;
  east: boolean;
  south: boolean;
  west: boolean;
}

export interface MazeOptions {
  /** Seed für reproduzierbare Ergebnisse (z. B. für teilbare URLs). */
  seed: string | number;
  /** 5–40; überschreibt difficulty. */
  width?: number;
  /** 5–40; überschreibt difficulty. */
  height?: number;
  /** Bestimmt width/height, sofern nicht explizit gesetzt. Standard «medium». */
  difficulty?: MazeDifficulty;
}

export interface Maze {
  width: number;
  height: number;
  /** walls[row][col]. */
  walls: readonly (readonly Walls[])[];
  /** Start oben links; die Nordwand dieser Zelle ist offen (Eingang). */
  start: Cell;
  /** Ziel unten rechts; die Südwand dieser Zelle ist offen (Ausgang). */
  end: Cell;
  /** Lösungsweg von start bis end (beide inklusive), Zellen paarweise benachbart ohne Wand dazwischen. */
  solution: readonly Cell[];
  seed: string | number;
}
