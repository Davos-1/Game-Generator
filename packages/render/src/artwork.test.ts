import { beforeAll, describe, expect, it } from 'vitest';
import { artworkFor, artworkKeys, sudokuArtworkFor } from './artwork';
import { createMeasurer } from './fonts';
import { COVER_BOX, coverElements } from './layout/cover';
import type { TextMeasurer } from './measure';
import { loadFontsFromDisk } from './node';
import { NEUTRAL_THEME, THEMES, themeById } from './themes';

let measurer: TextMeasurer;

beforeAll(async () => {
  measurer = createMeasurer(await loadFontsFromDisk());
});

describe('Druckmodus', () => {
  it('liefert im sparsamen Modus nie ein Bild', () => {
    for (const theme of [NEUTRAL_THEME, ...THEMES]) {
      expect(artworkFor(theme, 'cover', 'sparsam'), theme.id).toBeUndefined();
      expect(sudokuArtworkFor(theme, 'sparsam'), theme.id).toBeUndefined();
    }
  });

  it('liefert im farbigen Modus für jedes Theme alle Rollen', () => {
    for (const theme of THEMES) {
      for (const role of ['cover', 'corner', 'mazeStart', 'mazeEnd'] as const) {
        expect(artworkFor(theme, role, 'farbig'), `${theme.id}/${role}`).toMatch(
          new RegExp(`^${theme.id}/[a-z]+$`),
        );
      }
      expect(sudokuArtworkFor(theme, 'farbig')).toHaveLength(6);
    }
  });

  it('lässt das neutrale Design auch farbig bei den Vektor-Icons', () => {
    expect(artworkFor(NEUTRAL_THEME, 'cover', 'farbig')).toBeUndefined();
    expect(artworkKeys(NEUTRAL_THEME)).toEqual([]);
  });

  it('nennt jeden Bildschlüssel nur einmal, deckt aber alle Rollen ab', () => {
    for (const theme of THEMES) {
      const keys = artworkKeys(theme);
      // Ein Motiv darf mehrere Rollen tragen — Weihnachten nutzt «tree» als
      // Deckblatt und als Sudoku-Symbol. Vorgeladen wird es trotzdem einmal.
      expect(new Set(keys).size, theme.id).toBe(keys.length);
      const needed = [
        artworkFor(theme, 'cover', 'farbig'),
        artworkFor(theme, 'corner', 'farbig'),
        artworkFor(theme, 'mazeStart', 'farbig'),
        artworkFor(theme, 'mazeEnd', 'farbig'),
        ...(sudokuArtworkFor(theme, 'farbig') ?? []),
      ];
      for (const key of needed) expect(keys, `${theme.id}: ${String(key)}`).toContain(key);
    }
  });
});

describe('Deckblatt', () => {
  const cover = (themeId: string, mode: 'farbig' | 'sparsam') =>
    coverElements({ title: 'Rätselheft' }, COVER_BOX(12), measurer, themeById(themeId), mode);

  it('zeichnet farbig ein Bild, sparsam einen Pfad', () => {
    const colourful = cover('piraten', 'farbig');
    const thrifty = cover('piraten', 'sparsam');
    expect(colourful.some((el) => el.type === 'image')).toBe(true);
    expect(thrifty.some((el) => el.type === 'image')).toBe(false);
    expect(thrifty.some((el) => el.type === 'path')).toBe(true);
  });

  it('fasst das Bild ein, weil die Motive keinen freien Rand haben', () => {
    const elements = cover('piraten', 'farbig');
    const image = elements.find((el) => el.type === 'image');
    expect(image).toBeDefined();
    if (image?.type !== 'image') throw new Error('kein Bild');
    // Auf dem Bildrand liegen zwei Rahmen: aussen decor, innen hell.
    const frames = elements.filter(
      (el) => el.type === 'rect' && el.stroke && Math.abs(el.width - image.width) <= 2,
    );
    expect(frames).toHaveLength(2);
  });

  it('hält das Bild innerhalb der Deckblatt-Box', () => {
    const box = COVER_BOX(12);
    for (const theme of THEMES) {
      const image = cover(theme.id, 'farbig').find((el) => el.type === 'image');
      if (image?.type !== 'image') throw new Error(`kein Bild in ${theme.id}`);
      expect(image.x, theme.id).toBeGreaterThanOrEqual(box.x);
      expect(image.y, theme.id).toBeGreaterThanOrEqual(box.y);
      expect(image.x + image.width, theme.id).toBeLessThanOrEqual(box.x + box.width);
    }
  });
});
