# Umsetzung des Themen-Handoffs

Bezug: `docs/design/themes-handoff.md` (Design-Übergabe), Mockups in
`docs/design/mockups/`, Theme-Daten der Übergabe in `docs/design/themes-json/`,
Illustrationen in `packages/render/assets/themes/`.

Die Übergabe wird in zwei Stufen umgesetzt. Stufe 1 ist erledigt, Stufe 2
wartet auf Material, das noch nicht geliefert ist.

## Stufe 1 — erledigt

Alles, was ohne Rasterbilder machbar war:

- **Paletten** aller fünf Themes auf die neuen Werte gesetzt
  (`packages/render/src/themes/data/*.json`). Alle halten die Kontrast-Schwellen
  aus `print.test.ts` ein, auch im Graustufendruck.
- **`frameRadiusMm`** neu im Theme-Schema (`themes/types.ts`), in allen fünf
  JSONs, im `NEUTRAL_THEME` und in `validateTheme`. `layout/cover.ts` zeichnet
  den Doppelrahmen damit themenspezifisch: Hochzeit rechtwinklig (0 mm),
  Dschungel 3 mm, Piraten und Weihnachten 4 mm, Einhörner 7 mm.
- **Masse aus der Übergabe** im Deckblatt: Trennstrich 22 mm statt 36 mm,
  Ecken-Deko 13 mm bei 85 Prozent Deckkraft.
- **Ecken-Deko und Fusszeile** zentral in `page.ts`: 13 mm oben rechts,
  8 mm links in der Fusszeile bei 50 Prozent. Der Fusszeilentext rückt bei
  einem Themen-Design um die Icon-Breite nach rechts.

Weil alle sechs Rätseltypen über `puzzlePage()` und damit `createPage()`
laufen, erben auch Kreuzworträtsel, Punkte-zu-Punkte und Nonogramm diese
Gestaltung, obwohl die Übergabe sie nicht erwähnt.

Bereits vor der Übergabe vorhanden und deshalb unverändert: die Farbrolle
`decor` und der doppelte Zierrahmen auf dem Deckblatt (aussen 0.8 mm in
`accent`, innen 0.3 mm in `decor`, 2.5 mm versetzt).

## Stufe 2 — offen, blockiert

Der Wechsel von Vektor-Icons auf vollfarbige Rasterbilder. Dafür fehlt dreierlei:

### 1. Ein Bild-Primitiv (Arbeit, aber machbar)

`Element` in `primitives.ts` kennt heute nur `rect`, `line`, `polyline`,
`circle`, `path` und `text`. Nötig wären ein `ImageElement` und je ein Zweig im
Switch von `pdf.ts` (`drawElement`) und `svg.ts` (`elementToSvg`), dazu ein
Embed-Cache für `embedPng()` analog zum Font-Handling. Heikel sind die
abgerundeten Bildecken: pdf-lib hat dafür keine fertige Schnittstelle, es
braucht einen manuellen Clipping-Pfad oder vorab gerundete PNGs.

### 2. Freigestellte Bilder (fehlt)

Die Übergabe beschreibt die PNGs als «weisser bzw. heller Bildhintergrund».
Geprüft wurden alle 62 Dateien: sie sind durchgehend deckend (Alpha überall 255) und der Hintergrund läuft randlos durchgefärbt bis an die Kante,
teilweise dunkel. In einer Sudoku-Zelle ergäbe das farbige Kacheln statt
freistehender Motive, im Labyrinth verdeckt die Marke die Wände. Die Übergabe
nennt freigestellte Varianten selbst als Voraussetzung, liefert sie aber nicht.

### 3. Druckfähige Deckblatt-Motive (fehlt)

400 mal 400 px auf 85 mm sind rund 120 dpi. Für ein Produkt zum Ausdrucken ist
das auf der grössten Fläche der Seite zu wenig. Die Übergabe verlangt
mindestens 1000 px, geliefert sind 400.

## Punkte, die mit der Design-Seite zu klären sind

- **Strichstärken sind widersprüchlich.** Die Übergabe schreibt im Fliesstext
  «äusserer Rahmen 0.8 mm», in der Masstabelle «0.8 pt» — das ist fast ein
  Faktor drei. Die Mockups zeigen `border:1.6px` bei 2 px pro Millimeter, also
  0.8 mm. Der Code folgt dieser Lesart. Bitte bestätigen.
- **Der Lösungsteil passt nicht zum Code.** Die Übergabe nimmt ein starres
  2-mal-2-Raster in einem `layout/solutions.ts` an. Tatsächlich packt
  `pages.ts` die Kacheln dynamisch (1 bis 2 pro Reihe je nach `needsFullRow()`),
  und das Kreuzworträtsel bekommt absichtlich eine ganze Lösungsseite, damit
  die Gitter deckungsgleich liegen. Ein hartes 2-mal-2 wäre ein Rückschritt.
- **Tintenverbrauch.** `primitives.ts` hält als Grundsatz fest:
  «tintenfreundlich: kein flächiger Hintergrund». 62 vollflächige Farbbilder
  kehren das um. Die Übergabe hält einen Sparmodus für sinnvoll, entwirft ihn
  aber nicht. Das ist ein Produktentscheid, kein Layoutdetail.
- **Drei Rätseltypen ohne Vorgabe.** Kreuzworträtsel, Punkte-zu-Punkte und
  Nonogramm kommen in der Übergabe nicht vor. Stufe 1 hat sie sinngemäss
  mitgenommen; für eigene Motive bräuchte es Vorgaben.
