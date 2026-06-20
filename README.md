# web-store-builder

An embedded Shopify admin app for **theme customization, page building, SEO,
multi-language content, and marketing & conversion tools**. It is one of three
apps in a Shopify product suite (see `docs/PROJECT_ARCHITECTURE.md`).

- **App URL:** https://webstore.baisajaipur.in
- **Distribution:** OPEN (public App Store) — `AppDistribution.AppStore`
- **Built on:** the Shopify App **React Router** template (TypeScript)
- **Backend:** shares the suite's Supabase project (ref `mhlyicynbznlvbinvqna`)

> Status: **scaffold**. OAuth, session storage, the embedded App Bridge shell,
> install-time org provisioning, and webhook plumbing work. The home page shows a
> live **Theme & SEO** view (themes via the Admin GraphQL API + a static SEO
> readiness checklist) as a starting point. The full page builder / SEO /
> multi-language tooling is not written yet.

## Commands

```bash
npm install          # install dependencies
npm run dev          # shopify app dev — tunnels, injects env vars, opens an install link
npm run build        # react-router build
npm start            # serve the production build
npm run lint         # eslint
npm run typecheck    # react-router typegen && tsc --noEmit  (run after route/loader changes)
npm run deploy       # shopify app deploy — pushes shopify.app.toml config + registers webhooks
npm run config:link  # shopify app config link — writes the real client_id into shopify.app.toml
npm run setup        # prisma generate && prisma migrate deploy
npm run graphql-codegen   # regenerate Admin API types from GraphQL in app/**
```

There is no test runner configured. Verify with `npm run typecheck` and
`npm run lint`.

`npm run dev` is the normal way to run — it must go through the Shopify CLI to
get the API key/secret, tunnel URL, and scopes. Running Vite / react-router-serve
directly will not authenticate.

## First-time setup

1. `npm install`
2. `npm run config:link` — links this folder to the Web Store builder app in the
   Shopify Partner dashboard and writes the real `client_id` into
   `shopify.app.toml` (the committed value is the placeholder
   `REPLACE_WITH_WEB_STORE_BUILDER_CLIENT_ID`).
3. Copy `.env.example` to `.env` and fill in the Supabase values
   (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). Shopify values are injected by
   `shopify app dev` in development.
4. `npm run dev` and open the generated install link on the dev store.

## Architecture

- **`app/shopify.server.ts`** — the single configured `shopifyApp` instance.
  Import `authenticate`, `unauthenticated`, `login`, etc. from here; do not
  re-instantiate. `afterAuth` provisions a tenant org in Supabase on install.
- **Routing** — file-system flat routes (`@react-router/fs-routes`). `app.tsx` is
  the embedded layout, `app._index.tsx` is the **Theme & SEO** home,
  `app.content.tsx` is the **Content & pages** list (online-store pages via the
  Admin GraphQL API), `app.additional.tsx` is the **Page builder** placeholder,
  `auth.$.tsx` is the OAuth catch-all, and `webhooks.app.*.tsx` are webhook
  handlers.
- **Sessions** — stored in Prisma (`PrismaSessionStorage`, SQLite by default).
  The app's *business* data lives in the external Supabase Postgres, not in this
  Prisma DB.
- **Supabase** — `app/supabase.server.ts` (service-role, server-only) plus
  `app/lib/orgScopedClient.server.ts` for per-tenant (`org_id`-scoped) access.

See `CLAUDE.md` for the embedded-app constraints and conventions.

## Secrets & environment

Never commit secrets. `.env` is gitignored; `.env.example` holds placeholders
only. The app reads `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SCOPES`,
`SHOPIFY_APP_URL` (injected by `shopify app dev`), plus `SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY` (service-role key is server-side only).

## Deploy

The app config (URLs, scopes, webhooks) is deployed via the Shopify CLI; the
running server is hosted separately on Hostinger at the production subdomain.

1. **Link the app** (first deploy only) — `npm run config:link` (alias for
   `shopify app config link`). Choose **Web Store builder** so the CLI writes the
   real `client_id` into `shopify.app.toml`, replacing the committed placeholder
   `REPLACE_WITH_WEB_STORE_BUILDER_CLIENT_ID`. Never paste or commit the Client
   ID by hand.
2. **Push config + register webhooks** — `npm run deploy` (alias for
   `shopify app deploy`). This pushes `shopify.app.toml` (`application_url`,
   `[access_scopes]`, `[auth] redirect_urls`, `[webhooks]`) and registers the
   declared webhook subscriptions. The mandatory GDPR webhooks
   (`customers/data_request`, `customers/redact`, `shop/redact`) are
   auto-registered by `shopify app deploy`. Re-run after any `shopify.app.toml`
   change. Keep the `April26` / `2026-04` API version in sync across
   `app/shopify.server.ts`, `.graphqlrc.ts`, and `shopify.app.toml`.
3. **Production env vars** — set these on the Hostinger host (do **not** rely on
   `shopify app dev` injection in production):
   `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SCOPES` (must match
   `shopify.app.toml [access_scopes]`), `SHOPIFY_APP_URL=https://webstore.baisajaipur.in`,
   `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` (server-only).
4. **Build & run on Hostinger** — `npm install && npm run build`, run database
   setup (`npm run setup` — `prisma generate && prisma migrate deploy`), then
   start the server with `npm start` (serves `build/server/index.js`).
   `application_url` and the `[auth] redirect_urls` in `shopify.app.toml` already
   point at `https://webstore.baisajaipur.in`; make sure that subdomain proxies
   to the running Node server over HTTPS.

See `docs/BUILD_RUNBOOK.md` for the full suite-wide deploy/build sequence.
