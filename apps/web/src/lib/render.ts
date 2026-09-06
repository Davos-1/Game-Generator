import interRegular from '@raetselheft/render/fonts/Inter-Regular.ttf?url';
import interSemiBold from '@raetselheft/render/fonts/Inter-SemiBold.ttf?url';
import nunitoBold from '@raetselheft/render/fonts/Nunito-Bold.ttf?url';
import type { FontSet, PageLayout, PuzzleItem, TextMeasurer } from '@raetselheft/render';
import { generateMaze, generateSudoku, generateWordSearch } from '@raetselheft/engine';
import { themeById } from '@raetselheft/render/themes';
import type { PuzzleConfig } from './puzzleConfig';
import { parseWords } from './puzzleConfig';
import { t } from '../i18n';

export const FONT_URLS = { display: nunitoBold, body: interRegular, bodyBold: interSemiBold };

let measurerPromise: Promise<TextMeasurer> | undefined;
let fontsPromise: Promise<FontSet> | undefined;

async function loadFonts(): Promise<FontSet> {
  fontsPromise ??= (async () => {
    const [display, body, bodyBold] = await Promise.all(
      [FONT_URLS.display, FONT_URLS.body, FONT_URLS.bodyBold].map(async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Schrift ${url} konnte nicht geladen werden`);
        return new Uint8Array(await response.arrayBuffer());
      }),
    );
    return { display, body, bodyBold } as FontSet;
  })();
  return fontsPromise;
}

/**
 * Textmessung aus der vorbereiteten Metrik-Tabelle: rund 4 KB statt fontkit
 * mit 146 KB. Ein Test im Render-Paket hält beide Wege deckungsgleich.
 */
async function getMeasurer(): Promise<TextMeasurer> {
  measurerPromise ??= import('@raetselheft/render/measure').then(
    async ({ createMetricsMeasurer }) => {
      const { default: table } = await import('@raetselheft/render/metrics.json');
      return createMetricsMeasurer(table);
    },
  );
  return measurerPromise;
}

export interface PuzzleResult {
  item: PuzzleItem;
  /** Hinweise für den Nutzer, z. B. nicht platzierte oder abgewiesene Wörter. */
  notes: string[];
}

/** Erzeugt das Rätsel zur Konfiguration. Fehler werden als Error weitergereicht. */
export function buildPuzzle(config: PuzzleConfig): PuzzleResult {
  switch (config.kind) {
    case 'wordsearch': {
      const words = parseWords(config.words);
      if (words.length === 0) throw new Error(t('generator.wordsearch.empty'));
      const puzzle = generateWordSearch({
        words,
        seed: config.seed,
        width: config.size,
        difficulty: config.difficulty,
        umlauts: config.umlauts,
      });
      const notes: string[] = [];
      if (puzzle.unplaced.length > 0) {
        notes.push(`${t('generator.wordsearch.unplaced')}: ${puzzle.unplaced.join(', ')}`);
      }
      for (const reason of ['too-long', 'blacklisted', 'duplicate'] as const) {
        const affected = puzzle.rejected.filter((r) => r.reason === reason);
        if (affected.length > 0) {
          notes.push(
            `${t(`generator.wordsearch.rejected.${reason}`)}: ${affected.map((r) => r.original).join(', ')}`,
          );
        }
      }
      return { item: { kind: 'wordsearch', puzzle }, notes };
    }
    case 'maze':
      return {
        item: {
          kind: 'maze',
          puzzle: generateMaze({ seed: config.seed, difficulty: config.difficulty }),
        },
        notes: [],
      };
    case 'sudoku':
      return {
        item: {
          kind: 'sudoku',
          puzzle: generateSudoku({
            seed: config.seed,
            size: config.size,
            difficulty: config.difficulty,
          }),
        },
        notes: [],
      };
  }
}

function pageOptions(config: PuzzleConfig): {
  title: string;
  subtitle?: string;
  footerLeft: string;
  theme: ReturnType<typeof themeById>;
} {
  const title = config.title.trim() || t(`generator.${config.kind}.defaultTitle`);
  const subtitle = config.subtitle.trim();
  return {
    title,
    ...(subtitle ? { subtitle } : {}),
    footerLeft: t('site.domain'),
    theme: themeById(config.theme),
  };
}

export interface RenderedPages {
  puzzle: PageLayout;
  solution: PageLayout;
}

/** Baut Rätsel- und Lösungsseite; beide teilen sich dieselbe Layout-Schicht. */
export async function buildPages(config: PuzzleConfig, item: PuzzleItem): Promise<RenderedPages> {
  const [{ puzzlePage, solutionPages }, measurer] = await Promise.all([
    import('@raetselheft/render/pages'),
    getMeasurer(),
  ]);
  const options = pageOptions(config);
  const puzzle = puzzlePage(item, measurer, options);
  const [solution] = solutionPages([{ item, caption: options.title }], measurer, {
    title: t('generator.common.solutionTitle'),
    footerLeft: t('site.domain'),
    theme: options.theme,
  });
  return { puzzle, solution: solution ?? puzzle };
}

export async function pageToSvgString(page: PageLayout): Promise<string> {
  const { pageToSvg } = await import('@raetselheft/render/svg');
  return pageToSvg(page, {
    fontUrls: FONT_URLS,
    attributes: { 'aria-hidden': 'true', style: 'width:100%;height:auto;display:block' },
  });
}

/** Erzeugt das PDF (Rätsel- und Lösungsseite) als Blob. */
export async function buildPdf(config: PuzzleConfig, pages: RenderedPages): Promise<Blob> {
  // pdf-lib wird erst hier geladen; die Vorschau kommt ohne aus.
  const [{ renderPdf }, fonts] = await Promise.all([
    import('@raetselheft/render/pdf'),
    loadFonts(),
  ]);
  const bytes = await renderPdf([pages.puzzle, pages.solution], fonts, {
    title: config.title.trim() || t(`generator.${config.kind}.defaultTitle`),
    subject: t('site.description'),
  });
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}
