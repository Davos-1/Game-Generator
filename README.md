# Rätselheft

Rätsel- und Spielgenerator für Ausdrucke: Wortsuchrätsel, Labyrinth und Sudoku als druckfertiges PDF. Einzelrätsel im Standarddesign sind gratis. Personalisierte Rätselhefte mit Themen-Design (Deckblatt, Namen der Gäste, Lösungsteil) für Kindergeburtstag, Hochzeit oder Firmenfeier sind das Premium-Produkt.

## Voraussetzungen

- Node 22 (siehe `.nvmrc`)
- pnpm 10 via Corepack

```bash
corepack enable
```

Corepack liest die pnpm-Version aus dem Feld `packageManager` der Root-`package.json` und installiert sie automatisch.

## Entwicklung

```bash
pnpm install
```

| Befehl              | Beschreibung                                                      |
| ------------------- | ----------------------------------------------------------------- |
| `pnpm dev`          | Startet den Astro-Dev-Server für `apps/web`                       |
| `pnpm test`         | Führt alle Tests aus (Vitest in `packages/engine` und `apps/web`) |
| `pnpm lint`         | Prüft den Code mit ESLint                                         |
| `pnpm format`       | Formatiert den Code mit Prettier                                  |
| `pnpm format:check` | Prüft die Formatierung (wie in der CI)                            |
| `pnpm typecheck`    | Prüft die TypeScript-Typen (`tsc` und `astro check`)              |
| `pnpm build`        | Baut alle Pakete und die Website (Output in `apps/web/dist`)      |

## Projektstruktur

- `apps/web` – Astro-Website (statischer Output) mit React-Islands für die Generator-UI, Tailwind CSS, Locale-Dateien unter `src/i18n`
- `packages/engine` – reine TypeScript-Bibliothek mit den Rätsel-Algorithmen (deterministisch per Seed), unit-getestet mit Vitest
- `.github/workflows` – CI (Lint, Format, Typecheck, Test, Build) und Deploy auf Cloudflare Pages
- `docs` – Anleitungen, z. B. zum Deployment

## Sprache

Alle Texte der Website sind in Schweizer Standarddeutsch: Umlaute (ä, ö, ü) werden normal verwendet, statt ß wird immer ss geschrieben.

## Deployment

Pull Requests durchlaufen die CI-Pipeline. Ein Push auf `main` löst zusätzlich das Deployment auf Cloudflare Pages aus. Die Einrichtung ist in [`docs/DEPLOY.md`](docs/DEPLOY.md) beschrieben.

## Plan

Die Produktvision und die Arbeitspakete AP1 bis AP10 stehen in [`PLAN.md`](PLAN.md).
