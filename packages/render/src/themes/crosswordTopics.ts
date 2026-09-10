/**
 * Wort-Themen fürs Kreuzworträtsel, unabhängig vom Themen-Design wählbar und
 * miteinander kombinierbar: ein Rätsel kann z. B. das «Piraten»-Design mit
 * den Wort-Themen «Weltraum» und «Dinosaurier» mischen. Die sechs
 * Design-gebundenen Listen (`crosswordEntries.ts`) bleiben als Gruppe
 * «design» ebenfalls wählbar, damit ihr Inhalt nicht verloren geht.
 *
 * Ein neues Wort-Thema braucht nur eine neue JSON-Datei unter `data/topics/`
 * und einen Eintrag in `TOPIC_REGISTRY` — keine weiteren Code-Änderungen.
 */
import type { CrosswordEntry } from '@raetselheft/engine';
import dschungel from './data/dschungel.crossword.json';
import einhorn from './data/einhorn.crossword.json';
import hochzeit from './data/hochzeit.crossword.json';
import neutral from './data/neutral.crossword.json';
import piraten from './data/piraten.crossword.json';
import weihnachten from './data/weihnachten.crossword.json';
import bauernhof from './data/topics/bauernhof.json';
import berufe from './data/topics/berufe.json';
import dinosaurier from './data/topics/dinosaurier.json';
import fahrzeuge from './data/topics/fahrzeuge.json';
import feuerwehrPolizei from './data/topics/feuerwehr-polizei.json';
import fussball from './data/topics/fussball.json';
import garten from './data/topics/garten.json';
import kochen from './data/topics/kochen.json';
import meer from './data/topics/meer.json';
import musik from './data/topics/musik.json';
import ritterBurgen from './data/topics/ritter-burgen.json';
import roboterTechnik from './data/topics/roboter-technik.json';
import schule from './data/topics/schule.json';
import sport from './data/topics/sport.json';
import tiere from './data/topics/tiere.json';
import wald from './data/topics/wald.json';
import weltraum from './data/topics/weltraum.json';
import wetter from './data/topics/wetter.json';
import zauberer from './data/topics/zauberer.json';
import zirkus from './data/topics/zirkus.json';

/** «design» = an ein Themen-Design gebunden, «topic» = frei kombinierbares Wort-Thema. */
export type CrosswordTopicGroup = 'design' | 'topic';

export interface CrosswordTopicInfo {
  id: string;
  name: string;
  group: CrosswordTopicGroup;
}

interface RegistryEntry extends CrosswordTopicInfo {
  entries: readonly CrosswordEntry[];
}

const REGISTRY: readonly RegistryEntry[] = [
  { id: 'neutral', name: 'Standard', group: 'design', entries: neutral },
  { id: 'piraten', name: 'Piraten', group: 'design', entries: piraten },
  { id: 'einhorn', name: 'Einhörner', group: 'design', entries: einhorn },
  { id: 'dschungel', name: 'Dschungel', group: 'design', entries: dschungel },
  { id: 'hochzeit', name: 'Hochzeit', group: 'design', entries: hochzeit },
  { id: 'weihnachten', name: 'Weihnachten', group: 'design', entries: weihnachten },
  { id: 'tiere', name: 'Tiere', group: 'topic', entries: tiere },
  { id: 'bauernhof', name: 'Bauernhof', group: 'topic', entries: bauernhof },
  { id: 'meer', name: 'Meer & Unterwasserwelt', group: 'topic', entries: meer },
  { id: 'weltraum', name: 'Weltraum', group: 'topic', entries: weltraum },
  { id: 'dinosaurier', name: 'Dinosaurier', group: 'topic', entries: dinosaurier },
  { id: 'fahrzeuge', name: 'Fahrzeuge', group: 'topic', entries: fahrzeuge },
  {
    id: 'feuerwehr-polizei',
    name: 'Feuerwehr & Polizei',
    group: 'topic',
    entries: feuerwehrPolizei,
  },
  { id: 'sport', name: 'Sport', group: 'topic', entries: sport },
  { id: 'fussball', name: 'Fussball', group: 'topic', entries: fussball },
  { id: 'schule', name: 'Schule', group: 'topic', entries: schule },
  { id: 'berufe', name: 'Berufe', group: 'topic', entries: berufe },
  { id: 'wetter', name: 'Wetter & Jahreszeiten', group: 'topic', entries: wetter },
  { id: 'kochen', name: 'Kochen & Essen', group: 'topic', entries: kochen },
  { id: 'musik', name: 'Musik & Instrumente', group: 'topic', entries: musik },
  { id: 'ritter-burgen', name: 'Ritter & Burgen', group: 'topic', entries: ritterBurgen },
  { id: 'zirkus', name: 'Zirkus', group: 'topic', entries: zirkus },
  { id: 'wald', name: 'Wald & Bäume', group: 'topic', entries: wald },
  { id: 'zauberer', name: 'Zauberer & Magie', group: 'topic', entries: zauberer },
  { id: 'garten', name: 'Garten & Pflanzen', group: 'topic', entries: garten },
  { id: 'roboter-technik', name: 'Roboter & Technik', group: 'topic', entries: roboterTechnik },
];

const BY_ID = new Map<string, RegistryEntry>(REGISTRY.map((entry) => [entry.id, entry]));

/** Auswahlliste für die Oberfläche, in der Reihenfolge oben (Design zuerst). */
export const CROSSWORD_TOPICS: readonly CrosswordTopicInfo[] = REGISTRY.map(
  ({ id, name, group }) => ({ id, name, group }),
);

/** Höchstzahl kombinierbarer Wort-Themen; mehr bringt kaum mehr Auswahl, macht aber die Liste unübersichtlich. */
export const MAX_CROSSWORD_TOPICS = 5;

/** Wortliste eines einzelnen Themas; unbekannte Ids ergeben eine leere Liste. */
export function crosswordTopicEntries(topicIds: readonly string[]): CrosswordEntry[] {
  const ids = topicIds.length > 0 ? topicIds : ['neutral'];
  const seen = new Set<string>();
  const entries: CrosswordEntry[] = [];
  for (const id of ids) {
    const topic = BY_ID.get(id);
    if (!topic) continue;
    for (const entry of topic.entries) {
      const key = entry.word.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push(entry);
    }
  }
  return entries.length > 0 ? entries : [...(BY_ID.get('neutral')?.entries ?? [])];
}
