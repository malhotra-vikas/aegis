# Aegis backlog & action tracker

> Durable, committed tracker (survives restarts — unlike the in-session task list).
> Split into **your actions** (external, can't be code) and **engineering follow-ons**.
> Update the checkboxes as things land. Long-term phased plan: `ROADMAP.md`. Current
> state + resume: `HANDOFF.md`.

_Last updated: 2026-06-09._

---

## A. Your actions (external — not code)

These gate going live; none can be done from the codebase.

- [ ] **Domain + DNS** — buy the domain, point DNS (Cloudflare per `AEGIS_INFRA`).
- [ ] **Set `SITE.url`** in `apps/web/src/lib/marketing.ts` to the real domain (drives canonical URLs + sitemap).
- [ ] **Deploy `apps/web`** to Vercel (ISR-ready; marketing + guides static).
- [ ] **Deploy `apps/api`** to Railway (set `APP_DATABASE_URL` to the prod `aegis_app` login, `AEGIS_MASTER_KEY`, WorkOS + Meta env).
- [ ] **Provision `aegis_app` login in prod** — give it a password (managed secret), grant per the RLS SQL. Locally it's `aegis_app_local`.
- [ ] **Resend domain verification** (SPF/DKIM/DMARC) — required before any lifecycle email sends.
- [ ] **Stripe account** — products/prices for Solo/Agency/Scale + per-account metering, webhooks (needed for the upgrade path).
- [ ] **Run ad campaigns** — your ad account + budget. Per `AEGIS_GTM_SEO §1`, paid is surgical only (retargeting + highest-intent terms); SEO is the engine. (I can draft copy + add UTM/conversion tracking on request.)
- [ ] **Meta App Review + Business Verification (R1)** — gates *public* Meta OAuth. Your own account works in dev mode now. Critical-path, multi-week — start early.
- [x] **WorkOS account + keys** — done (auth live).
- [ ] **WorkOS dashboard: set logout/homepage redirect** to the app URL (fixes the sign-out `app-homepage-url-not-found`).
- [ ] **Search Console + analytics** — verify the domain, submit the sitemap, set up funnel analytics (`AEGIS_GTM_SEO §11`).

---

## B. Engineering follow-ons (code)

Ordered roughly by funnel value.

- [ ] **Anonymous OAuth audit** — the free "full audit" currently requires WorkOS sign-in; the GTM model wants it anonymous, email-gated, account-at-upgrade (`AEGIS_SPEC §13`). Build the anonymous connect → `AuditResult` (keyed to email, no org) path. **Highest funnel-value gap.**
- [ ] **Stripe billing** — checkout for Solo/Agency/Scale, per-account metering, webhooks → `Subscription` state, customer portal. The upgrade path.
- [ ] **Resend lifecycle email** — audit result → "standing changes overnight" nudge → re-audit drift → upgrade (`AEGIS_GTM_SEO §7`). Re-audit drift is the strongest paid trigger.
- [ ] **Scale programmatic guides to 30–50** — add entries to `marketing.ts GUIDES` (factory/sitemap pick them up). Plus 5–8 pillar pages (`AEGIS_GTM_SEO §9`).
- [ ] **Workers (`packages/workers`, BullMQ)** — scheduled polling at tier cadence, webhook ingest (Ad Account Trigger), alert fan-out. Turns point-in-time into continuous monitoring (Phase 2).
- [ ] **Alerting** — diff consecutive snapshots; alert on bucket-worsening / new terminal / `assessable`→false; email + Slack (Agency+).
- [ ] **Connector: more signal fields** — payment failure/method, business verification (needs `business_management` scope), page-restriction, linkage. Expands real-account risk coverage beyond status + disapprovals.
- [ ] **KMS-backed KeyWrapper** — replace `LocalKeyWrapper` (MVP) with AWS/GCP KMS in prod (`AEGIS_INFRA §2.5`); the seam already exists in `@aegis/shared`.
- [ ] **Secrets manager** — Doppler/Infisical for env in CI + prod (`AEGIS_INFRA §2.7`); master key stays in KMS.
- [ ] **Hardening from `ROADMAP §5.2`** — dependency/SAST scans, token-redaction lint, envelope round-trip test, pen test before public launch.
- [ ] **HealthSnapshot partitioning + tiered retention** (Phase 2, `AEGIS_DATA_MODEL §4`) — never archive `isOutcomeLabeled` rows.
- [ ] **Outcome-labeling job** (the moat) — label snapshots ±7/14/30d around a confirmed disable; feeds v2 scoring.

---

## C. Decisions on record

- **web → api boundary** (2026-06-09): web holds no Prisma; all tenant data via the NestJS api (sets RLS GUC). `/demo` exempt. In `CLAUDE.md`.
- **Auth: WorkOS** (2026-06-09): AuthKit login in web; api verifies the token (JWKS) + provisions Org/User/Membership. Design in `docs/design/AUTH.md`.
- **All `@aegis/*` libs + api are ESM** (Prisma 7 forces it).

---

## D. Done this session (2026-06-09)

Phase-0 foundation + first real product loop, all committed on `main`:
envelope crypto · Meta connector (+OAuth, +disapproval pull) · cross-tenant RLS gate
(enforced via `aegis_app`) · ESM NestJS api (tenant scoping, error model, /health) ·
CI (RLS gate + gitleaks) · WorkOS auth (live) · Meta connect → encrypted credentials
(live) · real risk dashboard (live) · replay harness + dev simulate · marketing site
+ SEO funnel (landing, pricing, audit, programmatic guides, sitemap/robots/JSON-LD).
