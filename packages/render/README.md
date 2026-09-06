# @raetselheft/render

Layout-Schicht zwischen Rätsel-Engine und Ausgabe. Ein Rätsel wird zuerst in
abstrakte Layout-Primitive übersetzt (Rechteck, Linie, Linienzug, Kreis, Pfad,
Text; alle Koordinaten in Millimetern). Diese Primitive werden anschliessend
von zwei Renderern gezeichnet:

- `pageToSvg()` für die Live-Vorschau im Browser
- `renderPdf()` für den Download (pdf-lib, A4, eingebettete Schriften)

Damit gibt es eine einzige Quelle der Wahrheit für Vorschau und Druck
(PLAN.md, Abschnitt 6.1). Die Übereinstimmung wird laufend geprüft: die
Beispielseiten werden als SVG und als PDF gerendert und pixelweise verglichen.

## Schriften

`fonts/` enthält Nunito Bold (Titel) und Inter Regular/SemiBold (Text) als
statische, auf Latein reduzierte Instanzen unter der SIL Open Font License.
Herkunft und die genauen Befehle stehen in `fonts/README.md`.

Wichtig: Die Schriften werden **vollständig** ins PDF eingebettet. Die
Untermengen-Funktion von pdf-lib erzeugt bei diesen Schriften fehlende Glyphen
(einzelne Buchstaben verschwinden im Druck). Stattdessen sind die Dateien
bereits beim Vorbereiten auf den benötigten Zeichenvorrat reduziert; zusammen
sind sie rund 76 KB gross. Ein Test prüft, dass jedes gezeichnete Zeichen im
eingebetteten Schriftprogramm eine Glyphe hat.

## Masse und Einheiten

- Koordinaten und Längen in Millimetern, Ursprung oben links, y nach unten
- Schriftgrössen in Punkt (pt), wie im Druck üblich
- Im SVG wird die Schriftgrösse in Millimeter umgerechnet, weil die viewBox in
  Millimetern rechnet. Eine Angabe in «pt» würde der Browser als CSS-Punkt
  deuten und den Text um den Faktor 3.78 zu gross zeichnen.
- Kerning und Ligaturen sind in beiden Ausgaben abgeschaltet, damit die
  Textbreiten identisch sind

## Beispiele erzeugen

```bash
pnpm --filter @raetselheft/render samples [Zielordner]
```

Schreibt Beispiel-PDFs und -SVGs (Einzelrätsel, Rätselheft, Vorschau mit
Wasserzeichen) nach `packages/render/samples` (nicht im Repository).
