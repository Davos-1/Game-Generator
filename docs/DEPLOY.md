# Deployment einrichten

Diese Anleitung beschreibt, wie das Deployment der Website (`apps/web`) auf Cloudflare Pages eingerichtet wird. Der GitHub-Workflow [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) baut das Projekt und lädt den Build-Output (`apps/web/dist`) per Wrangler auf Cloudflare Pages hoch.

## 1. Cloudflare-Pages-Projekt anlegen

Das Projekt wird als **Direct Upload** (über Wrangler) erstellt, nicht über die Git-Integration von Cloudflare Pages. Build und Upload laufen über den GitHub-Workflow.

- Standardmässig erwartet der Workflow ein Pages-Projekt mit dem Namen `raetselheft`.
- Soll ein anderer Name verwendet werden, im Repository die Variable `CLOUDFLARE_PAGES_PROJECT` setzen (Settings → Secrets and variables → Actions → Tab «Variables»).

Ein Direct-Upload-Projekt lässt sich lokal mit Wrangler anlegen:

```bash
pnpm dlx wrangler login
pnpm dlx wrangler pages project create raetselheft --production-branch main
```

## 2. API-Token erstellen

- In Cloudflare unter «My Profile» → «API Tokens» ein neues Token erstellen.
- Berechtigung: **Cloudflare Pages: Edit** (auf Account-Ebene).
- Das Token wird nur einmal angezeigt. Sicher aufbewahren.

## 3. Repository-Secrets hinterlegen

Im GitHub-Repository unter Settings → Secrets and variables → Actions → Tab «Secrets» folgende Secrets anlegen:

| Secret                  | Wert                                                                    |
| ----------------------- | ----------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Das im vorigen Schritt erstellte API-Token                              |
| `CLOUDFLARE_ACCOUNT_ID` | Die Cloudflare-Account-ID (im Dashboard rechts unter «Account details») |

Optional zusätzlich die Repository-Variable `CLOUDFLARE_PAGES_PROJECT` setzen, falls das Pages-Projekt nicht `raetselheft` heisst.

## 4. Deployment auslösen

Das Deployment startet automatisch bei jedem Push auf `main`. Es kann zudem manuell ausgelöst werden:

1. Im GitHub-Repository auf den Tab «Actions» wechseln.
2. Den Workflow «Deploy» auswählen.
3. Auf «Run workflow» klicken (workflow_dispatch) und den gewünschten Branch bestätigen.

## 5. Build lokal prüfen

```bash
pnpm build
pnpm preview
```

Der Output der Website liegt in `apps/web/dist`. `pnpm preview` startet einen lokalen Server mit genau diesem Build.

## Eigene Domain

Sobald die Domain feststeht (PLAN.md, Abschnitt 5.3): im Pages-Projekt unter «Custom domains» hinzufügen und in `apps/web/astro.config.mjs` den Wert `site` anpassen (wichtig für Canonical-URLs, Sitemap und OG-Tags).

## Hinweis zum Payment-Worker

Der zukünftige Cloudflare Worker für Zahlung und Premium-Freischaltung (Arbeitspaket AP8) wird separat deployt und ist von diesem Workflow **nicht** abgedeckt. Die Anleitung folgt mit AP8.
