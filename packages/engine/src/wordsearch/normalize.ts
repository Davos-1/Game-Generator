import type { UmlautMode } from './types';

/**
 * Normalisiert ein Wort für das Gitter: Grossbuchstaben, ß → SS,
 * Umlaute je nach Modus behalten oder auflösen, alles ausser
 * A–Z und Ä/Ö/Ü entfernen (Leerzeichen, Bindestriche, Apostrophe, Akzente).
 */
export function normalizeWord(input: string, umlauts: UmlautMode): string {
  let word = input
    .normalize('NFC')
    .toUpperCase() // ß wird von toUpperCase() bereits zu SS
    .replace(/ẞ/g, 'SS');

  if (umlauts === 'expand') {
    word = word.replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE');
  }

  // Akzente (É, È, Ç …) auf den Grundbuchstaben reduzieren; Umlaute wurden oben bereits behandelt.
  word = word
    .replace(/[ÀÁÂÃÅ]/g, 'A')
    .replace(/[ÈÉÊË]/g, 'E')
    .replace(/[ÌÍÎÏ]/g, 'I')
    .replace(/[ÒÓÔÕ]/g, 'O')
    .replace(/[ÙÚÛ]/g, 'U')
    .replace(/Ç/g, 'C')
    .replace(/Ñ/g, 'N');

  return word.replace(/[^A-ZÄÖÜ]/g, '');
}

/** Alle Schreibvarianten eines Blacklist-Worts (mit Umlaut und mit AE/OE/UE), normalisiert. */
export function blacklistVariants(input: string): string[] {
  const keep = normalizeWord(input, 'keep');
  const expanded = normalizeWord(input, 'expand');
  return keep === expanded ? [keep] : [keep, expanded];
}
