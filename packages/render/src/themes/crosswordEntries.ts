/**
 * Wort-Hinweis-Listen fürs Kreuzworträtsel, je Thema und für das neutrale
 * Standarddesign. Bewusst getrennt vom Theme-Schema (`types.ts`): ein Thema
 * bleibt eine reine Design-Einheit, diese Listen sind Rätsel-Inhalt wie die
 * Wortsuchrätsel-Listen (`*.words.json`), nur mit zusätzlichem Hinweistext.
 */
import type { CrosswordEntry } from '@raetselheft/engine';
import dschungel from './data/dschungel.crossword.json';
import einhorn from './data/einhorn.crossword.json';
import hochzeit from './data/hochzeit.crossword.json';
import neutral from './data/neutral.crossword.json';
import piraten from './data/piraten.crossword.json';
import weihnachten from './data/weihnachten.crossword.json';

const BY_THEME: Readonly<Record<string, readonly CrosswordEntry[]>> = {
  neutral,
  piraten,
  einhorn,
  dschungel,
  hochzeit,
  weihnachten,
};

/** Liste für ein Thema; unbekannte Ids ergeben die neutrale Liste. */
export function crosswordEntriesFor(themeId: string): readonly CrosswordEntry[] {
  return BY_THEME[themeId] ?? BY_THEME.neutral ?? [];
}
