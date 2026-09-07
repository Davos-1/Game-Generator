/**
 * Erzeugt die Quelldateien für die OG-Bilder (Vorschaubilder beim Teilen).
 *
 * Aufruf: pnpm --filter @raetselheft/web og [Zielordner]
 *
 * Der zweite Schritt (HTML zu PNG) läuft einmalig mit einem Browser und ist in
 * docs/OG-BILDER.md beschrieben. Die fertigen PNG liegen in public/og und
 * werden mitgeliefert, damit der Bauprozess ohne Browser auskommt.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateMaze, generateSudoku, generateWordSearch } from '@raetselheft/engine';
import { mazeElements } from '@raetselheft/render/layout/maze';
import { sudokuElements } from '@raetselheft/render/layout/sudoku';
import { wordSearchElements } from '@raetselheft/render/layout/wordsearch';
import { createMetricsMeasurer } from '@raetselheft/render/measure';
import metrics from '@raetselheft/render/metrics.json';
import { elementToSvg } from '@raetselheft/render/svg';
import { NEUTRAL_THEME, THEMES, themeById } from '@raetselheft/render/themes';

const FONT_DIR = join(import.meta.dirname, '..', '..', '..', 'packages', 'render', 'fonts');
const measurer = createMetricsMeasurer(metrics);
const BOX = { x: 0, y: 0, width: 100, height: 100 };

const dataUrl = async (file: string): Promise<string> =>
  `data:font/ttf;base64,${(await readFile(join(FONT_DIR, file))).toString('base64')}`;

function puzzleSvg(themeId: string, seed: string, kind: 'wordsearch' | 'maze' | 'sudoku'): string {
  const theme = themeById(themeId);
  const palette = theme.colors;
  const elements =
    kind === 'wordsearch'
      ? wordSearchElements(
          generateWordSearch({
            words: (theme.words.length > 0 ? theme.words : ['Rätsel', 'Spass', 'Papier']).slice(
              0,
              8,
            ),
            seed,
            width: 9,
          }),
          BOX,
          measurer,
          { palette, showWords: false },
        )
      : kind === 'maze'
        ? mazeElements(generateMaze({ seed, width: 11, height: 11 }), BOX, {
            palette,
            compact: true,
            ...(theme.id === NEUTRAL_THEME.id
              ? {}
              : { icons: { start: theme.icons.mazeStart, end: theme.icons.mazeEnd } }),
          })
        : sudokuElements(generateSudoku({ seed, size: 6, difficulty: 'easy' }), BOX, measurer, {
            palette,
            ...(theme.sudokuIcons.length > 0 ? { icons: theme.sudokuIcons } : {}),
          });
  // Das Labyrinth trägt Marken ausserhalb des Gitters, daher mehr Rand.
  const viewBox = kind === 'maze' ? '-10 -14 120 128' : '-4 -6 108 112';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${elements
    .map(elementToSvg)
    .join('')}</svg>`;
}

async function main(): Promise<void> {
  const outDir = process.argv[2] ?? join(import.meta.dirname, '..', '..', '..', 'og-quellen');
  await mkdir(outDir, { recursive: true });
  const [nunito, inter, interBold] = await Promise.all([
    dataUrl('Nunito-Bold.ttf'),
    dataUrl('Inter-Regular.ttf'),
    dataUrl('Inter-SemiBold.ttf'),
  ]);

  const targets = [
    { name: 'default', themeId: NEUTRAL_THEME.id, title: 'Rätsel zum Ausdrucken' },
    ...THEMES.map((theme) => ({
      name: theme.id,
      themeId: theme.id,
      title: `${theme.name}-Rätsel zum Ausdrucken`,
    })),
  ];

  for (const target of targets) {
    const theme = themeById(target.themeId);
    const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:'Nunito';font-weight:700;src:url('${nunito}') format('truetype');}
@font-face{font-family:'Inter';font-weight:400;src:url('${inter}') format('truetype');}
@font-face{font-family:'Inter';font-weight:600;src:url('${interBold}') format('truetype');}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;display:flex;align-items:center;gap:56px;padding:64px;background:#fff;font-family:Inter,sans-serif}
.text{flex:1}
h1{font-family:Nunito,sans-serif;font-size:60px;line-height:1.1;color:${theme.colors.accent}}
p{margin-top:20px;font-size:26px;color:#475569}
.brand{margin-top:36px;font-weight:600;font-size:24px;color:${theme.colors.ink}}
.puzzles{display:flex;gap:20px}
.puzzles svg{width:220px;height:220px}
.card{background:#fff;border:2px solid ${theme.colors.light};border-radius:20px;padding:16px}
</style>
<div class="text">
  <h1>${target.title}</h1>
  <p>Wortsuchrätsel, Labyrinth und Sudoku als druckfertiges PDF. Einzelrätsel gratis.</p>
  <div class="brand">raetselheft.ch</div>
</div>
<div class="puzzles">
  <div class="card">${puzzleSvg(target.themeId, `${target.name}-a`, 'wordsearch')}</div>
  <div class="card">${puzzleSvg(target.themeId, `${target.name}-b`, 'maze')}</div>
</div>`;
    await writeFile(join(outDir, `${target.name}.html`), html);
  }
  process.stdout.write(`Quellen für ${targets.length} OG-Bilder in ${outDir}\n`);
}

await main();
