import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { fillGrid, generateSudoku, GIVENS_TARGET, meetsDifficulty } from './generate';
import { geometryFor } from './geometry';
import { countSolutions, isSolved } from './solver';
import { solveWithTechniques } from './techniques';
import type { SudokuDifficulty, SudokuPuzzle, SudokuSize } from './types';

const flatten = (g: readonly (readonly number[])[]): number[] => g.flat();

function expectValidPuzzle(p: SudokuPuzzle): void {
  const geo = geometryFor(p.size);
  const solution = flatten(p.solution);
  const givens = flatten(p.givens);
  expect(isSolved(solution, geo)).toBe(true);
  expect(p.givens).toHaveLength(p.size);
  for (const row of p.givens) expect(row).toHaveLength(p.size);
  givens.forEach((v, i) => {
    if (v) expect(v).toBe(solution[i]);
  });
  expect(p.givenCount).toBe(givens.filter((v) => v > 0).length);
  expect(countSolutions(givens, p.size, 2)).toBe(1);
  // Der Technik-Solver muss auf der bekannten Lösung landen.
  const solved = solveWithTechniques(givens, p.size);
  if (solved.solved) expect(solved.grid).toEqual(solution);
}

describe('geometryFor', () => {
  it('bildet 6×6 mit Boxen von 2 Zeilen × 3 Spalten', () => {
    const geo = geometryFor(6);
    expect(geo.boxRows).toBe(2);
    expect(geo.boxCols).toBe(3);
    expect(geo.boxes).toHaveLength(6);
    expect(geo.boxes[0]).toEqual([0, 1, 2, 6, 7, 8]);
    expect(geo.boxes[1]).toEqual([3, 4, 5, 9, 10, 11]);
    expect(geo.peers[0]).toHaveLength(5 + 5 + 2);
  });

  it('hat bei 9×9 20 Peers pro Zelle', () => {
    expect(geometryFor(9).peers[40]).toHaveLength(20);
  });
});

describe('fillGrid', () => {
  it('erzeugt gültige volle Gitter in allen Grössen', () => {
    for (const size of [4, 6, 9] as const) {
      const geo = geometryFor(size);
      const grid = fillGrid(geo, createRng(`fill-${size}`));
      expect(isSolved(grid, geo)).toBe(true);
    }
  });
});

describe('countSolutions', () => {
  it('zählt bei leerem 4×4 mehr als eine Lösung und bricht beim Limit ab', () => {
    expect(
      countSolutions(
        Array.from({ length: 16 }, () => 0),
        4,
        2,
      ),
    ).toBe(2);
    expect(
      countSolutions(
        Array.from({ length: 16 }, () => 0),
        4,
        5,
      ),
    ).toBe(5);
  });

  it('liefert 0 bei Widerspruch', () => {
    const grid = Array.from({ length: 16 }, () => 0);
    grid[0] = 1;
    grid[1] = 1;
    expect(countSolutions(grid, 4)).toBe(0);
  });
});

describe('solveWithTechniques', () => {
  it('löst ein leichtes Sudoku nur mit Singles', () => {
    // Bekanntes leichtes Rätsel (Project Euler 96, Grid 01), lösbar mit Singles.
    const text =
      '003020600900305001001806400008102900700000008006708200002609500800203009005010300';
    const grid = [...text].map(Number);
    const result = solveWithTechniques(grid, 9);
    expect(result.solved).toBe(true);
    expect(result.rating.level).toBe('easy');
    expect(result.grid.join('')).toBe(
      '483921657967345821251876493548132976729564138136798245372689514814253769695417382',
    );
  });

  it('meldet «expert», wenn Raten nötig wäre', () => {
    // Fast leeres Gitter: eindeutig nicht, Techniken kommen nicht weiter.
    const grid = Array.from({ length: 81 }, () => 0);
    const result = solveWithTechniques(grid, 9);
    expect(result.solved).toBe(false);
    expect(result.rating.level).toBe('expert');
    expect(result.rating.hardestTechnique).toBe('guess');
  });

  it('wendet Naked Pair an', () => {
    // Zeile 0: Zellen 0 und 1 haben nur {1,2}; Rest der Zeile darf 1/2 nicht mehr enthalten.
    // Konstruktion über ein 4×4: Lösung 1234/3412/2143/4321, Vorgaben so, dass Pair entsteht.
    const grid = [0, 0, 3, 4, 3, 4, 0, 0, 0, 0, 4, 3, 4, 3, 0, 0];
    const result = solveWithTechniques(grid, 4);
    expect(result.solved).toBe(false); // Vier Lösungen (die Paare sind vertauschbar)
    expect(countSolutions(grid, 4, 10)).toBeGreaterThan(1);
  });
});

describe('generateSudoku', () => {
  it('ist deterministisch', () => {
    const a = generateSudoku({ seed: 'det', size: 9, difficulty: 'medium' });
    const b = generateSudoku({ seed: 'det', size: 9, difficulty: 'medium' });
    expect(a).toEqual(b);
  });

  it('liefert für verschiedene Seeds verschiedene Rätsel', () => {
    const a = generateSudoku({ seed: 1, size: 9 });
    const b = generateSudoku({ seed: 2, size: 9 });
    expect(a.givens).not.toEqual(b.givens);
  });

  it('wirft bei ungültiger Grösse', () => {
    expect(() => generateSudoku({ seed: 1, size: 5 as SudokuSize })).toThrow(RangeError);
  });

  it('trifft die gewünschte Stufe bei 9×9 in allen drei Schwierigkeiten', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      for (let i = 0; i < 4; i++) {
        const p = generateSudoku({ seed: `lvl-${difficulty}-${i}`, size: 9, difficulty });
        expectValidPuzzle(p);
        const info = `${difficulty} #${i}: ${p.rating.hardestTechnique}, ${p.givenCount} Vorgaben`;
        expect(meetsDifficulty(9, difficulty, p.rating.level, p.givenCount), info).toBe(true);
        expect(p.givenCount).toBeLessThanOrEqual(GIVENS_TARGET[9][difficulty]);
        expect(solveWithTechniques(flatten(p.givens), 9).solved).toBe(true);
      }
    }
  });

  it('meetsDifficulty: leicht nur mit Singles, schwer auch mit Paaren bei wenigen Vorgaben', () => {
    expect(meetsDifficulty(9, 'easy', 'easy', 38)).toBe(true);
    expect(meetsDifficulty(9, 'easy', 'medium', 38)).toBe(false);
    expect(meetsDifficulty(9, 'medium', 'medium', 32)).toBe(true);
    expect(meetsDifficulty(9, 'medium', 'medium', 33)).toBe(false);
    expect(meetsDifficulty(9, 'hard', 'medium', 26)).toBe(true);
    expect(meetsDifficulty(9, 'hard', 'hard', 26)).toBe(true);
    expect(meetsDifficulty(9, 'hard', 'easy', 24)).toBe(false);
    expect(meetsDifficulty(9, 'hard', 'expert', 24)).toBe(false);
    expect(meetsDifficulty(6, 'hard', 'easy', 12)).toBe(true);
    expect(meetsDifficulty(4, 'medium', 'easy', 8)).toBe(false);
  });

  it('hält die Vorgaben-Bereiche aus PLAN.md ein (9×9: leicht 36–40, schwer 24–28)', () => {
    const easy = generateSudoku({ seed: 'range-e', size: 9, difficulty: 'easy' });
    expect(easy.givenCount).toBeGreaterThanOrEqual(36);
    expect(easy.givenCount).toBeLessThanOrEqual(40);
    const hard = generateSudoku({ seed: 'range-h', size: 9, difficulty: 'hard' });
    expect(hard.givenCount).toBeGreaterThanOrEqual(22);
    expect(hard.givenCount).toBeLessThanOrEqual(28);
  });

  it('erzeugt Kindervarianten 4×4 und 6×6 mit eindeutiger Lösung', () => {
    for (const size of [4, 6] as const) {
      for (const difficulty of ['easy', 'medium', 'hard'] as const) {
        const p = generateSudoku({ seed: `kids-${size}-${difficulty}`, size, difficulty });
        expectValidPuzzle(p);
        expect(p.size).toBe(size);
        expect(p.givenCount).toBeLessThanOrEqual(GIVENS_TARGET[size][difficulty]);
        expect(p.rating.level).not.toBe('expert');
      }
    }
  });

  it('gibt nie ein Rätsel zurück, das Raten erfordert', () => {
    for (let i = 0; i < 6; i++) {
      const p = generateSudoku({ seed: `noguess-${i}`, size: 9, difficulty: 'hard' });
      expect(p.rating.level).not.toBe('expert');
      expect(solveWithTechniques(flatten(p.givens), 9).solved).toBe(true);
    }
  });
});

describe('Abnahme AP3 (Sudoku): 60 Rätsel', () => {
  it('sind alle eindeutig, konsistent und ohne Raten lösbar', () => {
    const sizes: SudokuSize[] = [4, 6, 9];
    const levels: SudokuDifficulty[] = ['easy', 'medium', 'hard'];
    for (let i = 0; i < 60; i++) {
      const size = sizes[i % 3] as SudokuSize;
      const difficulty = levels[Math.floor(i / 3) % 3] as SudokuDifficulty;
      const p = generateSudoku({ seed: `ap3-${i}`, size, difficulty });
      expectValidPuzzle(p);
      expect(p.rating.level).not.toBe('expert');
    }
  });
});
