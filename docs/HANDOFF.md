# Session handoff — resume here

> Working-state snapshot as of **2026-06-12**, written so a fresh session (or a
> post-restart you) continues without missing a beat.
> **Open todos + your action items: `BACKLOG.md`** (the durable tracker — read it).
> Full phased plan: `ROADMAP.md`. Demo guide: `DEMO.md`. Rules + locked decisions:
> `../CLAUDE.md`. Auth design: `design/AUTH.md`.

## ▶ Resume protocol (do this first, in order)

1. **Bring the app up and confirm it runs** — env-resume steps below, then:
   - quickest real-product bring-up (two terminals): `pnpm --filter api dev` (:3001) + `pnpm --filter web dev` (:3000), or both at once with `pnpm dev` (turbo).
   - smoke-test: `curl localhost:3001/health` → `{"status":"ok"}`, open `localhost:3000` (landing) and `localhost:3000/demo` (mock).
   - whole suite green: `pnpm lint && pnpm typecheck && pnpm test` (Postgres up + `DATABASE_URL` set).
2. **Only once it's up**, review the open items in `BACKLOG.md` / `ROADMAP.md` and pick the next one to build (see "What's next" below).

## Where we are

A real product loop runs locally end-to-end, plus the original `/demo` mock (still
intact, separate). All committed on `main` (~35 commits). Whole monorepo green
(`pnpm lint && pnpm typecheck && pnpm test`).

**Built + verified (live, not mocked):**
- **`@aegis/shared`** — envelope encryption (AES-256-GCM, `KeyWrapper` seam: local MVP now, KMS later).
- **`@aegis/connectors`** — rate-limit-aware Meta Graph client, OAuth exchange/inspect, ad-account pull (status + live disapproved-ad count).
- **`@aegis/risk-engine`** — Meta v1 scoring (13 signals, noisy-OR + terminal + fail-closed). 23 tests.
- **`packages/db`** — Prisma 7 schema, **cross-tenant RLS enforced** (`aegis_app` role, no BYPASSRLS), replay harness (`pnpm --filter @aegis/db replay`).
- **`apps/api`** (ESM NestJS, :3001) — WorkOS auth (JWKS verify + Org/User/Membership provisioning), tenant scoping via `withOrg`, Meta connect → **encrypted `Credential`**, risk **assessment** (pull→engine→snapshot), **anonymous free audit**, **Stripe billing** (checkout/portal/webhook), `/health`, `/me`.
- **`apps/web`** (Next 16, :3000) — dark+teal marketing site (landing, pricing, guides factory from the taxonomy, sitemap/robots/JSON-LD), branded `/login` → WorkOS, two-step **free audit** (`/audit` → `/audit/connect` → `/audit/result`), real **risk dashboard** `/app` (RiskScoreCard + plan/upgrade/manage), Aegis shield logo. Plus the **`/demo`** persona mock (untouched).

**Live flows confirmed this session:** WorkOS sign-in → `/app`; Meta connect → 2 real ad accounts pulled + scored + encrypted credentials stored; RLS isolates the dashboard to the caller's org; anonymous audit start 302s to Meta.

## Resume the environment (ordered)

```bash
# 0. Start Docker Desktop, then:
cd /Volumes/SSD/builderspace/aegis
docker compose up -d        # Postgres + Redis return WITH data (named volumes persist)
pnpm install                # link workspace (usually a no-op)

# Rebuild the libs that apps consume (dist + generated Prisma client are gitignored;
# they persist on disk but rebuilding is the safe move):
pnpm --filter @aegis/risk-engine --filter @aegis/shared --filter @aegis/connectors --filter @aegis/db build

# Sanity: whole suite green (needs Postgres up + DATABASE_URL):
export DATABASE_URL=$(grep -o 'DATABASE_URL=.*' packages/db/.env | cut -d= -f2-)
pnpm lint && pnpm typecheck && pnpm test
```

## Running the apps

- **Demo mock:** `pnpm --filter web dev` → http://localhost:3000/demo (personas below; no real auth/env needed).
- **Real product:** two terminals —
  - api: `pnpm --filter api dev`  (builds + runs :3001; loads `apps/api/.env` via `node --env-file-if-exists`)
  - web: `pnpm --filter web dev`  (:3000)
  - then http://localhost:3000 (landing) / `/login` (WorkOS) / `/app` (dashboard) / `/audit` (free audit).

**Env (gitignored, persist on disk across restart):** `apps/api/.env` (DB, `AEGIS_MASTER_KEY`, WorkOS `WORKOS_CLIENT_ID`, Meta `META_*`, `APP_DATABASE_URL`=aegis_app, Stripe `STRIPE_*` when set), `apps/web/.env.local` (WorkOS keys, `API_BASE_URL`, DB), `packages/db/.env` (DB). Templates: each app's `.env.example`.

## Demo personas (the `/demo` mock — click to log in, no password)

| Login | Role | Lands on |
|-------|------|----------|
| `admin@aegis.dev` | Admin | `/demo/admin` |
| `dana@aegis.dev`, `marco@aegis.dev` | Sales | `/demo/sales` |
| `acme@customer.com`, `ops@northbeam.com`, `hi@lumengrowth.com`, `founder@soloco.com` | Customer | `/demo/app` |

## What's next / where we left off

All near-term todos + your external actions are in **`BACKLOG.md`**. Last open
decision: **which to build next** — options on the table were **Resend lifecycle
email** (closes funnel→revenue, pairs with the just-shipped Stripe billing),
**Workers/BullMQ continuous monitoring** (what paid tiers actually promise), or the
**Cal.com demo CTA** (smallest funnel win). Newly added to `ROADMAP §4a–4b` (not yet
built): sales-rep attribution (`?ref`), demo CTA, lead→Slack claim flow, social
content engine.

## Local infra / gotchas (will bite if forgotten)

- **DB user is `aegis`/`aegis`, NOT `postgres`** (docker compose). Container `aegis-postgres-1`. psql: `docker exec aegis-postgres-1 psql -U aegis -d aegis`.
- **RLS enforced via `aegis_app`** (local password `aegis_app_local`, `NOLOGIN` by default — `ALTER ROLE aegis_app WITH LOGIN PASSWORD …` if recreated). The api uses it via `APP_DATABASE_URL`; the owner connection bypasses RLS (so `/demo` is unaffected). Re-apply policies: `pnpm --filter @aegis/db rls`.
- **All `@aegis/*` libs + the api are ESM** (Prisma 7 forces `"type":"module"`). The api builds with `tsc` (not nest-cli) so decorator metadata is emitted; `tsx`/esbuild would break Nest DI.
- **`apps/api/.env` is loaded by the run scripts** via `node --env-file-if-exists=.env` — NestJS does not auto-load it.
- **Two Meta redirect URIs** must be registered in the Meta app: `…/oauth/meta/callback` (authed connect) and `…/audit/connect/callback` (anonymous audit).
- **WorkOS AuthKit page** is branded in the WorkOS dashboard (not our code) — teal `#2DD4BF`, dark, logo (`apps/web/public/logo.svg`); set a logout/homepage redirect.
- **Stripe** code is built but dormant until `STRIPE_*` env is set (see `BACKLOG §A`); test webhooks with the Stripe CLI → `localhost:3001/billing/webhook`.
- `tsconfig.base.json` needs `"declaration": true` (else libs emit no `.d.ts` → `any` everywhere). After moving App Router routes, `rm -rf apps/web/.next`. Re-seeding regenerates cuid IDs.
