# Arbeitsregeln für dieses Repository

## Projekt

Rätsel- und Spielgenerator für Ausdrucke (Wortsuchrätsel, Labyrinth, Sudoku) als PDF. Vollständige Spezifikation und Arbeitspakete AP1–AP10 in `PLAN.md`. Arbeitsweise: pro Arbeitspaket Plan vorlegen → umsetzen → Review/Tests → erst dann weiter.

## Parallele Arbeit

An diesem Repository arbeiten zurzeit zwei Claude-Sessions gleichzeitig. Wer
was anfasst und welche Dateien geteilt sind, steht in
`docs/AGENTEN-ABSPRACHE.md`. Vor Änderungen an fremden Bereichen dort
nachsehen und eigene Vorhaben eintragen.

## Sprache

- Website-Texte, Kommentare, Commit-Messages und Docs: Deutsch (Schweizer Standarddeutsch).
- Umlaute (ä, ö, ü) normal verwenden. **Nie ß**, immer ss (grüssen, Grösse, Strasse).
- Anführungszeichen in UI-Texten: «…».
- Code-Bezeichner (Variablen, Funktionen, Dateien) auf Englisch.
- Alle UI-Texte in `apps/web/src/i18n/<locale>.json`, nie hart im Markup (i18n-Vorbereitung, PLAN.md 6.5).

## Struktur

- `packages/engine`: UI-unabhängige Rätsel-Logik, keine Browser-/DOM-Abhängigkeiten, alles deterministisch über `createRng(seed)`.
- `apps/web`: Astro (statisch) + React-Islands nur wo Interaktivität nötig ist.
- Rendering-Prinzip: eine Layout-Quelle für SVG-Vorschau und PDF (PLAN.md 6.1).

## Qualität

Vor jedem Commit müssen lokal grün sein: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`. Neue Engine-Funktionen brauchen Unit-Tests (inkl. Determinismus per Seed).
