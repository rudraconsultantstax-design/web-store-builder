# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Web Store builder** — an embedded Shopify admin app for theme customization,
page building, SEO, multi-language content, and marketing & conversion tools.
Built on the **Shopify App React Router template** (TypeScript). It is one of
three apps in a product suite; see `docs/PROJECT_ARCHITECTURE.md` for the broader
infrastructure (Hostinger domains, the shared Supabase database, the other two
repos) and `docs/BUILD_RUNBOOK.md` for the end-to-end deploy/build sequence.

The repo is currently a **scaffold**: OAuth, session storage, embedded App Bridge
shell, install-time org provisioning, and webhook plumbing work. The home page
ships a live **Theme & SEO** starter (lists themes via the Admin GraphQL API plus
a static SEO readiness checklist). The full page builder / SEO / multi-language /
marketing business logic is not yet written.

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

There is no test runner configured. Verify with `npm run typecheck` and `npm run lint`.

`npm run dev` is the normal way to run — it must go through the Shopify CLI to get the API key/secret, tunnel URL, and scopes. Running Vite/react-router-serve directly will not authenticate.

## Architecture

- **`app/shopify.server.ts`** — the single source of the configured `shopifyApp` instance. Everything Shopify-related (`authenticate`, `unauthenticated`, `login`, `registerWebhooks`, `sessionStorage`) is exported from here. Import these, do not re-instantiate `shopifyApp`. The `afterAuth` hook calls `provisionOrg(session.shop)` to ensure a tenant org row exists in Supabase on install (idempotent).
- **Routing** — file-system flat routes via `@react-router/fs-routes` (`app/routes.ts` → `flatRoutes()`). Route file naming is Remix-style flat convention: `app.tsx` is the embedded layout (auth + App Bridge `AppProvider`), `app._index.tsx` is the **Theme & SEO** home page, `app.additional.tsx` is the **Content & pages** placeholder, `auth.$.tsx` is the OAuth catch-all, `webhooks.app.*.tsx` are webhook handlers.
- **Auth in loaders/actions** — every embedded route calls `await authenticate.admin(request)` and uses the returned `admin` client for GraphQL. Webhook routes call `authenticate.webhook(request)`.
- **Sessions** — stored in Prisma (`PrismaSessionStorage`). The only Prisma model is `Session`; SQLite (`prisma/dev.sqlite`) by default. `app/db.server.ts` exports a singleton client (guarded against hot-reload duplication in dev). The app's *business* data lives in the external Supabase Postgres, NOT in this Prisma DB — Prisma here is session storage only.
- **Supabase** — `app/supabase.server.ts` exports a server-only, service-role client (bypasses RLS; never import into client code). Per-tenant tables must go through `app/lib/orgScopedClient.server.ts`, which stamps/filters `org_id`. This app shares the suite's Supabase project (ref `mhlyicynbznlvbinvqna`) with the other two apps.
- **GraphQL codegen** — `.graphqlrc.ts` points the Admin API schema at inline queries in `app/**`; generated types land in `app/types/`. Run `graphql-codegen` after editing queries.

## Embedded-app constraints (these break the app if ignored)

- Use `Link`/`useSubmit` from `react-router` (or Polaris), never raw `<a>` or `react-router`'s `redirect` — use the `redirect` returned by `authenticate.admin`. The app runs in an iframe and loses session otherwise.
- UI uses **Polaris web components** (`<s-app-nav>`, `<s-page>`, `<s-section>`, `<s-link>`, etc.) via App Bridge, not the Polaris React component library.
- Declare webhooks in `shopify.app.toml` (`[[webhooks.subscriptions]]`) and run `npm run deploy`, rather than registering in an `afterAuth` hook. Mandatory GDPR webhooks (customers/data_request, customers/redact, shop/redact) are auto-registered by `shopify app deploy`.

## Distribution & API version (settled)

- **Distribution:** this app is **OPEN / public App Store** distribution, which is `AppDistribution.AppStore` in `app/shopify.server.ts` — not `SingleMerchant` (custom) or `ShopifyAdmin`. Keep it on `AppStore` so the OAuth install + App Store listing flow stays intact.
- **Admin API version:** standardized on **`April26` / "2026-04"** across `app/shopify.server.ts` (`apiVersion` config + exported const), `.graphqlrc.ts` (codegen), and `shopify.app.toml` (`[webhooks] api_version`). Bump all three together if you change it.
- **Client ID:** `shopify.app.toml` ships the placeholder `REPLACE_WITH_WEB_STORE_BUILDER_CLIENT_ID`. Run `npm run config:link` (`shopify app config link`) to write the real Client ID — do not paste it in by hand or commit it.

## Scopes

Theme/SEO/content app scopes (in `shopify.app.toml [access_scopes]`):
`read_themes,write_themes,read_content,write_content,read_online_store_pages,write_online_store_pages,read_translations,write_translations,read_markets,read_marketing_events,write_marketing_events,write_script_tags`.
Keep these in sync with the `SCOPES` env var.

## Other notes

- The runbook references scaffolding with the **Remix** template, but this repo is the **React Router** template. Follow the React Router APIs (`@shopify/shopify-app-react-router`) actually present in code.

## Secrets & environment

Never commit secrets. The app reads `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SCOPES`, `SHOPIFY_APP_URL` (injected by `shopify app dev`), plus `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (service-role key is server-side only). `.env` is gitignored; `.env.example` holds placeholders only. See `docs/BUILD_RUNBOOK.md` section 6.

## Tooling

The Shopify Dev MCP is configured (`.mcp.json`) — use it for Shopify API/schema questions. `extensions/` is an npm workspace for Shopify app extensions (currently empty).
