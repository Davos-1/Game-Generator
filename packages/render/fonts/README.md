# Schriften

Dieses Verzeichnis enthält statische TrueType-Schnitte, die für die SVG-Vorschau
(Browser) und den PDF-Export (pdf-lib) verwendet werden. Es gilt: eine
Schrift-Datei pro Schnitt, keine Variable Fonts im Repo (siehe unten, Grund:
kleinere, deterministische Artefakte; pdf-lib embedded ohnehin nur statische
Glyf-Daten).

## Enthaltene Dateien

| Datei                | Familie | Schnitt                      | Quelle (Variable Font) |
| -------------------- | ------- | ---------------------------- | ---------------------- |
| `Nunito-Bold.ttf`    | Nunito  | wght 700 (Bold)              | `Nunito[wght].ttf`     |
| `Inter-Regular.ttf`  | Inter   | opsz 14, wght 400 (Regular)  | `Inter[opsz,wght].ttf` |
| `Inter-SemiBold.ttf` | Inter   | opsz 14, wght 600 (SemiBold) | `Inter[opsz,wght].ttf` |

Dazu die Lizenztexte `OFL-Nunito.txt` und `OFL-Inter.txt`.

## Herkunft

Beide Schriften stammen aus dem offiziellen Google-Fonts-Repository
(`google/fonts`, Verzeichnis `ofl/`), Stand 2026-09-06:

- Nunito (Variable Font): https://raw.githubusercontent.com/google/fonts/main/ofl/nunito/Nunito%5Bwght%5D.ttf
- Inter (Variable Font): https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf
- Lizenz Nunito: https://raw.githubusercontent.com/google/fonts/main/ofl/nunito/OFL.txt
- Lizenz Inter: https://raw.githubusercontent.com/google/fonts/main/ofl/inter/OFL.txt

## Lizenz

Beide Schriften stehen unter der SIL Open Font License, Version 1.1 (siehe
`OFL-Nunito.txt` / `OFL-Inter.txt`). Die OFL erlaubt ausdrücklich das
Einbetten der Schriften in Dokumente (hier: die generierten PDF-Rätselhefte)
sowie das Ausliefern an Browser (hier: für die SVG-Vorschau via `@font-face`
o.Ä.). Eine Weiterverbreitung der unveränderten Schrift-Dateien selbst
(z.B. dieses Verzeichnis) ist ebenfalls durch die OFL gedeckt; der einzige
Vorbehalt ist, dass die Schrift nicht unter eigenem Namen separat verkauft
werden darf – das betrifft uns hier nicht.

## Reproduktion: von Variable Font zu statischem Schnitt

Die Variable Fonts wurden **nicht** ins Repo übernommen (nur die daraus
erzeugten statischen Instanzen). Wer die Schnitte neu erzeugen will:

```bash
# 1. Variable Fonts + Lizenztexte herunterladen (in ein Scratch-Verzeichnis,
#    NICHT ins Repo)
curl -sSL -o "Nunito[wght].ttf" \
  "https://raw.githubusercontent.com/google/fonts/main/ofl/nunito/Nunito%5Bwght%5D.ttf"
curl -sSL -o "Inter[opsz,wght].ttf" \
  "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf"
curl -sSL -o "OFL-Nunito.txt" \
  "https://raw.githubusercontent.com/google/fonts/main/ofl/nunito/OFL.txt"
curl -sSL -o "OFL-Inter.txt" \
  "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/OFL.txt"

# 2. fonttools installieren (Python 3.11 / pip)
pip install --user fonttools brotli

# 3. Statische Instanzen erzeugen (--update-name-table sorgt dafür, dass
#    Familien-/Schnittname im name-Table korrekt gesetzt werden, statt des
#    Namens der nächstgelegenen "named instance" der Variable-Font-Quelle)
python3 -m fontTools.varLib.instancer "Nunito[wght].ttf" wght=700 \
  --update-name-table -o Nunito-Bold.ttf
python3 -m fontTools.varLib.instancer "Inter[opsz,wght].ttf" opsz=14 wght=400 \
  --update-name-table -o Inter-Regular.ttf
python3 -m fontTools.varLib.instancer "Inter[opsz,wght].ttf" opsz=14 wght=600 \
  --update-name-table -o Inter-SemiBold.ttf

# 4. Die drei .ttf-Dateien sowie die beiden OFL-Texte (umbenannt wie oben)
#    nach packages/render/fonts/ kopieren.
```

## Verifikation

Geprüft mit `fontkit` 2.0.4 (Node, ESM: `import * as fontkit from 'fontkit'`,
da das Paket keinen Default-Export bereitstellt):

| Datei                | familyName     | subfamilyName | unitsPerEm | variationAxes   | ä/ö/ü/Ä/«/»/€  |
| -------------------- | -------------- | ------------- | ---------- | --------------- | -------------- |
| `Nunito-Bold.ttf`    | Nunito         | Bold          | 1000       | `{}` (statisch) | alle vorhanden |
| `Inter-Regular.ttf`  | Inter          | Regular       | 2048       | `{}` (statisch) | alle vorhanden |
| `Inter-SemiBold.ttf` | Inter SemiBold | Regular       | 2048       | `{}` (statisch) | alle vorhanden |

`variationAxes: {}` bestätigt, dass es sich um statische (Non-Variable)
Schnitte handelt – wichtig, da pdf-lib/`@pdf-lib/fontkit` keine Variable
Fonts korrekt einbettet.

## Dateigrössen

- `Nunito-Bold.ttf`: 132'268 Bytes
- `Inter-Regular.ttf`: 341'396 Bytes
- `Inter-SemiBold.ttf`: 342'688 Bytes

## Reduzierter Zeichenvorrat

Die Dateien in diesem Ordner sind zusätzlich auf den benötigten Zeichenvorrat
reduziert (Basis-Latein, Latin-1 mit Umlauten, Latin Extended-A für europäische
Namen sowie einige Satzzeichen). Damit sind sie zusammen rund 76 KB statt
816 KB gross und werden vollständig ins PDF eingebettet.

```bash
RANGE="U+0020-007E,U+00A0-00FF,U+0100-017F,U+2013,U+2014,U+2018,U+2019,U+201A,U+201C,U+201D,U+201E,U+2022,U+2026,U+20AC"
python3 -m fontTools.subset "Nunito-Bold.ttf" --unicodes="$RANGE" \
  --layout-features='' --drop-tables+=DSIG --name-IDs='*' --output-file="Nunito-Bold.ttf"
```

(analog für Inter-Regular.ttf und Inter-SemiBold.ttf)

Die Layout-Tabellen (GSUB/GPOS) werden entfernt, weil Kerning und Ligaturen in
Vorschau und PDF ohnehin abgeschaltet sind: nur so ergeben SVG und PDF exakt
dieselben Textbreiten.
