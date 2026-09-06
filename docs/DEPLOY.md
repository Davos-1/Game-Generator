# Deployment

Die Website (`apps/web`) wird als Cloudflare Worker mit statischen Assets betrieben. Cloudflare ist per Git-Integration (Workers Builds) mit dem GitHub-Repository verbunden: Jeder Push baut und deployt automatisch. Die Konfiguration liegt in [`wrangler.jsonc`](../wrangler.jsonc) im Repo-Root.

## Einstellungen im Cloudflare-Dashboard

Workers & Pages → Projekt `raetselheft` → Settings → Build:

| Einstellung       | Wert                  |
| ----------------- | --------------------- |
| Root directory    | `/` (Repo-Root)       |
| Build command     | `pnpm run build`      |
| Deploy command    | `npx wrangler deploy` |
| Production branch | `main`                |

Wrangler liest `wrangler.jsonc` im Root und lädt `apps/web/dist` hoch. Pushes auf andere Branches erzeugen Preview-Deployments mit eigener URL.

## Lokal prüfen

```bash
pnpm build
pnpm deploy:dry   # Wrangler liest die Assets, lädt aber nichts hoch
pnpm preview      # lokaler Server mit dem fertigen Build
```

Ein manuelles Deployment von der eigenen Maschine ist möglich mit `pnpm dlx wrangler login` und `pnpm deploy`, im Normalfall aber nicht nötig.

## Eigene Domain

Sobald die Domain feststeht (PLAN.md, Abschnitt 5.3): im Worker unter «Settings → Domains & Routes» hinzufügen und in `apps/web/astro.config.mjs` den Wert `site` anpassen (wichtig für Canonical-URLs, Sitemap und OG-Tags).

## Hinweis zum Payment-Worker

Der zukünftige Cloudflare Worker für Zahlung und Premium-Freischaltung (Arbeitspaket AP8) wird ein eigener Worker mit eigener Konfiguration und ist von diesem Deployment **nicht** abgedeckt.
