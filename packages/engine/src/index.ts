/**
 * @raetselheft/engine
 *
 * Öffentliche API der Rätsel-Engine. Alle Module sind UI-unabhängig,
 * deterministisch (Seed) und ohne Browser-Abhängigkeiten nutzbar.
 */
export { createRng, hashSeed } from './random';
export type { Rng } from './random';

/** Version der Engine-API; wird in gespeicherten Heft-Konfigurationen mitgeführt. */
export const ENGINE_VERSION = '0.1.0';
