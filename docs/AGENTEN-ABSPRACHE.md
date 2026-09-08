# Absprache zwischen den Agenten

An diesem Repository arbeiten zurzeit zwei Claude-Sessions parallel. Diese
Datei ist der gemeinsame Kanal: Direktnachrichten zwischen den Sessions sind
nicht möglich, gelesen wird hier. Wer etwas ändert, das die andere Seite
betrifft, trägt es hier ein.

Stand: 8. September 2026.

## Wer macht was

**Session A — Funktionen und Rätseltypen** (arbeitet auf
`claude/new-session-du9eym`, zuletzt AP11 Punkte-zu-Punkte).

Zuständig für:

- `packages/engine/**`
- `packages/render/src/layout/` für neue Rätseltypen, `pages.ts`
- `apps/web/src/lib/puzzleConfig.ts`, `bookletConfig.ts`, `render.ts`
- `apps/web/src/content/examples.ts`
- `apps/worker/**`

**Session B — Gestaltung und Themen-Designs** (arbeitet auf
`claude/website-design-improvement-itcgrk`, zuletzt der Farbwelt-Umbau in
`ea3aed4`).

Zuständig für:

- `apps/web/src/styles/global.css`
- `apps/web/src/components/Section.astro`, `Card.astro`, `Button.astro`,
  `Icon.astro`
- `apps/web/src/layouts/BaseLayout.astro`, `components/Prose.astro`
- `packages/render/src/page.ts`, `layout/cover.ts`
- `packages/render/src/themes/**` inklusive Theme-Schema

## Gemeinsame Dateien

Hier ändern beide Seiten etwas. Solange jede Seite in einem eigenen Objekt
oder Abschnitt arbeitet, führt Git das ohne Konflikt zusammen. Trotzdem: vor
grösseren Umbauten hier einen Hinweis eintragen.

- `apps/web/src/i18n/de-CH.json`
- `apps/web/src/content/copy.json`
- `apps/web/src/content/landing.ts`
- `apps/web/src/components/PuzzleGenerator.tsx`
- `apps/web/src/components/BookletBuilder.tsx`
- `PLAN.md`

## Regeln für neues Markup

Die Website hat seit `ea3aed4` ein Token-System. Neues Markup verwendet:

- Farben: `bg-paper`, `bg-surface`, `text-ink`, `text-muted`, `border-line`,
  `border-line-strong`, `bg-accent` mit `text-accent-ink`, auf dem dunklen
  Grund `bg-hero`, `text-hero-ink`, `text-hero-muted`
- Radien: nur `rounded-sheet` und `rounded-group`
- Bausteine: `Section.astro` für Abschnitte, `Card.astro`, `Button.astro`,
  `Icon.astro` für Symbole

Keine `slate-*`-Klassen, kein `rounded-lg`/`rounded-xl`/`rounded-md`, keine
Symbole aus fremden Icon-Sets. Die Symbole kommen aus
`packages/render/src/icons.ts`, damit Website und PDF dieselben Formen zeigen.

## Offene Punkte

- **Theme-Schema wird erweitert.** Session B plant zusätzliche Felder in
  `packages/render/src/themes/types.ts` und den JSON-Dateien (Bordüre,
  Titel-Signatur, Gitter-Charakter), damit sich die Themes stärker
  unterscheiden als bisher. Braucht ein neuer Rätseltyp eigene Theme-Symbole
  (analog `mazeStart` und `mazeEnd`), bitte hier eintragen — dann kommen sie
  in einem Zug dazu statt in zwei Runden.
- **Reihenfolge beim Zusammenführen.** Session B merged vor jedem eigenen
  Start den Stand von `claude/new-session-du9eym` und pusht erst nach
  Rücksprache mit dem Nutzer.
