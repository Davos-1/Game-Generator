/**
 * Node-Hilfen (Tests, Skripte): Fonts vom Dateisystem laden.
 * Nicht im Browser importieren.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { FONT_FILES, type FontSet } from './fonts';

export const FONT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fonts');

export async function loadFontsFromDisk(dir: string = FONT_DIR): Promise<FontSet> {
  const [display, body, bodyBold] = await Promise.all([
    readFile(join(dir, FONT_FILES.display)),
    readFile(join(dir, FONT_FILES.body)),
    readFile(join(dir, FONT_FILES.bodyBold)),
  ]);
  return {
    display: new Uint8Array(display),
    body: new Uint8Array(body),
    bodyBold: new Uint8Array(bodyBold),
  };
}
