/**
 * Nonogramm (auch Logik-Bilderrätsel oder Japanisches Rätsel): Die Zahlen an
 * Zeilen- und Spaltenrand geben an, wie viele Felder am Stück ausgemalt
 * werden. Wer sie richtig deutet, erhält am Schluss ein Bild.
 *
 * Die Engine kennt nur Gitter und Zahlen; welches Bild zu welchem Thema
 * passt, entscheidet die Render-/Web-Schicht.
 */

/** Schwierigkeit steuert die Gittergrösse: je grösser, desto mehr Schlüsse
 *  sind nötig, bis das Bild eindeutig feststeht. */
export type NonogramDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Kantenlänge des quadratischen Gitters pro Stufe. Obergrenze 20: darüber
 * werden die Randzahlen auf A4 zu klein, um sie noch bequem zu lesen.
 */
export const NONOGRAM_SIZE_BY_DIFFICULTY: Readonly<Record<NonogramDifficulty, number>> = {
  easy: 10,
  medium: 15,
  hard: 20,
};

export interface NonogramOptions {
  /** Seed für reproduzierbare Ergebnisse. */
  seed: string | number;
  /** Bestimmt die Gittergrösse. Standard «medium». */
  difficulty?: NonogramDifficulty;
  /** Festes Bild statt zufälliger Auswahl; siehe PICTURE_IDS. */
  pictureId?: string;
}

export interface NonogramPuzzle {
  pictureId: string;
  difficulty: NonogramDifficulty;
  /** Immer quadratisch, aber beide Kanten getrennt geführt, damit die
   *  Layout-Schicht nicht raten muss. */
  width: number;
  height: number;
  /** Lösung zeilenweise, `true` = ausgemalt. Länge `width * height`. */
  solution: readonly boolean[];
  /** Zahlen am linken Rand, je Zeile von links nach rechts gelesen. Eine
   *  leere Zeile hat eine leere Liste; die Anzeige als «0» ist Sache des
   *  Layouts. */
  rowClues: readonly (readonly number[])[];
  /** Zahlen am oberen Rand, je Spalte von oben nach unten gelesen. */
  columnClues: readonly (readonly number[])[];
  seed: string | number;
}
