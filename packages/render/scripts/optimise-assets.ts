/**
 * Erzeugt aus den gelieferten Themen-Illustrationen die Auslieferungsvarianten.
 *
 * Die Originale unter `assets/themes/` sind 400 × 400 px, RGBA und im Schnitt
 * 340 KB gross — für ein Bild dieser Kantenlänge weit mehr als nötig. Der
 * Alphakanal ist überall deckend und damit nutzlos, und die Farbtiefe geht
 * über das hinaus, was ein Tintenstrahler auf Papier auflöst.
 *
 * Dieses Skript schreibt nach `assets/themes-optimised/<Theme>/` genau die
 * Bilder, die die Themes über `illustrations` auch wirklich nennen — je nach
 * Rolle in einer von zwei Grössen:
 *
 * - Deckblatt-Motiv: 400 px (grosse Fläche, mehr Farben)
 * - alle übrigen:    200 px; dort werden real 8 bis 20 mm gedruckt, das
 *                    ergibt immer noch über 300 dpi
 *
 * Die Originale bleiben als Quelle liegen und werden nie ausgeliefert.
 *
 * Aufruf: pnpm --filter @raetselheft/render assets
 */
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { THEMES } from '../src/themes';

const ROOT = join(import.meta.dirname, '..');
const SOURCE = join(ROOT, 'assets', 'themes');
const TARGET = join(ROOT, 'assets', 'themes-optimised');

/** Zielgrössen: Kantenlänge in Pixeln und Grösse der Farbpalette. */
const COVER = { size: 400, colours: 192 };
const SYMBOL = { size: 200, colours: 128 };

const kb = (bytes: number): string => `${Math.round(bytes / 1024)} KB`;

async function main(): Promise<void> {
  let before = 0;
  let after = 0;
  let count = 0;

  for (const theme of THEMES) {
    const art = theme.illustrations;
    if (!art) continue;
    await mkdir(join(TARGET, theme.id), { recursive: true });

    // Ein Name kann mehrere Rollen tragen (Dschungel nutzt «temple» als
    // Deckblatt und als Labyrinth-Ziel). Die grössere Variante gewinnt.
    const wanted = new Map<string, typeof COVER>();
    for (const name of [art.corner, art.mazeStart, art.mazeEnd, ...art.sudoku]) {
      wanted.set(name, SYMBOL);
    }
    wanted.set(art.cover, COVER);

    for (const [name, variant] of wanted) {
      const from = join(SOURCE, theme.id, `${name}.png`);
      before += (await stat(from)).size;
      const buffer = await sharp(from)
        // Der Alphakanal ist in allen gelieferten Bildern deckend. Ihn auf
        // Weiss aufzulösen spart rund ein Drittel, ohne dass sich am
        // Ergebnis etwas ändert.
        .flatten({ background: '#ffffff' })
        .resize(variant.size, variant.size, { fit: 'cover' })
        .png({ palette: true, colours: variant.colours, effort: 10 })
        .toBuffer();
      await writeFile(join(TARGET, theme.id, `${name}.png`), buffer);
      after += buffer.length;
      count += 1;
    }
  }

  console.log(`${count} Bilder aus ${kb(before)} Quellmaterial`);
  console.log(`Ausgeliefert: ${kb(after)} (${Math.round(100 - (after / before) * 100)} % kleiner)`);
  console.log(`Geschrieben nach ${TARGET}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
