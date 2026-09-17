# Rechtliche Grundlagen

Grundlage ist die Abklärung für einen Online-Rätselshop als Privatperson in
der Schweiz (Einzelunternehmen ohne Handelsregistereintrag). Diese Datei hält
fest, was davon im Code umgesetzt ist und was ausserhalb des Repositorys
erledigt werden muss. Sie ersetzt keine Rechtsberatung.

Stand: 17. September 2026.

## Im Repository umgesetzt

| Pflicht                                        | Wo                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| Impressum (UWG Art. 3 Abs. 1 lit. s)           | `apps/web/src/pages/impressum.astro`, Angaben in `content/site.ts` |
| Bestellablauf und Vertragsschluss beschrieben  | AGB Ziff. 3                                                        |
| Eingabefehler bis zuletzt korrigierbar         | Konfigurator und Heft-Builder, Hinweis in AGB Ziff. 3              |
| Bestellbestätigung per E-Mail                  | Pflichtfeld beim Kauf, Versand durch Payrexx (siehe unten)         |
| Endpreise in CHF, keine Zusatzkosten           | AGB Ziff. 4, Preise in `content/site.ts` und im Worker             |
| AGB mit Nutzungsrecht, Rückerstattung, Haftung | `apps/web/src/pages/agb.astro`                                     |
| Datenschutzerklärung nach DSG                  | `apps/web/src/pages/datenschutz.astro`                             |
| Angaben zu Kindern: Datensparsamkeit, Löschung | Datenschutzerklärung, Abschnitt «Personalisierte Rätsel»           |
| Hinweis auf KI-erzeugte Illustrationen         | Impressum, Abschnitt «Bildnachweis, Schriften und KI»              |

## Ausrichtung auf die Schweiz

Das Angebot richtet sich bewusst nur an Kundschaft in der Schweiz: Preise in
CHF, Schweizer Recht, Gerichtsstand am Wohnsitz des Anbieters, kein
Widerrufsrecht. Die Rechtstexte nennen deshalb ausschliesslich das Schweizer
DSG und keine DSGVO-Artikel mehr.

Wer das ändern will (Preise in EUR, gezielte Ansprache von EU-Kundschaft),
muss vorher das EU-Verbraucherrecht nachziehen: 14 Tage Widerrufsrecht mit
Erlöschens-Klausel für digitale Inhalte, DSGVO-Angaben in der
Datenschutzerklärung, allenfalls ein Vertreter in der EU.

## Bestellbestätigung

Die Website verlangt vor dem Kauf eine E-Mail-Adresse
(`components/PurchaseEmail.tsx`). Sie geht über `/api/checkout` an den Worker
und von dort als Pflichtfeld `fields.email` an die Payrexx-Bezahlseite;
Payrexx verschickt die Bestätigung. Die Adresse wird bewusst **nicht** in KV
abgelegt, damit im eigenen Speicher keine Personendaten liegen.

Prüfen bei der Aufschaltung: in der Payrexx-Instanz muss der Belegversand an
die Kundschaft aktiviert sein, sonst kommt trotz Pflichtfeld keine
Bestätigung an. Wer eine eigene Bestätigung mit Bestellübersicht und
Download-Link verschicken will, braucht einen Mailversand im Worker; das ist
heute nicht umgesetzt.

## Regeln für neue Inhalte

- **Keine geschützten Figuren und Marken** in Wortlisten, Hinweistexten,
  Themen-Namen, Motiven oder Beispielen: also kein Disney, Paw Patrol,
  Pokémon, Lego, Marvel und dergleichen. Das ist gerade bei
  Kindergeburtstags-Themen verlockend und verletzt Urheber- und Markenrecht.
  Betroffen sind vor allem `packages/render/src/themes/data/topics/*.json`,
  `*.crossword.json` und `packages/engine/src/dotToDot/shapes.ts`.
- **Rätselformen sind frei** (Sudoku, Kreuzworträtsel, Nonogramm), fremde
  konkrete Rätsel dürfen nicht übernommen werden. Alle Rätsel entstehen
  deterministisch aus der Engine.
- **Schriften und Bilder** nur mit Lizenz für kommerzielle Nutzung; neue
  Schriften im Impressum nachtragen.
- **Keine Werbung mit «von Hand erstellt»** oder ähnlichen Aussagen, solange
  die Illustrationen mit KI erzeugt sind (UWG).
- **Neue Datenempfänger** (Analyse-Werkzeuge, KI-Dienste, anderer
  Zahlungsanbieter, Mailversand) gehören in die Datenschutzerklärung, bevor
  sie aufgeschaltet werden.

## Ausserhalb des Repositorys

Das erledigt der Betreiber selbst, es gibt dazu keinen Code:

- Einnahmen-/Ausgabenliste führen, Belege zehn Jahre aufbewahren.
- Gewinn als selbständigen Nebenerwerb in der Steuererklärung angeben.
- Ab einem Reingewinn von CHF 2'500 pro Jahr bei der kantonalen
  Ausgleichskasse melden (Luzern: WAS).
- MWST-Pflicht erst ab CHF 100'000 Umsatz, Handelsregistereintrag ebenso.
- Name und Domain auf Markenkonflikte prüfen: «Rätsel Generator» ist laut
  Abklärung vom 17. September 2026 frei; vor einer Umbenennung erneut auf
  Swissreg prüfen.
