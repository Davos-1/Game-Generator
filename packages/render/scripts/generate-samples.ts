/**
 * Erzeugt Beispiel-PDFs und -SVGs im Standarddesign.
 *
 * Aufruf: pnpm --filter @raetselheft/render samples [Zielordner]
 * Standard-Zielordner: packages/render/samples (nicht im Repository).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateMaze, generateSudoku, generateWordSearch } from '@raetselheft/engine';
import { createMeasurer } from '../src/fonts';
import { loadFontsFromDisk } from '../src/node';
import { puzzlePage, solutionPages, type PuzzleItem } from '../src/pages';
import { renderPdf } from '../src/pdf';
import { pageToSvg } from '../src/svg';

const PIRATEN = [
  'Schatz',
  'Kapitän',
  'Papagei',
  'Schiff',
  'Anker',
  'Säbel',
  'Insel',
  'Kanone',
  'Kompass',
  'Truhe',
  'Segel',
  'Möwe',
];

async function main(): Promise<void> {
  const outDir = process.argv[2] ?? join(import.meta.dirname, '..', 'samples');
  await mkdir(outDir, { recursive: true });
  const fonts = await loadFontsFromDisk();
  const measurer = createMeasurer(fonts);

  const wordsearch: PuzzleItem = {
    kind: 'wordsearch',
    puzzle: generateWordSearch({ words: PIRATEN, seed: 'muster', width: 14, difficulty: 'medium' }),
  };
  const maze: PuzzleItem = {
    kind: 'maze',
    puzzle: generateMaze({ seed: 'muster', difficulty: 'medium' }),
  };
  const kidsSudoku: PuzzleItem = {
    kind: 'sudoku',
    puzzle: generateSudoku({ seed: 'muster', size: 6, difficulty: 'easy' }),
  };
  const sudoku: PuzzleItem = {
    kind: 'sudoku',
    puzzle: generateSudoku({ seed: 'muster', size: 9, difficulty: 'medium' }),
  };

  const singles: { name: string; item: PuzzleItem; title: string; subtitle: string }[] = [
    {
      name: 'wortsuchraetsel',
      item: wordsearch,
      title: 'Wortsuchrätsel',
      subtitle: 'Finde alle 12 Wörter',
    },
    {
      name: 'labyrinth',
      item: maze,
      title: 'Labyrinth',
      subtitle: 'Vom Pfeil oben zum Pfeil unten',
    },
    {
      name: 'sudoku-kinder',
      item: kidsSudoku,
      title: 'Sudoku für Kinder',
      subtitle: 'Jedes Symbol einmal pro Zeile, Spalte und Feld',
    },
    { name: 'sudoku', item: sudoku, title: 'Sudoku', subtitle: 'Mittel' },
  ];

  for (const single of singles) {
    const page = puzzlePage(single.item, measurer, {
      title: single.title,
      subtitle: single.subtitle,
      footerLeft: 'raetselheft.ch',
      footerRight: 'Muster',
    });
    const [solution] = solutionPages([{ item: single.item, caption: single.title }], measurer, {
      title: 'Lösung',
      footerLeft: 'raetselheft.ch',
    });
    const pages = solution ? [page, solution] : [page];
    await writeFile(
      join(outDir, `${single.name}.pdf`),
      await renderPdf(pages, fonts, { title: single.title }),
    );
    await writeFile(join(outDir, `${single.name}.svg`), pageToSvg(page));
    if (solution) await writeFile(join(outDir, `${single.name}-loesung.svg`), pageToSvg(solution));
  }

  // Beispielheft: vier Rätsel, Lösungsteil hinten, Wasserzeichen wie in der Premium-Vorschau.
  const items = [wordsearch, maze, kidsSudoku, sudoku];
  const captions = ['Wortsuchrätsel', 'Labyrinth', 'Sudoku für Kinder', 'Sudoku'];
  const heftPages = items.map((item, i) =>
    puzzlePage(item, measurer, {
      title: captions[i] ?? 'Rätsel',
      subtitle: 'Lucas Piratengeburtstag',
      footerLeft: 'raetselheft.ch',
      footerRight: `Seite ${i + 1}`,
    }),
  );
  const loesungen = solutionPages(
    items.map((item, i) => ({ item, caption: captions[i] ?? 'Rätsel' })),
    measurer,
    { title: 'Lösungen', footerLeft: 'raetselheft.ch' },
  );
  await writeFile(
    join(outDir, 'heft.pdf'),
    await renderPdf([...heftPages, ...loesungen], fonts, { title: 'Piraten-Rätselheft für Luca' }),
  );

  const watermarked = items.map((item, i) =>
    puzzlePage(item, measurer, {
      title: captions[i] ?? 'Rätsel',
      subtitle: 'Lucas Piratengeburtstag',
      footerLeft: 'raetselheft.ch',
      watermark: 'VORSCHAU',
    }),
  );
  await writeFile(
    join(outDir, 'heft-vorschau.pdf'),
    await renderPdf(watermarked, fonts, { title: 'Vorschau' }),
  );
  await writeFile(
    join(outDir, 'heft-vorschau.svg'),
    pageToSvg(watermarked[0] as (typeof watermarked)[number]),
  );

  process.stdout.write(`Beispiele geschrieben nach ${outDir}\n`);
}

await main();
