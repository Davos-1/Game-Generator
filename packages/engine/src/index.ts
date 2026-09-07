/**
 * @raetselheft/engine
 *
 * Öffentliche API der Rätsel-Engine. Alle Module sind UI-unabhängig,
 * deterministisch (Seed) und ohne Browser-Abhängigkeiten nutzbar.
 */
export { createRng, hashSeed } from './random';
export type { Rng } from './random';

export type { Cell } from './grid';
export * from './wordsearch';
export * from './dotToDot';
export * from './maze';
export * from './sudoku';

/** Version der Engine-API; wird in gespeicherten Heft-Konfigurationen mitgeführt. */
export const ENGINE_VERSION = '0.4.0';
