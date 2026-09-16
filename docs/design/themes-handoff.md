# Handoff: Rätselheft-Themes (Weihnachten, Piraten, Einhörner, Dschungel, Hochzeit)

## Overview

Redesign der fünf Heft-Themes des Rätsel-Generators. Jedes Theme besteht aus einer
7-Farben-Palette, einem Satz vollfarbiger Illustrationen mit festen Rollen und
Layout-Regeln für Deckblatt, Rätselseite und Lösungsteil (A4, 12 mm Rand).

Ziel ist, dass sich die fünf Themes im Druck deutlich voneinander unterscheiden –
bisher trugen alle dasselbe generische Pfad-Icon.

## About the Design Files

Die `Theme *.dc.html`-Dateien in `design_files/` sind **Design-Referenzen in HTML**:
Prototypen, die Aussehen und Aufbau zeigen. Sie sind kein Produktionscode zum
Kopieren. Die Aufgabe ist, diese Vorlagen in der bestehenden Render-Pipeline
(`packages/render`, pdf-lib-artige Primitives) nachzubauen – mit den dort schon
vorhandenen Bausteinen (`primitives.ts`, `page.ts`, `layout/*.ts`).

Die HTML-Mockups zeigen A4 im Massstab **2 px = 1 mm** (420 × 594 px = 210 × 297 mm).
Alle px-Werte in den Mockups sind also durch 2 zu teilen, um Millimeter zu erhalten.

## Fidelity

**High-fidelity.** Farben, Rollenzuordnung der Icons, Rahmenstärken und
Seitenaufteilung sind final. Die Schriftgrössen in den Mockups sind massstäblich
gerechnet (siehe Typografie-Tabelle unten) und sollen 1:1 übernommen werden.

## Was sich gegenüber heute ändert

1. **Palette bekommt eine neue Rolle `decor`** (Messing / Gold / Flieder / Ocker /
   Champagner). Sie wird für die innere Zierlinie, den Trennstrich und die
   Ecken-Deko verwendet. Alle anderen Rollen bleiben wie im bestehenden
   `Palette`-Typ.
2. **Icons sind jetzt Rasterbilder statt Pfade.** Der bisherige Ansatz (einfarbige
   M/L/C/Z-Pfade, per Palette umfärbbar) trägt die gewünschte Bildsprache nicht.
   Jedes Theme hat 12–14 PNGs (400 × 400 px) mit festen Rollen.
3. **Der Sudoku-Symbolsatz ist pro Theme kuratiert** (6 Symbole, bewusst nach
   Silhouette und Farbe auseinandergehalten, damit Kinder sie auf ~15 mm
   unterscheiden können).
4. **Deckblatt trägt eine grosse Illustration** (85 mm) statt eines 52-mm-Icons,
   plus einen zweifarbigen Doppelrahmen (`accent` aussen, `decor` innen).

## Screens / Views

### 1. Deckblatt (`layout/cover.ts`)

- **Purpose**: Titelseite des Hefts, personalisiert mit Name, Anlass, Datum.
- **Layout**: A4 Hochformat, Rand 12 mm. Doppelrahmen: äusserer Rahmen 0.8 mm
  Linienstärke in `accent` auf dem 12-mm-Rand; innerer Rahmen 0.3 mm in `decor`,
  2.5 mm nach innen versetzt. Ecken-Radius pro Theme (siehe `frameRadiusMm` im
  Theme-JSON; Hochzeit = 0, also rechtwinklig).
- **Inhalt, von oben, zentriert**:
  | Element                     | Wert                                                                                                      |
  | --------------------------- | --------------------------------------------------------------------------------------------------------- |
  | Cover-Illustration          | 85 × 85 mm, Oberkante 22 mm unter dem inneren Rahmen, 1 pt Rahmen in `light`, Ecken 4 mm (0 bei Hochzeit) |
  | Titel                       | Nunito ExtraBold, 34 pt, `accent`, 11 mm unter dem Bild, einzeilig                                        |
  | Zeile 2 (Name / Untertitel) | Inter SemiBold, 16 pt, `ink`, 7 mm Abstand                                                                |
  | Trennstrich                 | 22 mm breit, 0.5 pt, `decor`, 7 mm Abstand                                                                |
  | Anlass                      | Inter Regular, 12 pt, `muted`                                                                             |
  | Datum                       | Inter Regular, 12 pt, `muted`, 2.5 mm Abstand                                                             |
  | Grusszeile                  | Inter Regular, 12 pt, `ink`, am unteren Rand des Inhaltsbereichs                                          |
  | Ecken-Deko                  | zwei Mal das `corner`-Icon, je 13 × 13 mm, links und rechts unten, Deckkraft 85 %                         |

### 2. Rätselseite (`layout/wordsearch.ts`, `sudoku.ts`, `maze.ts`)

- **Purpose**: Ein Rätsel pro Seite.
- **Kopf**: Rätseltitel Nunito ExtraBold 22 pt in `accent`; darunter 2.5 mm
  Unterzeile Inter Regular 11 pt in `muted` (`{Name} · {Anlass}`); darunter 7 mm
  Trennstrich 0.5 pt in `decor`.
- **Ecken-Deko**: `corner`-Icon 13 × 13 mm, rechts oben auf dem Rand.
- **Wortsuchrätsel**: 12 × 12 Raster über die volle Inhaltsbreite (186 mm),
  Linien 0.5 pt in `grid`, Buchstaben Inter SemiBold 6.5 mm Höhe in `ink`.
  Wortliste darunter in 3 Spalten, Inter Regular 10 pt in `ink`, Zeilenabstand 1.5 mm.
- **Kinder-Sudoku**: 6 × 6, Gesamtbreite 165 mm, zentriert. Aussenrahmen 0.8 pt in
  `ink`, Innenlinien 0.5 pt in `grid`. Symbole füllen 76 % der Zellbreite.
  Nur die sechs `sudokuIcons` verwenden. Unter dem Raster 11 mm Abstand, dann
  Hinweiszeile Inter Regular 11 pt in `muted`, zentriert.
- **Labyrinth**: quadratisches Feld 186 × 186 mm, Rahmen 0.7 pt in `ink`.
  `mazeStart`-Icon 20 × 20 mm links oben im Feld, `mazeEnd`-Icon 20 × 20 mm
  rechts unten, je mit 0.5 pt weissem Rand, damit sie sich von den Wänden lösen.
- **Fusszeile**: links `corner`-Icon 8 × 8 mm bei 50 % Deckkraft plus
  `raetselheft.ch` in Inter Regular 8 pt `muted`; rechts der Heft-Code in
  derselben Schrift.

### 3. Lösungsteil (`layout/solutions.ts`)

- **Purpose**: Alle Lösungen kompakt auf einer Seite.
- **Kopf**: «Lösungen» Nunito ExtraBold 22 pt in `accent`, darunter Trennstrich
  0.5 pt in `decor` mit 7 mm Abstand oben und unten.
- **Raster**: 2 × 2 Kacheln, 7 mm Abstand. Jede Kachel 0.3 pt Rahmen in `light`,
  4 mm Innenabstand, Kopfzeile Inter SemiBold 8 pt in `muted`
  (`Seite {n} · {Rätselname}`), darunter die quadratische Miniatur des Rätsels.
- **Lösungsmarkierung**: `solution` bei 25 % Deckkraft als abgerundeter Balken
  über den gefundenen Wörtern; beim Labyrinth als 2-mm-Linie bei 45 % Deckkraft;
  beim Sudoku als Ziffern/Symbole in `solution` (Volltonfarbe).
- **Fusszeile**: `raetselheft.ch`, Inter Regular 8 pt in `muted`, links unten.

## Design Tokens

### Paletten

| Theme       | ink       | muted     | light     | grid      | accent    | solution  | decor     |
| ----------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- |
| Piraten     | `#12304a` | `#5b7186` | `#dce7ee` | `#8fabc0` | `#0e7490` | `#c2410c` | `#a16207` |
| Weihnachten | `#1f3a2e` | `#5f7a6c` | `#e2ece3` | `#9fbaa8` | `#b91c1c` | `#166534` | `#b08400` |
| Einhörner   | `#3f2d63` | `#7c6aa3` | `#ece5f8` | `#b7a7dd` | `#db2777` | `#0891b2` | `#8b5cf6` |
| Dschungel   | `#14432a` | `#5c7a63` | `#dbe8dc` | `#94b79e` | `#15803d` | `#c2410c` | `#a16207` |
| Hochzeit    | `#38343a` | `#7a7480` | `#efe9ea` | `#bfb6c2` | `#9f1239` | `#be123c` | `#a1873f` |

`watermark` entspricht in allen Themes `grid`.

### Typografie

Unverändert zum bestehenden System: **Nunito Bold/ExtraBold** für Display,
**Inter Regular/SemiBold** für Text.

| Rolle                      | Schrift          | Grösse             |
| -------------------------- | ---------------- | ------------------ |
| Deckblatt-Titel            | Nunito ExtraBold | 34 pt              |
| Deckblatt Zeile 2          | Inter SemiBold   | 16 pt              |
| Seitentitel                | Nunito ExtraBold | 22 pt              |
| Unterzeile / Hinweis       | Inter Regular    | 11 pt              |
| Anlass, Datum, Gruss       | Inter Regular    | 12 pt              |
| Wortliste                  | Inter Regular    | 10 pt              |
| Kacheltitel im Lösungsteil | Inter SemiBold   | 8 pt               |
| Fusszeile                  | Inter Regular    | 8 pt               |
| Rasterbuchstaben           | Inter SemiBold   | 6.5 mm Zeichenhöhe |

### Masse

| Wert                  | Grösse                                                                 |
| --------------------- | ---------------------------------------------------------------------- |
| Seitenrand            | 12 mm                                                                  |
| Inhaltsbreite         | 186 mm                                                                 |
| Rahmen aussen / innen | 0.8 pt `accent` / 0.3 pt `decor`, 2.5 mm Versatz                       |
| Rahmen-Ecken          | Piraten & Weihnachten 4 mm, Einhörner 7 mm, Dschungel 3 mm, Hochzeit 0 |
| Cover-Illustration    | 85 × 85 mm                                                             |
| Ecken-Deko            | 13 × 13 mm (Fusszeile 8 × 8 mm)                                        |
| Labyrinth Start/Ziel  | 20 × 20 mm                                                             |
| Sudoku-Symbol         | 76 % der Zellbreite                                                    |

## Assets

`assets/themes/<theme>/<name>.png` – 400 × 400 px, quadratisch, deckend.
Die Bilder wurden aus den vom Auftraggeber gelieferten Themen-Kollagen
(`uploads/Gemini_Generated_Image_*.jpg`) freigeschnitten; die Kollagen selbst
liegen in `source_collages/` bei.

| Theme       | Anzahl | Rollen                                                                                                                                   |
| ----------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Piraten     | 12     | cover `captain`, corner `compass`, maze `map` → `chest`, sudoku `flag`, `chest`, `parrot`, `compass`, `wheel`, `bottle`                  |
| Weihnachten | 12     | cover `tree`, corner `snowflake`, maze `snowman` → `gift`, sudoku `tree`, `reindeer`, `snowflake`, `gift`, `bauble`, `gingerbread`       |
| Einhörner   | 12     | cover `unicorn`, corner `horns`, maze `foal` → `chest`, sudoku `unicorn`, `skywheel`, `chest`, `elixir`, `tiara`, `compass`              |
| Dschungel   | 14     | cover `temple`, corner `orchid`, maze `explorer` → `temple`, sudoku `jaguar`, `toucan`, `monkey`, `snake`, `frog`, `mask`                |
| Hochzeit    | 12     | cover `eleganz`, corner `deko`, maze `verlobung` → `ringwechsel`, sudoku `eleganz`, `torte`, `ringwechsel`, `brautpaar`, `deko`, `start` |

### Wichtig für die Render-Pipeline

- Die PNGs haben **weissen bzw. hellen Bildhintergrund, keine Transparenz**. Wo ein
  Motiv freistehend wirken soll (Sudoku-Zellen, Labyrinth-Marken), braucht es
  entweder freigestellte Varianten oder – wie in den Mockups – eine sichtbare
  Rahmung/Eckenrundung.
- Vollfarbige Bilder sind **nicht über die Palette umfärbbar**. Die Palette gilt
  ab jetzt für Rahmen, Raster, Typografie und Lösungsmarkierungen.
- Der Tintenverbrauch steigt deutlich. Für einen «sparsam drucken»-Modus wäre ein
  Rückfallpfad auf die bisherigen Pfad-Icons sinnvoll; dieser ist noch nicht
  entworfen.
- Bei 400 × 400 px und 85 mm Platzierung ergeben sich ~120 dpi. Für den Druck
  sollten die Cover-Illustrationen in höherer Auflösung nachgeliefert werden
  (Zielgrösse ≥ 1000 px für 85 mm ≈ 300 dpi). Für Sudoku- und Ecken-Grössen ist die
  aktuelle Auflösung ausreichend.

## Theme-Daten

`themes/<id>.json` – im bestehenden Schema, erweitert um `decor`, `artStyle`,
`assetDir`, `frameRadiusMm` und `availableIcons`. Direkt nach
`packages/render/src/themes/data/` kopierbar; `assetDir` zeigt auf den Ort, an
den die PNGs gelegt werden.

Der `Palette`-Typ in `themes/types.ts` muss um `decor: string` erweitert werden,
der `Theme`-Typ um `artStyle`, `assetDir`, `frameRadiusMm` und `availableIcons`.
Die Wortlisten der Themes bleiben unverändert.

## Vorgeschlagene Reihenfolge

1. `Palette`/`Theme`-Typen erweitern, die fünf JSONs einspielen, Assets ablegen.
2. Bild-Primitive ergänzen (Platzieren eines PNG mit Zielbreite, Ecken-Radius,
   optionalem Rahmen und Deckkraft) – heute kennt `primitives.ts` nur Pfade,
   Linien, Flächen und Text.
3. `cover.ts` auf Doppelrahmen + grosse Illustration umbauen.
4. Ecken-Deko und Fusszeile in `page.ts` zentral setzen, damit alle Rätselseiten
   sie erben.
5. Sudoku-Renderer von Pfad-Symbolen auf Bilder umstellen, Labyrinth-Start/Ziel
   ebenso.
6. Lösungsteil auf das 2 × 2-Kachelraster umstellen.

## Files

| Datei                                    | Inhalt                                                |
| ---------------------------------------- | ----------------------------------------------------- |
| `design_files/Theme Piraten.dc.html`     | Palette, Icon-Übersicht, 3 A4-Seiten (Wortsuchrätsel) |
| `design_files/Theme Weihnachten.dc.html` | dito                                                  |
| `design_files/Theme Einhoerner.dc.html`  | Palette, Icons, Sudoku-Seite mit Bildsymbolen         |
| `design_files/Theme Dschungel.dc.html`   | Palette, Icons, Labyrinth-Seite                       |
| `design_files/Theme Hochzeit.dc.html`    | Palette, Icons, Wortsuchrätsel, rahmenlose Variante   |
| `themes/*.json`                          | Theme-Daten im Repo-Schema                            |
| `assets/themes/*`                        | die Illustrationen                                    |
| `source_collages/*`                      | die Original-Kollagen                                 |

Zum Öffnen der `.dc.html`-Dateien muss `support.js` im selben Ordner liegen; es ist beigelegt.
