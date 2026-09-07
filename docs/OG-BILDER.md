# Vorschaubilder beim Teilen (OG-Bilder)

Beim Teilen eines Links zeigen Messenger und soziale Netze ein Vorschaubild.
Diese Bilder liegen als PNG in `apps/web/public/og/` und werden mitgeliefert:
je eines pro Themen-Design plus ein Standardbild. Die Landing-Pages wählen
automatisch das Bild ihres Themas.

## Warum vorgefertigt statt beim Bauen erzeugt

Die Bilder enthalten Text in den eigenen Schriften. Ein Umwandeln von SVG nach
PNG beim Bauen bräuchte entweder einen Browser oder systemweit installierte
Schriften. Beides würde den Bauprozess bei Cloudflare unnötig fragil machen.
Deshalb entstehen die PNG einmalig lokal und liegen im Repository.

## Neu erzeugen

```bash
# 1. Quelldateien (HTML mit eingebetteten Schriften und echten Rätseln)
pnpm --filter @raetselheft/web og /tmp/og-quellen

# 2. In PNG umwandeln, 1200 × 630, mit einem Browser
#    (Beispiel mit Playwright; jedes Werkzeug tut es, das HTML abfotografieren kann)
```

Das Ergebnis nach `apps/web/public/og/` legen. Die Dateinamen entsprechen den
Theme-Ids (`piraten.png`, `einhorn.png`, `dschungel.png`, `hochzeit.png`,
`weihnachten.png`) plus `default.png`.

## Was noch fehlt

Der Plan sieht ein eigenes Bild pro Landing-Page vor. Aktuell teilen sich alle
Seiten eines Themas ein Bild. Für den Start genügt das; ein Bild je Seite wäre
ein sinnvoller späterer Ausbau, sobald der Bauprozess Schriften rastern kann.
