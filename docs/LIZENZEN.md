# Lizenzen der verwendeten Assets

Diese Datei dokumentiert, woher die im Repository verwendeten Bilder und
Schriften stammen und unter welchen Bedingungen sie genutzt werden dürfen.
Der Grund: die erzeugten PDF-Rätselhefte werden verkauft. Für jedes Asset
muss deshalb belegbar sein, dass die kommerzielle Nutzung erlaubt ist —
PLAN.md Abschnitt 8 nennt die Illustrations-Lizenzen als den kritischsten
Beschaffungspunkt des Projekts. Diese Datei ist der Ort, an dem dieser Beleg
gesammelt wird.

## Themen-Illustrationen

Die Illustrationen unter `packages/render/assets/themes/**` (Rohdateien) und
`packages/render/assets/themes-optimised/**` (für das Rendering verwendete,
verkleinerte/komprimierte Fassung) sind laut Angabe des Betreibers
**KI-generiert**. Im Repository selbst — Code, Commit-Historie, Docs — liegt
keine weitere Angabe zu Werkzeug, Version oder Nutzungsbedingungen vor; das
muss der Betreiber nachtragen (siehe «Noch einzutragen» unten).

### Übersicht

| Thema         | Dateien (Rohordner `themes/`) | Dateien (`themes-optimised/`) | Format                                        |
| ------------- | :---------------------------: | :---------------------------: | --------------------------------------------- |
| `dschungel`   |              14               |               9               | PNG, 400×400 (Rohordner), 200×200 (optimiert) |
| `einhorn`     |              12               |               8               | PNG, 400×400 (Rohordner), 200×200 (optimiert) |
| `hochzeit`    |              12               |               7               | PNG, 400×400 (Rohordner), 200×200 (optimiert) |
| `piraten`     |              12               |               8               | PNG, 400×400 (Rohordner), 200×200 (optimiert) |
| `weihnachten` |              12               |               7               | PNG, 400×400 (Rohordner), 200×200 (optimiert) |

Der Rohordner (`themes/`) enthält pro Thema mehr Dateien als der optimierte
Ordner (`themes-optimised/`), weil nicht jede Rohillustration im
tatsächlichen Rendering (Cover, Ecken-Deko, Sudoku-Icons, Labyrinth-Start/Ziel
gemäss `packages/render/src/themes/types.ts`) verwendet wird.

### Noch einzutragen

Damit der Beleg für die kommerzielle Nutzung vollständig ist, muss der
Betreiber pro Bildbestand (mindestens einmal pro Erzeugungs-Batch, im Zweifel
pro Thema) folgende Angaben ergänzen:

- [ ] Verwendetes Werkzeug/Modell und Versionsstand (z. B. Modellname und
      Datum der Modellversion)
- [ ] Datum der Erzeugung
- [ ] Konto/Abo, unter dem erzeugt wurde (Plan-Bezeichnung, da Gratis-Stufen
      oft andere Bedingungen haben als kostenpflichtige)
- [ ] Nutzungsbedingungs-Stand des jeweiligen Werkzeugs zum Erzeugungs-
      zeitpunkt (Link + Datum/Version der Bedingungen)
- [ ] Ob die Nutzungsbedingungen des Werkzeugs kommerzielle Nutzung des
      Outputs ausdrücklich erlauben
- [ ] Ob und wie die Bilder nachbearbeitet wurden (z. B. Freistellen,
      Farbanpassung, Zuschnitt, manuelle Retusche)

## Rechtliche Einordnung, ehrlich

Keine Rechtsberatung, nur die sachliche Ausgangslage:

- KI-generierter Output geniesst in der Schweiz und in der EU in der Regel
  **keinen urheberrechtlichen Schutz** zugunsten der Person, die ihn erzeugt
  hat, weil es an einem menschlichen Werk fehlt. Das heisst: die Bilder
  können genutzt und in den Rätselheften verkauft werden, aber es besteht
  kein Urheberrecht, mit dem sich Dritte von einer Nachahmung derselben
  Bilder abhalten liessen.
- Entscheidend für die eigene Nutzung sind stattdessen die
  **Nutzungsbedingungen des jeweiligen KI-Werkzeugs**. Diese regeln
  vertraglich, ob und wie der Output kommerziell verwendet werden darf —
  manche Gratis-Stufen schliessen kommerzielle Nutzung ausdrücklich aus,
  während kostenpflichtige Abos sie oft erlauben.
- Empfehlung: die Nutzungsbedingungen des Werkzeugs so archivieren, wie sie
  zum Erzeugungszeitpunkt galten (z. B. als PDF), und hier verlinken; ebenso
  die verwendeten Prompts aufbewahren. Das ist der Beleg, falls die
  kommerzielle Nutzung später infrage gestellt wird.

## Schriften

| Datei                                                  | Familie             | Lizenz  | Lizenztext                                         |
| ------------------------------------------------------ | ------------------- | ------- | -------------------------------------------------- |
| `packages/render/fonts/Nunito-Bold.ttf`                | Nunito (Bold)       | OFL 1.1 | `packages/render/fonts/OFL-Nunito.txt`             |
| `packages/render/fonts/Inter-Regular.ttf`              | Inter (Regular)     | OFL 1.1 | `packages/render/fonts/OFL-Inter.txt`              |
| `packages/render/fonts/Inter-SemiBold.ttf`             | Inter (SemiBold)    | OFL 1.1 | `packages/render/fonts/OFL-Inter.txt`              |
| `apps/web/public/fonts/BricolageGrotesque-Latin.woff2` | Bricolage Grotesque | OFL 1.1 | `apps/web/public/fonts/OFL-BricolageGrotesque.txt` |

Die drei Schriften unter `packages/render/fonts/` stammen laut
`packages/render/fonts/README.md` aus dem offiziellen Google-Fonts-Repository
(`google/fonts`, Verzeichnis `ofl/`). Für Bricolage Grotesque liegt der
Lizenztext bei, eine Herkunftsnotiz im Repository fehlt; sie ist nachzutragen.
Alle vier stehen unter der SIL Open Font License 1.1. Die OFL erlaubt ausdrücklich das
Einbetten in Dokumente (hier: die generierten PDFs) und die Auslieferung an
Browser (SVG-Vorschau via `@font-face`); nicht erlaubt ist einzig der
separate Verkauf der unveränderten Schrift-Dateien unter eigenem Namen, was
hier nicht der Fall ist. Details zur Herkunft (Quell-URLs der Variable Fonts,
Erzeugung der statischen Schnitte) stehen in
`packages/render/fonts/README.md`.

## Weitere Assets

- **OG-Bilder** (`apps/web/public/og/*.png`): laut `docs/OG-BILDER.md` keine
  eigenständigen Grafiken, sondern Screenshots von HTML-Seiten, die echte,
  mit den Theme-Farben und -Schriften gerenderte Beispielrätsel zeigen
  (erzeugt mit `pnpm --filter @raetselheft/web og`, anschliessend lokal per
  Browser/Playwright zu PNG gerastert). Sie enthalten keine der KI-generierten
  Themen-Illustrationen, sondern die einfachen Vektor-Icons aus
  `packages/render/src/icons.ts` sowie Text in den oben gelisteten Schriften.
  Es gelten daher dieselben Font-Lizenzen wie oben; ein separater
  Lizenzeintrag für die OG-Bilder ist nicht nötig.
- **Favicon** (`apps/web/public/favicon.svg`): selbst erstelltes,
  eigenständiges SVG (ein einfacher Stern auf farbigem Grund), keine externen
  Bestandteile, keine Lizenzfrage.
