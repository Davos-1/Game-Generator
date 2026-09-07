/**
 * Erzeugt die Gratis-Beispiel-PDFs: je Rätseltyp und Themen-Design ein festes,
 * nicht personalisiertes Blatt mit Lösungsseite.
 *
 * Aufruf: pnpm --filter @raetselheft/web beispiele [Zielordner]
 *
 * Sie laufen vor dem Bauen und landen in public/beispiele. Sie sind der
 * Gratis-Einstieg: zum Anschauen, Ausdrucken und Verlinken. Personalisiert
 * wird nur im Generator, und das ist kostenpflichtig.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateMaze, generateSudoku, generateWordSearch } from '@raetselheft/engine';
import { createMeasurer } from '@raetselheft/render/fonts';
import { loadFontsFromDisk } from '@raetselheft/render/node';
import { puzzlePage, solutionPages, type PuzzleItem } from '@raetselheft/render/pages';
import { renderPdf } from '@raetselheft/render/pdf';
import { NEUTRAL_THEME, THEMES, type Theme } from '@raetselheft/render/themes';
import { EXAMPLES, examplePdfPath, type ExampleKind } from '../src/content/examples';
import { t } from '../src/i18n';

const ALL_THEMES: Theme[] = [NEUTRAL_THEME, ...THEMES];

const FALLBACK_WORDS = [
  'Rätsel',
  'Papier',
  'Bleistift',
  'Spass',
  'Suchen',
  'Finden',
  'Denken',
  'Muster',
  'Zeile',
  'Spalte',
];

function buildItem(kind: ExampleKind, theme: Theme, seed: string): PuzzleItem {
  switch (kind) {
    case 'wordsearch':
      return {
        kind,
        puzzle: generateWordSearch({
          words: (theme.words.length > 0 ? theme.words : FALLBACK_WORDS).slice(0, 12),
          seed,
          width: 12,
          difficulty: 'medium',
        }),
      };
    case 'maze':
      return { kind, puzzle: generateMaze({ seed, width: 20, height: 26 }) };
    case 'sudoku':
      return { kind, puzzle: generateSudoku({ seed, size: 9, difficulty: 'easy' }) };
  }
}

async function main(): Promise<void> {
  const outDir = process.argv[2] ?? join(import.meta.dirname, '..', 'public', 'beispiele');
  await mkdir(outDir, { recursive: true });
  const fonts = await loadFontsFromDisk();
  const measurer = createMeasurer(fonts);

  for (const theme of ALL_THEMES) {
    for (const { kind } of EXAMPLES) {
      // Fester Seed: dasselbe Beispiel bei jedem Bauen, damit Links und
      // ausgedruckte Blätter zusammenpassen.
      const seed = `beispiel:${theme.id}:${kind}`;
      const item = buildItem(kind, theme, seed);
      const title = t(`example.title.${kind}`);
      const options = {
        theme,
        title,
        subtitle: t('example.subtitle'),
        footerLeft: t('site.domain'),
      };
      const pages = [
        puzzlePage(item, measurer, options),
        ...solutionPages([{ item, caption: title }], measurer, {
          theme,
          title: t('generator.common.solutionTitle'),
          footerLeft: t('site.domain'),
        }),
      ];
      const bytes = await renderPdf(pages, fonts, {
        title: `${title} – ${theme.name}`,
        subject: t('example.subtitle'),
      });
      const file = join(outDir, `${theme.id}-${kind}.pdf`);
      await writeFile(file, bytes);
      console.log(`${examplePdfPath(kind, theme.id)}  ${(bytes.length / 1024).toFixed(0)} KB`);
    }
  }
}

await main();
