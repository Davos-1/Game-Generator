# Zahlung einrichten (Payrexx)

Der Kauf ist **standardmässig abgeschaltet**. Ohne hinterlegte Zugangsdaten
zeigt die Website nur die Vorschau mit Wasserzeichen. Diese Anleitung
beschreibt, was nötig ist, um den Verkauf zu aktivieren.

## Ablauf

Es gibt zwei Produkte: ein Einzelrätsel (`single`, CHF 2) und ein Rätselheft
(`booklet`, CHF 5). Konfigurieren und die Vorschau am Bildschirm sind in
beiden Fällen gratis; jede Vorschau trägt ein Wasserzeichen, erst der Kauf
schaltet das PDF ohne Wasserzeichen frei.

1. Nutzer konfiguriert ein Rätsel oder stellt ein Heft zusammen und klickt
   «Rätsel kaufen» bzw. «Heft kaufen».
2. Die Website schickt an `/api/checkout` die Konfiguration, das Produkt
   (`product`: «single» oder «booklet») und die Seite, auf die nach der
   Zahlung zurückgesprungen werden soll (`returnPath`, z. B. `/sudoku` oder
   `/raetselheft`). Erlaubt sind nur die im Worker unter `RETURN_PATHS`
   hinterlegten Adressen. Der Worker legt bei Payrexx eine Bezahlseite zum
   Preis des gewählten Produkts an, merkt sich in KV
   `{Zahlung → Konfigurations-Hash}` und gibt die Adresse der Bezahlseite
   zurück.
3. Der Nutzer bezahlt (Karte oder TWINT) und kehrt zurück auf
   `<returnPath>?zahlung=<id>&status=ok`, also etwa
   `/sudoku?zahlung=<id>&status=ok`.
4. Die Website fragt den Worker nach dem Stand. Der Worker prüft bei Payrexx
   nach und gibt bei bezahlter Rechnung ein signiertes Token zurück.
5. Das Token gilt für **genau diese Konfiguration**: es enthält deren Hash.
   Vor dem Erzeugen des sauberen PDFs prüft der Worker das Token gegen die
   aktuelle Konfiguration.

Die Meldung von Payrexx (`/api/webhook`) beschleunigt nur den Normalfall.
Massgeblich ist die Abfrage bei Payrexx, die auch dann greift, wenn die
Meldung ausbleibt.

Die Website fragt Preise und Verfügbarkeit vorab bei `GET /api/config` ab;
die Antwort enthält `prices: { single, booklet }` (in Rappen) und
`currency`.

## Ehrliche Einschränkung

Die PDF-Erzeugung läuft im Browser (PLAN.md, Abschnitt 6.1). Die Prüfung des
Tokens erschwert das Umgehen deutlich – ein blosses Flag in den
Entwicklerwerkzeugen genügt nicht mehr –, aber wer den Browser-Code selbst
verändert, kann das Wasserzeichen theoretisch weglassen. Wer das
ausschliessen will, muss das Premium-PDF serverseitig erzeugen; das wäre ein
eigener Ausbauschritt und kostet den Vorteil der passiven, kostenlosen
Erzeugung im Browser.

## Schritte zur Aktivierung

### 1. Payrexx-Instanz

Konto auf payrexx.com eröffnen. Nötig sind der **Instanzname** (der Teil vor
`.payrexx.com`) und ein **API-Schlüssel** aus den Instanz-Einstellungen.

### 2. KV-Namespace anlegen

```bash
cd apps/worker
pnpm dlx wrangler kv namespace create PAYMENTS
```

Die ausgegebene Id in `apps/worker/wrangler.jsonc` bei `kv_namespaces` statt
`placeholder-namespace-id` eintragen.

### 3. Geheimnisse setzen

```bash
cd apps/worker
pnpm dlx wrangler secret put PAYREXX_INSTANCE
pnpm dlx wrangler secret put PAYREXX_API_KEY
pnpm dlx wrangler secret put TOKEN_SECRET   # zufällige Zeichenkette, z. B. openssl rand -base64 32
```

Fehlt eines davon, antwortet der Worker mit 503 und die Website blendet den
Kauf aus. Das ist der Auslieferungszustand.

### 4. Worker deployen

```bash
cd apps/worker
pnpm deploy
```

In `wrangler.jsonc` stehen die Preise (`PRICE_SINGLE_RAPPEN`, Standard 200 für
CHF 2.00, und `PRICE_BOOKLET_RAPPEN`, Standard 500 für CHF 5.00), Währung und
die erlaubte Herkunft (`SITE_ORIGIN`).

### 5. Website mit dem Worker verbinden

In den Build-Einstellungen der Website die Umgebungsvariable setzen:

```
PUBLIC_PAYMENT_API=https://raetselheft-payment.<konto>.workers.dev
```

Ohne diese Variable bleibt der Kauf abgeschaltet.

### 6. Meldung bei Payrexx eintragen

In der Payrexx-Instanz unter den Webhook-Einstellungen die Adresse
`https://<worker>/api/webhook` hinterlegen.

## Prüfen ohne Konto

Die Ablauflogik ist vollständig getestet (`apps/worker/src/payment.test.ts`):
Bezahlseite anlegen, Statusabfrage, Freischaltung, abgelaufene und fremde
Token, Abbruch und Ausfall der Schnittstelle. Die Tests laufen ohne
Zugangsdaten gegen einen Ersatz für Payrexx und KV.

## Rechnung und Mehrwertsteuer

Solange der Umsatz unter CHF 100'000 liegt, besteht in der Schweiz keine
Mehrwertsteuerpflicht (PLAN.md, Abschnitt 6.2). Die Belege von Payrexx
genügen für den Anfang.
