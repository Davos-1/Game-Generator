import { describe, expect, it } from 'vitest';
import { generateNonogram } from './generate';
import { PICTURE_IDS } from './pictures';
import { FILLED, deduceLine, runsOf, solveByLines, EMPTY, UNKNOWN } from './solver';
import { NONOGRAM_SIZE_BY_DIFFICULTY, type NonogramDifficulty } from './types';

const DIFFICULTIES: readonly NonogramDifficulty[] = ['easy', 'medium', 'hard'];

describe('runsOf', () => {
  it('zählt die Blöcke ausgemalter Felder', () => {
    expect(runsOf([true, true, false, true])).toEqual([2, 1]);
    expect(runsOf([false, false])).toEqual([]);
    expect(runsOf([true, true, true])).toEqual([3]);
  });
});

describe('deduceLine', () => {
  it('beweist die Überlappung eines Blocks, der nicht überall hinpasst', () => {
    // Ein Block der Länge 4 in einer Zeile von 5 Feldern: die mittleren drei
    // sind in jeder Lage ausgemalt, die äusseren nicht entscheidbar.
    const line = deduceLine([4], [UNKNOWN, UNKNOWN, UNKNOWN, UNKNOWN, UNKNOWN]);
    expect(line).toEqual([UNKNOWN, FILLED, FILLED, FILLED, UNKNOWN]);
  });

  it('leert eine Zeile ohne Blöcke vollständig', () => {
    expect(deduceLine([], [UNKNOWN, UNKNOWN])).toEqual([EMPTY, EMPTY]);
  });

  it('erkennt einen Widerspruch', () => {
    // Ein Block der Länge 3 passt nicht in zwei Felder.
    expect(deduceLine([3], [UNKNOWN, UNKNOWN])).toBeUndefined();
  });

  it('nutzt bereits gesicherte Felder', () => {
    // Das erste Feld ist leer, also kann der Zweierblock nur rechts liegen.
    expect(deduceLine([2], [EMPTY, UNKNOWN, UNKNOWN])).toEqual([EMPTY, FILLED, FILLED]);
  });
});

describe('solveByLines', () => {
  it('löst ein von Hand gestelltes Gitter vollständig', () => {
    // Ein 3×3-Kreuz.
    const solution = [false, true, false, true, true, true, false, true, false];
    const rows = [[1], [3], [1]];
    const columns = [[1], [3], [1]];
    const solved = solveByLines(rows, columns);
    expect(solved?.complete).toBe(true);
    expect(solved?.states).toEqual(solution.map((filled) => (filled ? FILLED : EMPTY)));
  });

  it('meldet einen Widerspruch zwischen Zeilen und Spalten', () => {
    // Die Zeile verlangt ein ausgemaltes Feld, die Spalte verbietet es.
    expect(solveByLines([[1]], [[]])).toBeUndefined();
  });
});

describe('generateNonogram', () => {
  it('ist deterministisch für denselben Seed', () => {
    const a = generateNonogram({ seed: 'mia', difficulty: 'medium' });
    const b = generateNonogram({ seed: 'mia', difficulty: 'medium' });
    expect(a).toEqual(b);
  });

  it('wählt bei verschiedenen Seeds nicht immer dasselbe Bild', () => {
    const pictures = new Set(
      Array.from({ length: 20 }, (_, i) => generateNonogram({ seed: `seed-${i}` }).pictureId),
    );
    expect(pictures.size).toBeGreaterThan(1);
  });

  it('respektiert ein fest vorgegebenes Bild', () => {
    expect(generateNonogram({ seed: 'x', pictureId: 'herz' }).pictureId).toBe('herz');
  });

  it('lehnt ein unbekanntes Bild ab', () => {
    expect(() => generateNonogram({ seed: 'x', pictureId: 'unbekannt' })).toThrow(RangeError);
  });

  for (const difficulty of DIFFICULTIES) {
    it(`liefert bei «${difficulty}» für jedes Bild die vorgesehene Gittergrösse`, () => {
      const size = NONOGRAM_SIZE_BY_DIFFICULTY[difficulty];
      for (const pictureId of PICTURE_IDS) {
        const puzzle = generateNonogram({ seed: `groesse-${pictureId}`, difficulty, pictureId });
        expect(puzzle.width).toBe(size);
        expect(puzzle.height).toBe(size);
        expect(puzzle.solution).toHaveLength(size * size);
        expect(puzzle.rowClues).toHaveLength(size);
        expect(puzzle.columnClues).toHaveLength(size);
      }
    });
  }

  // Der Kern des Qualitätsversprechens: Jedes ausgelieferte Rätsel muss sich
  // allein mit Zeilen- und Spaltenlogik auflösen lassen. Damit ist die Lösung
  // zwingend eindeutig und muss nie geraten werden.
  for (const difficulty of DIFFICULTIES) {
    it(`ist bei «${difficulty}» für jedes Bild ohne Raten eindeutig lösbar`, () => {
      for (const pictureId of PICTURE_IDS) {
        const puzzle = generateNonogram({ seed: `logik-${pictureId}`, difficulty, pictureId });
        const solved = solveByLines(puzzle.rowClues, puzzle.columnClues);
        expect(solved?.complete, `${pictureId}/${difficulty}`).toBe(true);
        expect(solved?.states).toEqual(puzzle.solution.map((filled) => (filled ? FILLED : EMPTY)));
      }
    });
  }

  it('leitet die Randzahlen widerspruchsfrei aus der Lösung ab', () => {
    for (const pictureId of PICTURE_IDS) {
      const puzzle = generateNonogram({ seed: `zahlen-${pictureId}`, pictureId });
      const { width, height, solution } = puzzle;
      for (let row = 0; row < height; row++) {
        const cells = Array.from(
          { length: width },
          (_, col) => solution[row * width + col] as boolean,
        );
        expect(puzzle.rowClues[row]).toEqual(runsOf(cells));
      }
      for (let col = 0; col < width; col++) {
        const cells = Array.from(
          { length: height },
          (_, row) => solution[row * width + col] as boolean,
        );
        expect(puzzle.columnClues[col]).toEqual(runsOf(cells));
      }
    }
  });

  // Ein Blatt, auf dem fast nichts oder fast alles ausgemalt wird, ist zwar
  // lösbar, aber als Motiv enttäuschend.
  it('malt weder fast nichts noch fast alles aus', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const pictureId of PICTURE_IDS) {
        const puzzle = generateNonogram({ seed: `anteil-${pictureId}`, difficulty, pictureId });
        const ratio = puzzle.solution.filter(Boolean).length / puzzle.solution.length;
        expect(ratio, `${pictureId}/${difficulty}: ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(
          0.22,
        );
        expect(ratio, `${pictureId}/${difficulty}: ${ratio.toFixed(2)}`).toBeLessThanOrEqual(0.72);
      }
    }
  });

  // Kritisch fürs Drucken: Die Randzahlen brauchen Platz. Bleiben es wenige
  // Zahlen je Zeile, kommt das Layout mit schmalen Randspalten aus.
  it('hält die Randzahlen je Zeile und Spalte kurz', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const pictureId of PICTURE_IDS) {
        const puzzle = generateNonogram({ seed: `rand-${pictureId}`, difficulty, pictureId });
        const longest = Math.max(
          ...puzzle.rowClues.map((clue) => clue.length),
          ...puzzle.columnClues.map((clue) => clue.length),
        );
        expect(longest, `${pictureId}/${difficulty}`).toBeLessThanOrEqual(4);
      }
    }
  });
});
