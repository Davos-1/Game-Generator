# Testlauf vor dem Launch

Zwei Dinge kann nur ein Mensch prüfen: wie die Rätsel auf echtem Papier
aussehen und ob fremde Leute die Website ohne Erklärung bedienen können.
Diese Liste ist für genau diese zwei Punkte gedacht.

## Teil 1: Drucktest (30 Minuten, allein)

Technisch geprüft und automatisch abgesichert sind bereits: A4-Format, 12 mm
Rand auf allen Seiten, keine Linie dünner als 0.25 mm, keine Schrift kleiner
als 6 pt, keine grossflächigen Füllungen, ausreichender Kontrast aller Farben
auf Weiss und Unterscheidbarkeit von Vorgaben und Lösung im Graustufendruck.
Was ein echter Drucker daraus macht, zeigt nur der Ausdruck.

Drucke diese fünf Blätter, am besten auf zwei verschiedenen Druckern:

1. Wortsuchrätsel 20 × 20, Schwierigkeit «schwer», Thema Piraten
2. Labyrinth «schwer» (24 × 32), Thema Einhörner
3. Sudoku für Kinder 6 × 6, Thema Weihnachten (prüft die Symbole)
4. Sudoku 9 × 9 «schwer» (prüft kleine Ziffern)
5. Eine Lösungsseite mit vier Kacheln

Achte auf:

- [ ] Wird etwas abgeschnitten? (Randlos-Einstellung des Druckers aus)
- [ ] Sind die Gitterlinien sichtbar, aber nicht dominant?
- [ ] Kann ein Kind mit dickem Bleistift in eine Sudoku-Zelle schreiben?
- [ ] Sind die Symbole im Kinder-Sudoku klar unterscheidbar?
- [ ] Ist der eingezeichnete Lösungsweg im Labyrinth gut erkennbar?
- [ ] Einmal in Graustufen drucken: bleibt alles lesbar?
- [ ] Wie viel Tinte braucht ein Blatt gefühlt?

Notiere alles, was stört. Änderungen an Linienstärken, Abständen und
Schriftgrössen sind schnell gemacht.

## Teil 2: Nutzertest (je 20 Minuten, drei bis fünf Personen)

Suche Leute aus der Zielgruppe: Eltern mit Kindern zwischen 5 und 12, dazu
gern jemanden, der eine Hochzeit oder Firmenfeier plant. Am besten am eigenen
Handy, nicht am Computer.

**Wichtig: nicht helfen und nicht erklären.** Sag nur die Aufgabe und schau zu.

Aufgaben:

1. «Erstelle ein Wortsuchrätsel mit den Namen deiner Kinder und drucke es aus.»
2. «Mach ein Labyrinth, das für ein fünfjähriges Kind passt.»
3. «Stell ein Rätselheft für einen Kindergeburtstag zusammen, mit Namen auf
   dem Deckblatt.»
4. «Wie viel würde dieses Heft kosten?»

Beobachte:

- [ ] Wo zögert die Person? Wo klickt sie falsch?
- [ ] Findet sie den Unterschied zwischen Einzelrätsel und Heft?
- [ ] Ist klar, dass Konfigurieren und Vorschau gratis sind, aber sowohl Einzelrätsel (CHF 2) als auch Heft (CHF 5) kostenpflichtig sind?
- [ ] Versteht sie das Wasserzeichen in der Vorschau (bei Einzelrätsel und Heft)?
- [ ] Bemerkt sie «Neu würfeln»?
- [ ] Kommt sie beim Heft-Builder mit der Reihenfolge zurecht?

Frage am Schluss:

- [ ] «Würdest du dafür CHF 5 bezahlen? Warum, warum nicht?»
- [ ] «Was hat gefehlt?»

## Teil 3: Verschiedene Geräte

Gemessen wurde bereits auf einem gedrosselten Mobilfunknetz (1.6 Mbit/s,
150 ms Latenz, vierfach verlangsamte Rechenleistung):

| Seite        | Erster Inhalt | Vollständig | Übertragen |
| ------------ | ------------- | ----------- | ---------- |
| Landing-Page | 0.6 s         | 0.8 s       | 71 KB      |
| Generator    | 0.5 s         | 2.7 s       | 289 KB     |
| Heft-Builder | 0.5 s         | 3.0 s       | 306 KB     |

Ein Heft mit 16 Rätseln (23 Seiten) wird in rund 0.6 Sekunden zu einem PDF von
225 KB, der Speicherbedarf bleibt bei etwa 10 MB. Das Risiko «alte Handys» aus
dem Plan ist damit kleiner als befürchtet, aber ungetestet auf echter alter
Hardware.

Prüfe deshalb, falls greifbar:

- [ ] Ein älteres Android-Handy (fünf Jahre oder mehr)
- [ ] Ein iPhone (Safari verhält sich beim Herunterladen anders)
- [ ] Ein Tablet quer
