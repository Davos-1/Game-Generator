import { ICON_NAMES, type IconName } from '../icons';
import { COLORS, type Palette } from '../primitives';
import dschungel from './data/dschungel.json';
import dschungelWords from './data/dschungel.words.json';
import einhorn from './data/einhorn.json';
import einhornWords from './data/einhorn.words.json';
import hochzeit from './data/hochzeit.json';
import hochzeitWords from './data/hochzeit.words.json';
import piraten from './data/piraten.json';
import piratenWords from './data/piraten.words.json';
import type { Theme, ThemeInput } from './types';

export type { Theme, ThemeInput } from './types';

/**
 * Neutrales Standarddesign für die Gratis-Einzelrätsel: keine Deko, keine
 * Wortliste, nur die Grundfarben.
 */
export const NEUTRAL_THEME: Theme = {
  id: 'neutral',
  name: 'Standard',
  colors: { ...COLORS, decor: COLORS.light },
  icons: { corner: 'sparkle', cover: 'sparkle', mazeStart: 'sparkle', mazeEnd: 'sparkle' },
  sudokuIcons: [],
  words: [],
};

/**
 * Ein neues Theme braucht zwei JSON-Dateien (Definition und Wortliste) und
 * einen Eintrag in dieser Liste. Die Layout-Logik bleibt unberührt.
 */
const REGISTRY: readonly [ThemeInput, readonly string[]][] = [
  [piraten as ThemeInput, piratenWords],
  [einhorn as ThemeInput, einhornWords],
  [dschungel as ThemeInput, dschungelWords],
  [hochzeit as ThemeInput, hochzeitWords],
];

export const THEMES: Theme[] = REGISTRY.map(([theme, words]) => ({ ...theme, words: [...words] }));

const BY_ID = new Map<string, Theme>([
  [NEUTRAL_THEME.id, NEUTRAL_THEME],
  ...THEMES.map((theme) => [theme.id, theme] as const),
]);

/** Theme nach Id; unbekannte Ids ergeben das neutrale Standarddesign. */
export const themeById = (id: string | undefined): Theme =>
  (id ? BY_ID.get(id) : undefined) ?? NEUTRAL_THEME;

export const THEME_IDS: string[] = [...BY_ID.keys()];

const HEX = /^#[0-9a-f]{6}$/i;
const PALETTE_KEYS: (keyof Palette)[] = [
  'ink',
  'muted',
  'light',
  'grid',
  'accent',
  'solution',
  'watermark',
];

/** Prüft eine Theme-Definition; liefert die Liste der Mängel (leer = in Ordnung). */
export function validateTheme(theme: Theme): string[] {
  const problems: string[] = [];
  if (!theme.id.match(/^[a-z][a-z0-9-]*$/)) problems.push(`Ungültige Id: ${theme.id}`);
  if (theme.name.trim().length === 0) problems.push('Name fehlt');

  for (const key of [...PALETTE_KEYS, 'decor' as const]) {
    const value = theme.colors[key];
    if (typeof value !== 'string' || !HEX.test(value)) {
      problems.push(`Farbe ${key} ist kein Hex-Wert: ${String(value)}`);
    }
  }

  const icons: IconName[] = [
    theme.icons.corner,
    theme.icons.cover,
    theme.icons.mazeStart,
    theme.icons.mazeEnd,
    ...theme.sudokuIcons,
  ];
  for (const icon of icons) {
    if (!ICON_NAMES.includes(icon)) problems.push(`Unbekanntes Icon: ${icon}`);
  }

  if (theme.id !== NEUTRAL_THEME.id) {
    if (theme.sudokuIcons.length < 6) problems.push('Weniger als sechs Sudoku-Symbole');
    if (new Set(theme.sudokuIcons).size !== theme.sudokuIcons.length) {
      problems.push('Sudoku-Symbole sind nicht eindeutig');
    }
    if (theme.words.length < 30) problems.push(`Nur ${theme.words.length} Wörter (mindestens 30)`);
    if (new Set(theme.words).size !== theme.words.length) problems.push('Doppelte Wörter');
    for (const word of theme.words) {
      if (!/^[A-Za-zÄÖÜäöü]{3,12}$/.test(word)) problems.push(`Ungeeignetes Wort: ${word}`);
    }
  }
  return problems;
}
