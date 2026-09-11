import { THEMES } from '@raetselheft/render/themes';
import type { PuzzleKind } from '../lib/puzzleConfig';
import copy from './copy.json';

export type OccasionId = 'kindergeburtstag' | 'hochzeit' | 'regentag' | 'weihnachten';

export const PUZZLE_KINDS: PuzzleKind[] = [
  'wordsearch',
  'maze',
  'sudoku',
  'dot-to-dot',
  'crossword',
];

/** Adressteil je Rätseltyp; bestimmt auch den Ordner der Landing-Pages. */
export const KIND_SLUG: Readonly<Record<PuzzleKind, string>> = {
  wordsearch: 'wortsuchraetsel',
  maze: 'labyrinth',
  sudoku: 'sudoku',
  'dot-to-dot': 'punkte-zu-punkte',
  crossword: 'kreuzwortraetsel',
};

export const SLUG_TO_KIND: Readonly<Record<string, PuzzleKind>> = {
  wortsuchraetsel: 'wordsearch',
  labyrinth: 'maze',
  sudoku: 'sudoku',
  'punkte-zu-punkte': 'dot-to-dot',
  kreuzwortraetsel: 'crossword',
};

/**
 * Welche Themen zu welchem Anlass passen. Bewusst kuratiert: ein
 * Hochzeits-Design zum Kindergeburtstag wäre eine sinnlose Seite.
 */
export const OCCASION_THEMES: Readonly<Record<OccasionId, string[]>> = {
  kindergeburtstag: ['piraten', 'einhorn', 'dschungel'],
  hochzeit: ['hochzeit'],
  regentag: ['piraten', 'einhorn', 'dschungel'],
  weihnachten: ['weihnachten'],
};

export const OCCASIONS = Object.keys(OCCASION_THEMES) as OccasionId[];
export const THEME_IDS = THEMES.map((theme) => theme.id);

export interface LandingPage {
  kind: PuzzleKind;
  /** Adresse unterhalb des Rätseltyps, z. B. «piraten-kindergeburtstag». */
  slug: string;
  themeId?: string;
  occasionId?: OccasionId;
  title: string;
  description: string;
  heading: string;
}

const copyOf = {
  kind: (kind: PuzzleKind) => copy.puzzleTypes[kind],
  theme: (id: string) => copy.themes[id as keyof typeof copy.themes],
  occasion: (id: OccasionId) => copy.occasions[id],
};

/**
 * Bestimmungswort für zusammengesetzte Titel: «Einhörner-Wortsuchrätsel» wäre
 * schlechtes Deutsch, «Einhorn-Wortsuchrätsel» ist richtig.
 */
const COMPOUND: Readonly<Record<string, string>> = {
  piraten: 'Piraten',
  einhorn: 'Einhorn',
  dschungel: 'Dschungel',
  hochzeit: 'Hochzeits',
  weihnachten: 'Weihnachts',
};

const compound = (themeId: string, name: string): string => COMPOUND[themeId] ?? name;

/**
 * Alle Landing-Pages: je Theme, je Anlass und für die sinnvollen Paare.
 *
 * Heisst ein Anlass gleich wie ein Theme (Hochzeit, Weihnachten), gibt es
 * dafür nur eine Seite. Sonst kollidierten zwei Seiten auf derselben Adresse,
 * und «hochzeit-hochzeit» wäre ohnehin unsinnig.
 */
export function allLandingPages(): LandingPage[] {
  const pages: LandingPage[] = [];
  const themeIds = new Set(THEME_IDS);

  for (const kind of PUZZLE_KINDS) {
    const type = copyOf.kind(kind);

    for (const themeId of THEME_IDS) {
      const theme = copyOf.theme(themeId);
      if (!theme) continue;
      const asOccasion = OCCASIONS.includes(themeId as OccasionId)
        ? (themeId as OccasionId)
        : undefined;
      const occasion = asOccasion ? copyOf.occasion(asOccasion) : undefined;
      const heading = `${compound(themeId, theme.name)}-${type.name} zum Ausdrucken`;
      pages.push({
        kind,
        slug: themeId,
        themeId,
        ...(asOccasion ? { occasionId: asOccasion } : {}),
        title: heading,
        // Der Rätseltyp gehört immer in die Beschreibung, sonst teilen sich
        // mehrere Seiten dieselbe und Suchmaschinen werten sie ab.
        description: occasion
          ? `${theme.lead} Als ${type.name} ${occasion.dative} zum Ausdrucken.`
          : `${theme.lead} Als ${type.name} zum Ausdrucken.`,
        heading,
      });
    }

    for (const occasionId of OCCASIONS) {
      const occasion = copyOf.occasion(occasionId);
      if (!themeIds.has(occasionId)) {
        const heading = `${type.name} ${occasion.dative}`;
        pages.push({
          kind,
          slug: occasionId,
          occasionId,
          title: heading,
          description: `${occasion.lead} Als ${type.name} zum Ausdrucken.`,
          heading,
        });
      }

      for (const themeId of OCCASION_THEMES[occasionId]) {
        if (themeId === occasionId) continue;
        const theme = copyOf.theme(themeId);
        if (!theme) continue;
        const heading = `${compound(themeId, theme.name)}-${type.name} ${occasion.dative}`;
        pages.push({
          kind,
          slug: `${themeId}-${occasionId}`,
          themeId,
          occasionId,
          title: heading,
          description: `${theme.lead} Als ${type.name} ${occasion.dative} zum Ausdrucken.`,
          heading,
        });
      }
    }
  }
  return pages;
}

/** Verwandte Seiten für die interne Verlinkung. */
export function relatedPages(page: LandingPage, all: LandingPage[]): LandingPage[] {
  const sameSlugOtherKind = all.filter(
    (other) => other.slug === page.slug && other.kind !== page.kind,
  );
  const sameKindOther = all.filter(
    (other) =>
      other.kind === page.kind &&
      other.slug !== page.slug &&
      (other.themeId === page.themeId || other.occasionId === page.occasionId),
  );
  return [...sameSlugOtherKind, ...sameKindOther].slice(0, 6);
}

export { copy };
