/**
 * Liest die Schriftmasse aus den TTF-Dateien und schreibt sie als JSON.
 *
 * Damit kann der Browser Texte messen, ohne fontkit zu laden (rund 146 KB
 * gepackt). Die Tabelle wird eingecheckt; ein Test vergleicht sie laufend mit
 * fontkit, damit sie nicht auseinanderlaufen kann.
 *
 * Aufruf: pnpm --filter @raetselheft/render metrics
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as fontkit from 'fontkit';
import { FONT_FILES, type FontMetrics, type MetricsTable } from '../src/measure';
import { loadFontsFromDisk } from '../src/node';

const OUT = join(import.meta.dirname, '..', 'src', 'metrics.json');

async function main(): Promise<void> {
  const fonts = await loadFontsFromDisk();
  const table: Partial<MetricsTable> = {};

  for (const key of Object.keys(FONT_FILES) as (keyof typeof FONT_FILES)[]) {
    const parsed = fontkit.create(fonts[key]);
    if ('fonts' in parsed) throw new Error('Font-Collections werden nicht unterstützt');
    const widths: Record<string, number> = {};
    for (const codePoint of parsed.characterSet) {
      if (!parsed.hasGlyphForCodePoint(codePoint)) continue;
      const { glyphs } = parsed.layout(String.fromCodePoint(codePoint));
      const advance = glyphs.reduce((sum, glyph) => sum + glyph.advanceWidth, 0);
      widths[String(codePoint)] = advance;
    }
    const metrics: FontMetrics = {
      unitsPerEm: parsed.unitsPerEm,
      ascent: parsed.ascent,
      descent: parsed.descent,
      capHeight: parsed.capHeight,
      // Breite für Zeichen ohne Glyphe (.notdef).
      fallbackWidth: parsed.layout('￿').glyphs.reduce((sum, g) => sum + g.advanceWidth, 0),
      widths,
    };
    table[key] = metrics;
  }

  await writeFile(OUT, `${JSON.stringify(table, null, 2)}\n`);
  const counts = Object.entries(table).map(([k, v]) => `${k}: ${Object.keys(v.widths).length}`);
  process.stdout.write(`Metriken geschrieben (${counts.join(', ')} Zeichen)\n`);
}

await main();
