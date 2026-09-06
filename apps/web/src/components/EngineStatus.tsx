import { ENGINE_VERSION, createRng } from '@raetselheft/engine';
import { useState } from 'react';

/**
 * Kleine React-Island, die belegt, dass Engine-Package und Hydration
 * im Browser funktionieren. Wird in AP5 durch den echten Konfigurator ersetzt.
 */
export default function EngineStatus() {
  const [seed, setSeed] = useState('raetselheft');
  const sample = createRng(seed).int(1, 100);

  return (
    <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
      <p className="mb-2 font-medium text-slate-700">Engine {ENGINE_VERSION} geladen</p>
      <label className="flex flex-wrap items-center gap-2">
        <span>Seed:</span>
        <input
          className="rounded border border-slate-300 px-2 py-1"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
        />
        <span className="text-slate-500">
          → deterministische Zahl: <strong data-testid="sample">{sample}</strong>
        </span>
      </label>
    </div>
  );
}
