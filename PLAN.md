# Projektplan: Rätsel- & Spielgenerator für Ausdrucke (Arbeitstitel)

Spezifikation für die Umsetzung mit Claude Code. Sprache der Website: Deutsch (Schweizer Standarddeutsch, kein ß). Zielmarkt: DACH, Fokus Kindergeburtstage/Eltern und Events (Hochzeit, Firmenfeier).

---

## 1. Produktvision

Browser-basierter Generator für personalisierte, ausdruckbare Rätsel (PDF). Nutzer konfigurieren Rätsel live mit Vorschau, laden Einzelrätsel gratis herunter und kaufen personalisierte Rätselhefte (Themen-Design, Namen der Gäste, mehrseitig mit Deckblatt und Lösungen) als Premium-PDF.

**Geschäftsmodell:**
- Einzelrätsel (Standarddesign): gratis, ohne Wasserzeichen → Traffic, Vertrauen, SEO
- Premium: Rätselheft + Themen-Designs + Namens-Personalisierung → Vorschau mit Wasserzeichen, Kauf schaltet sauberes PDF frei
- Preisrahmen Heft: CHF 4–7 (im Verlauf testen), Zahlung ohne Account via Payrexx (inkl. TWINT)

**Betriebsziel:** möglichst passiv. Statisches Frontend, ein minimaler Cloudflare Worker für Zahlung/Freischaltung. Kein Login, keine Datenbank mit Nutzerkonten.

---

## 2. Phasierung

### Phase 1 — MVP
- Rätseltypen: **Wortsuchrätsel, Labyrinth, Sudoku**
- Heft-Builder (Rätsel kombinieren, Deckblatt, Lösungsseiten)
- 3–4 Themen-Designs: z. B. Piraten, Einhörner, Dschungel, Hochzeit (elegant)
- Payrexx-Zahlung + PDF-Freischaltung
- Programmatic-SEO-Landing-Pages ab Launch

### Phase 2
- Schnitzeljagd/Escape-Aufgaben (Vorlagen-basiert: Stationskarten, Hinweiszettel, Zahlenschloss-Rätsel, personalisierbar mit Namen/Orten)
- Weitere Themes, Geschenk-/Einladungs-Zusatzseiten

### Phase 3
- Kreuzworträtsel (algorithmisch am aufwendigsten: Gitterfüllung mit eigenen Wörtern; Backtracking mit Wortlisten-Fallback)
- Evtl. Englisch-Version (i18n von Anfang an vorbereiten, siehe 6.5)

---

## 3. Rätsel-Logik (Kern-Algorithmen, alle client-seitig)

### 3.1 Wortsuchrätsel
- Input: eigene Wortliste ODER Themen-Wortlisten (pro Theme mitliefern, z. B. 30 Piratenwörter), optional Namen der Gäste als Wörter
- Parameter: Gittergrösse (8×8 bis 20×20), Richtungen (horizontal/vertikal/diagonal/rückwärts je nach Schwierigkeit), Umlaute-Handling (Ä→AE optional), Grossbuchstaben
- Algorithmus: Wörter nach Länge absteigend platzieren, Random-Positionen mit Backtracking, Rest mit Füllbuchstaben (Buchstabenhäufigkeit Deutsch)
- Validierung: keine ungewollten Wörter aus Blacklist im Gitter (kleine Schimpfwort-Blacklist prüfen)
- Output: Rätselseite + Lösungsseite (markierte Wörter)

### 3.2 Labyrinth
- Algorithmus: Recursive Backtracker oder Kruskal (perfektes Labyrinth, genau eine Lösung)
- Parameter: Grösse (Schwierigkeit), Form (Rechteck; später: Kreis, Theme-Silhouette wie Schatztruhe)
- Personalisierung: Start-/Ziel-Icons aus Theme (Schiff → Schatz), optional Name im Titel
- Output: Rätselseite + Lösungsseite (eingezeichneter Pfad)

### 3.3 Sudoku
- Generierung: vollständiges Gitter via Backtracking, dann Zellen entfernen mit Eindeutigkeits-Check (Solver zählt Lösungen, muss exakt 1 bleiben)
- Schwierigkeit: über Anzahl Vorgaben + benötigte Lösungstechniken (einfach: 36–40 Vorgaben; schwer: 24–28)
- Kindervariante: 4×4 und 6×6 mit Theme-Symbolen statt Zahlen (wichtig für Zielgruppe!)
- Output: Rätselseite + Lösungsseite

### 3.4 Heft-Builder
- Nutzer stellt Heft zusammen: Deckblatt (Theme, Titel, Name/Anlass, Datum), 4–16 Rätselseiten gemischt, Lösungsteil hinten
- Seiten einzeln konfigurierbar, Reihenfolge per Drag-and-drop
- Konfiguration als JSON im LocalStorage (Wiederkommen ohne Account) + als URL-Parameter teilbar

---

## 4. PDF-Generierung

- Client-seitig: **pdf-lib** oder **jsPDF** + eingebettete Fonts (Lizenz beachten: z. B. Google Fonts OFL)
- Format A4 Hochformat, druckfreundlich: ausreichend Rand (min. 12 mm), Linienstärken ≥ 0.75 pt, kein flächiger Hintergrund (Tintenverbrauch), Theme-Deko als Rahmen/Ecken
- Wasserzeichen (Premium-Vorschau): halbtransparent diagonal über Rätselflächen, technisch nicht trivial entfernbar (im PDF eingebettet, nicht als separate Ebene obendrauf)
- Lösungsseiten kompakt (2–4 Lösungen pro Seite)
- Dateiname sprechend: `piraten-raetselheft-luca.pdf`

---

## 5. Design

### 5.1 Richtung
Clean/modern mit verspielten Akzenten: viel Weissraum, klare Typografie, pro Theme eine Akzentfarbwelt + Illustrationen. Website selbst neutral-modern; die Verspieltheit lebt in den Theme-Vorschauen und PDFs.

### 5.2 Themen-Designs
- Basis: kommerziell nutzbare SVG-Illustrationspakete (Quellen prüfen und Lizenz dokumentieren: z. B. unDraw-Stil reicht nicht — kindgerechte Illustrationen von Creative-Market/Freepik-Premium o. ä. mit erweiterter Lizenz, oder KI-generiert mit Nachbearbeitung)
- Pro Theme definieren: Farbpalette (3–4 Farben), 6–10 Illustrationen (Deckblatt-Held, Ecken-Deko, Icons für Sudoku-Kindervariante, Start/Ziel fürs Labyrinth), 1 Display-Font + 1 Lese-Font, Wortliste (≥30 Wörter)
- Theme als JSON-Definition (Farben, Asset-Pfade, Fonts, Wortliste) → neue Themes ohne Code-Änderung

### 5.3 Namens-/Domain-Vorschläge (Verfügbarkeit vor Registrierung prüfen)
- raetselheft.ch — beschreibend, SEO-stark, DACH-tauglich (.ch zuerst, .de/.com sichern falls frei)
- knobelkiste.ch — verspielt, merkbar
- raetselzeit.ch — neutral, event-tauglich
- printpuzzle.ch — hybrid, spätere EN-Erweiterung einfacher
- Empfehlung: beschreibende Domain (raetselheft) für SEO; Markenname kann im Logo verspielter sein

---

## 6. Technik-Architektur

### 6.1 Stack
- **Frontend:** Astro (statisch, ideal für SEO-Seiten) + React-Islands für die Generator-UI; TailwindCSS
- **Rätsel-Engine:** eigenständige TypeScript-Module (`/packages/engine`), UI-unabhängig, unit-getestet → später wiederverwendbar (API, EN-Version)
- **Rendering:** Vorschau als SVG im Browser (identische Layout-Logik wie PDF, eine Quelle der Wahrheit), PDF-Export aus denselben Layout-Daten
- **Hosting:** Cloudflare Pages (Frontend) + 1 Cloudflare Worker (Zahlung)
- **Kein** Nutzer-Login, **keine** Datenbank ausser Worker-KV für Zahlungs-Tokens

### 6.2 Zahlungs-Flow (Payrexx + Worker)
1. Nutzer klickt «Heft kaufen» → Frontend sendet Heft-Konfigurations-Hash an Worker
2. Worker erstellt Payrexx-Gateway (API), speichert `{paymentId: configHash}` in KV, gibt Payment-URL zurück
3. Nutzer zahlt (TWINT/Karte), Payrexx-Webhook → Worker markiert Zahlung als bezahlt (KV, TTL z. B. 30 Tage)
4. Frontend pollt/erhält Token → generiert PDF **ohne** Wasserzeichen client-seitig
5. Wichtig: Signiertes Token (HMAC) statt reinem Flag, damit Freischaltung nicht per DevTools fälschbar ist; die wasserzeichenfreie Generierung erst nach Token-Validierung durch den Worker
- Rechnungs-/MwSt-Thema: Kleinunternehmer-Status Schweiz prüfen (unter CHF 100k Umsatz keine MwSt-Pflicht); Payrexx-Belege reichen initial

### 6.3 Programmatic SEO (ab MVP)
- Astro generiert statische Landing-Pages aus Daten: pro Kombination **Rätseltyp × Theme × Anlass**
  - Beispiele: «Piraten-Wortsuchrätsel für den Kindergeburtstag», «Sudoku für Kinder zum Ausdrucken», «Hochzeits-Rätselheft als PDF»
  - Struktur: H1, 200–300 Wörter einzigartiger Text (vorbereitete Textbausteine, keine Duplikate), 2–3 Beispielbilder, direkt eingebetteter Generator mit vorausgewähltem Theme, FAQ-Block mit Schema.org-Markup
- Zusätzlich Gratis-Beispiel-PDFs pro Seite (indexierbar, Backlink-Magnet)
- Technisches SEO: Sitemap, sprechende URLs (`/wortsuchraetsel/piraten-kindergeburtstag`), OG-Images pro Seite generieren, Core Web Vitals (statisch = einfach)
- Start: ca. 30–50 Seiten (3 Rätseltypen × 4 Themes × 3–4 Anlässe), Ausbau laufend

### 6.4 Analytics & Recht
- Plausible oder Cloudflare Analytics (cookielos → kein Cookie-Banner nötig)
- Impressum + Datenschutzerklärung (CH: DSG; wegen DACH-Zielgruppe DSGVO-konform), AGB für Kauf, Widerruf: bei digitalen Produkten mit sofortiger Bereitstellung Verzicht klar kommunizieren

### 6.5 i18n-Vorbereitung
- Alle UI-Texte in Locale-Dateien (de-CH zuerst), Wortlisten pro Sprache getrennt → EN-Launch in Phase 3 ohne Refactoring

---

## 7. Arbeitspakete für Claude Code (sequenziell, mit Checkpoints)

Arbeitsweise: pro Arbeitspaket Plan vorlegen → umsetzen → Review/Tests → erst dann weiter.

**AP1 — Projektsetup:** Monorepo (Astro-App + engine-Package), Tooling (TypeScript strict, Vitest, ESLint, Prettier), CI via GitHub Actions → Cloudflare Pages Deploy. Abnahme: leere Seite deployt.

**AP2 — Engine Wortsuchrätsel:** Generator + Solver/Validator, Unit-Tests (Platzierbarkeit, Blacklist, Determinismus via Seed). Abnahme: 100 generierte Rätsel fehlerfrei validiert.

**AP3 — Engine Labyrinth + Sudoku:** analog AP2 inkl. Eindeutigkeits-Solver (Sudoku) und Kindervarianten. Abnahme: Tests grün, Schwierigkeitsgrade nachvollziehbar.

**AP4 — SVG-Layout + PDF-Export:** gemeinsame Layout-Schicht (Rätsel → SVG → PDF), A4-Raster, Fonts, ein neutrales Standarddesign. Abnahme: Gratis-Einzelrätsel als sauberes PDF druckbar.

**AP5 — Generator-UI:** Konfigurator pro Rätseltyp mit Live-Vorschau, Umlaute-Handling, LocalStorage-Persistenz. Abnahme: Gratis-Flow Ende-zu-Ende nutzbar (Kern-Launch möglich!).

**AP6 — Theme-System:** Theme-JSON-Schema, 4 Themes mit Assets/Wortlisten/Fonts, Theme-Vorschau. Abnahme: Themewechsel ändert Rätsel + PDF vollständig.

**AP7 — Heft-Builder:** Mehrseiten-Komposition, Deckblatt, Lösungsteil, Drag-and-drop, Wasserzeichen-Vorschau. Abnahme: Heft-PDF mit Wasserzeichen generierbar.

**AP8 — Zahlung:** Cloudflare Worker + Payrexx-Anbindung (Sandbox), HMAC-Token, Freischalt-Flow, Fehlerfälle (Abbruch, Timeout, doppelte Zahlung). Abnahme: Testkauf schaltet wasserzeichenfreies PDF frei.

**AP9 — SEO & Content:** Landing-Page-Generator aus Daten, Textbausteine, OG-Images, Sitemap, Schema.org, Impressum/Datenschutz/AGB-Seiten. Abnahme: 30+ Seiten live, Lighthouse SEO ≥ 95.

**AP10 — Launch-Härtung:** Mobile-Optimierung (Eltern kommen via Handy!), Print-Tests auf echten Druckern, Ladezeit, Analytics, 404/Fehlerseiten. Abnahme: Testlauf mit 3–5 echten Nutzern (Bekannte mit Kindern).

---

## 8. Offene Punkte / Risiken (ehrlich)

- **Illustrations-Lizenzen** sind der kritischste Beschaffungspunkt — vor AP6 klären und dokumentieren
- **SEO braucht Monate**: mit 6–12 Monaten bis zu relevantem organischem Traffic rechnen; früh flankieren mit Pinterest (starker Kanal für Ausdruck-Vorlagen!) und 2–3 Eltern-Foren/Gruppen
- **Konversions-Hypothese ungetestet**: Preis CHF 4–7 und Gratis/Premium-Schnitt nach Launch mit echten Daten prüfen
- **Client-seitige PDF-Generierung** auf alten Mobilgeräten testen (Speicher); Fallback: Auflösung der eingebetteten Assets reduzieren

---

## 9. Erste konkrete Schritte für dich (vor Claude Code)

1. Domain prüfen und registrieren (Abschnitt 5.3)
2. Payrexx-Account eröffnen (Sandbox reicht für AP8)
3. Illustrationsquelle mit passender Lizenz auswählen
4. Diesen Plan Claude Code als `PLAN.md` ins Repo legen und mit AP1 starten
