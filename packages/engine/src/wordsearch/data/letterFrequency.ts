/**
 * Häufigkeitstabellen für deutsche Buchstaben.
 *
 * Werden verwendet, um beim Auffüllen der Wortsuchrätsel-Gitter mit
 * zufälligen Füllbuchstaben eine realistische deutsche Buchstabenverteilung
 * zu erzeugen. Ohne diese Gewichtung würden Füllbuchstaben gleichverteilt
 * gewählt und die Lösungswörter würden durch untypische Buchstabenhäufungen
 * (z. B. viele X, Q, Y) auffallen. Die Gewichte entsprechen den gängigen
 * Prozentwerten für die relative Häufigkeit der Buchstaben in deutschen
 * Texten (Quelle: allgemein zitierte Buchstabenhäufigkeitstabellen).
 */
export const GERMAN_LETTER_FREQUENCY: ReadonlyArray<readonly [letter: string, weight: number]> = [
  ['A', 6.5],
  ['B', 1.9],
  ['C', 3.1],
  ['D', 5.1],
  ['E', 17.4],
  ['F', 1.7],
  ['G', 3.0],
  ['H', 4.8],
  ['I', 7.5],
  ['J', 0.3],
  ['K', 1.2],
  ['L', 3.4],
  ['M', 2.5],
  ['N', 9.8],
  ['O', 2.5],
  ['P', 0.8],
  ['Q', 0.02],
  ['R', 7.0],
  ['S', 7.3],
  ['T', 6.2],
  ['U', 4.4],
  ['V', 0.7],
  ['W', 1.9],
  ['X', 0.03],
  ['Y', 0.04],
  ['Z', 1.1],
];

/**
 * Zusätzliche Häufigkeitswerte für die deutschen Umlaute.
 *
 * Getrennt von {@link GERMAN_LETTER_FREQUENCY}, damit Aufrufer selbst
 * entscheiden können, ob Umlaute als Füllbuchstaben zugelassen werden
 * (z. B. abhängig vom Alphabet-Modus des Rätsels).
 */
export const GERMAN_UMLAUT_FREQUENCY: ReadonlyArray<readonly [letter: string, weight: number]> = [
  ['Ä', 0.5],
  ['Ö', 0.3],
  ['Ü', 0.65],
];
