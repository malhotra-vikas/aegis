# Session handoff — resume here

> Snapshot of working state as of **2026-06-08**, written so a fresh session
> can continue without losing a beat. Long-term plan: `ROADMAP.md`. Demo guide:
> `DEMO.md`. How-to-work + locked decisions: `../CLAUDE.md`.

## Where we are

Three things are built and verified:

1. **`packages/risk-engine`** — Meta v1 risk engine (pure/deterministic scoring,
   13-signal catalog), 23 tests green.
2. **`packages/db`** — full Prisma 7 schema (spec entities + sales CRM), migration
   applied, ESM client wired (pg driver adapter), idempotent seed.
3. **`apps/web` `/demo`** — runnable local demo: persona auth (Admin/Sales/Customer),
   sales CRM + revenue, **lead→customer conversion**, and a customer risk dashboard
   rendering the **real engine** over seeded data. Both GTM motions (sales-led +
   self-serve) represented.

Full status with `[x]/[~]/[ ]` markers is in `ROADMAP.md §0`.

## Phase 0 progress (added 2026-06-09)

Real backend foundation underway (`/demo` stays as the mock, untouched):

1. **`@aegis/shared`** — envelope encryption (AES-256-GCM, per-record data key,
   `KeyWrapper` seam for KMS-vs-local, key rotation). 11 tests.
2. **`@aegis/connectors`** — rate-limit-aware Meta Graph client (`appsecret_proof`,
   `X-Business-Use-Case-Usage`, backoff+jitter, egress allowlist), ad-account pull
   → `RawMetaPull`, and OAuth exchange/inspect helpers with a read-only scope
   allowlist. 24 tests.
3. **`@aegis/db`** — **cross-tenant RLS isolation gate** (policies + `WITH CHECK`,
   least-privilege `aegis_app` role, append-only `AuditLog`). 6 tests. Apply RLS
   with `pnpm --filter @aegis/db rls`.
4. **`apps/api`** — converted to **ESM NestJS** (tsc + vitest, dropped nest-cli/jest).
   `PrismaService.withOrg` sets the per-request RLS GUC inside a transaction;
   tenant middleware; global error filter; `/health`. Boots + serves on :3001.
5. **CI** — `.github/workflows/ci.yml`: Postgres service → migrate → lint/typecheck/
   test (incl. the RLS gate) → build; gitleaks secret-scan. ESLint wired across all
   packages (root flat config for the pure libs).
6. **WorkOS auth (slice 5)** — api verifies WorkOS access tokens via JWKS
   (`WorkosAuthService`), provisions Org/User/Membership on first sign-in
   (`IdentityService`), and a `WorkosAuthGuard` sets `req.orgId`. `/me` echoes the
   tenant context. Local-dev bypass via `AEGIS_DEV_ORG_ID`. Schema gained
   `workosOrgId`/`workosUserId` (+ migration). Web: AuthKit `proxy.ts` (Next 16
   renamed middleware→proxy; gated on WorkOS env so `/demo` is untouched),
   `/callback`, and an authed `/app` page that calls the api `/me`. See
   `.env.example` in `apps/api` and `apps/web` for the vars to set.

**All `@aegis/*` libs + the api are now ESM** (Prisma 7 forces it). The api connects
as `aegis_app` (no BYPASSRLS) in prod via `APP_DATABASE_URL`; locally it falls back
to `DATABASE_URL` (the owner, which bypasses RLS — so the demo is unaffected).

Run the whole suite: `pnpm lint && pnpm typecheck && pnpm test` (needs `DATABASE_URL`
set + Postgres up for the RLS gate).

## Resume the environment tomorrow (ordered)

```bash
# 0. Start Docker Desktop (GUI), then:
cd /Volumes/SSD/builderspace/aegis
docker compose up -d            # Postgres + Redis return WITH data (named volume persists)
pnpm install                    # link workspace (usually a no-op)

# Rebuild the libs web consumes (their dist + Prisma client are gitignored;
# they persist on disk across a restart, but rebuilding is the safe move):
pnpm --filter @aegis/risk-engine --filter @aegis/db build

# Optional — only if you want a fresh, predictable demo dataset:
pnpm --filter @aegis/db seed

pnpm --filter web dev           # → http://localhost:3000/demo
```

Sanity checks: `pnpm --filter @aegis/risk-engine test` (23 pass), then open
`localhost:3000/demo`.

## Demo personas (click to log in, no password)

| Login | Role | Lands on |
|-------|------|----------|
| `admin@aegis.dev` | Admin | `/demo/admin` — leads, revenue, convert lead |
| `dana@aegis.dev`, `marco@aegis.dev` | Sales | `/demo/sales` — own pipeline |
| `acme@customer.com`, `ops@northbeam.com`, `hi@lumengrowth.com`, `founder@soloco.com` | Customer | `/demo/app` — risk dashboard |

## Verified working (don't re-litigate)

- All three persona views render with real data; role guards correct.
- Lead→customer conversion provisions a real tenant + engine snapshot; the new
  customer can log in immediately. (Tested over HTTP via the server action.)
- Engine scores match the spec (worked example 39.73 amber; terminal overrides).

## Gotchas / non-obvious (will bite again if forgotten)

- **Prisma 7 is ESM.** `@aegis/db` and `@aegis/risk-engine` must keep
  `"type": "module"`. The generated client uses `import`/`fileURLToPath`; CJS
  output fails at runtime.
- **`tsconfig.base.json` needs `"declaration": true`** or the libs emit no
  `.d.ts` and resolve as `any` everywhere they're imported. (Was dropped once;
  caused a flood of phantom type errors in web.)
- **Re-seeding regenerates all cuid IDs.** Stale session cookies / hardcoded IDs
  break after a reseed — re-fetch IDs from the DB.
- **After moving App Router routes, `rm -rf apps/web/.next`** — stale generated
  route types (`.next/dev/types`) reference old paths and fail typecheck.
- Web reads `DATABASE_URL` from `apps/web/.env.local`; `packages/db` from
  `packages/db/.env`. Both gitignored.

## Immediate next steps (slice 4 — partially done)

The Meta-OAuth *connector* helpers exist (exchange/inspect). Remaining, and where
the open decision sits:

1. **api credential-storage service** — seal a `TokenBundle` (shared envelope) and
   persist an encrypted `Credential` via `PrismaService.withOrg`. Unblocked; needs
   a master-key env (`LocalKeyWrapper` MVP path) + the OAuth controller.
2. **OAuth controller** — `/oauth/meta/start` + `/callback` wiring the connector
   exchange → credential storage. Needs a **Meta dev app (App ID/Secret)** to test
   live; mock-testable meanwhile. Public OAuth is gated by R1 (Meta App Review).
3. **Real auth + sessions** — DONE (WorkOS, slice 5 above). Remaining: a live
   end-to-end test once the WorkOS account + keys exist (set `apps/web/.env.example`
   + `apps/api/.env.example` vars), and pointing `APP_DATABASE_URL` at the
   `aegis_app` login role so RLS is enforced (not just bypassed by the owner).

## Resolved decisions

- **web ↔ api data boundary** — decided 2026-06-09: web tier holds no Prisma; all
  tenant data flows through the NestJS api (sets the RLS GUC). `/demo` exempt.
  Now in `CLAUDE.md` locked decisions.

## In-session task list (all completed this session)

risk-engine (types/scoring, Meta catalog, tests) · db schema + migration · seed
with real engine · web↔db/engine wiring + dev auth · admin/sales/customer pages ·
local end-to-end verify · relocate demo to `/demo` · write `ROADMAP.md`. No open
in-session tasks; the forward work lives in `ROADMAP.md`.
