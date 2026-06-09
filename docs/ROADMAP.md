# Aegis Engineering Roadmap & TODO

> Synthesized from the doc set (`AEGIS_README.md` is the index). This is the
> execution view: what is built, what is next, and the ordered work to ship.
> The strategy, scoring math, schema, and security shapes live in the source
> docs and are cited inline — this file does not restate them.
>
> **Two rules from `CLAUDE.md` hold throughout:** architecture decisions and
> final merge approval stay human, and the build is gated by validation
> (`AEGIS_RISK_REGISTER.md`) — no heavy spend until R1 and R2 pass.

Legend: `[x]` done · `[~]` partial/demo-only · `[ ]` todo.

---

## 0. Current status (what exists today)

- [x] Monorepo scaffold — pnpm + Turborepo, TypeScript strict (`AEGIS_SPEC §6`).
- [x] **Risk engine v1** (`packages/risk-engine`) — pure/deterministic scoring
      (noisy-OR, severity×confidence, terminal override, buckets, fail-closed),
      full Meta v1 signal catalog (13 signals), golden-fixture + property tests
      (23 passing) (`AEGIS_RISK_ENGINE_SPEC`).
- [x] **Data model** (`packages/db`) — full Prisma schema (spec entities + the
      sales CRM), migration applied, ESM client wired via the pg driver adapter,
      idempotent seed (`AEGIS_DATA_MODEL`).
- [~] RLS + partitioning SQL **authored** (`packages/db/prisma/sql/`) but **not
      applied or enforced** (`AEGIS_DATA_MODEL §3-4`).
- [~] **Local demo** (`apps/web`, `/demo`) — persona auth, sales CRM + revenue,
      lead→customer conversion, customer risk dashboard rendering the real
      engine over seeded data. Demo-grade only (see §6).
- [x] Local infra — `docker-compose` (Postgres 16 + Redis 7).
- [ ] Everything below.

---

## 1. Build gates — resolve before heavy spend (`AEGIS_RISK_REGISTER`)

These are **founder/validation** work, mostly not code, but they gate the build.

- [ ] **R1 · Meta App Review + Business Verification.** Critical path, multi-week,
      blocks all public auth. Confirm `ads_read` fields are readable on own
      account; submit minimal scopes (`ads_read`, `business_management`,
      page-read) with the use-case narrative + screencast (`AEGIS_VALIDATION_KIT`).
- [ ] **R2 · Early-warning premise.** 8–12 agency interviews + 50–100 community
      post-mortems + self-monitoring; ≥40% of disables must show an API-visible
      leading signal to proceed as-positioned.
- [ ] **R3 (partial) · SEO/AI-search check** — SERP read on target queries; thin
      live test (2–3 pillar + 15–20 programmatic pages) over 60–90 days.
- [ ] Go/no-go decision recorded against the thresholds (`AEGIS_RISK_REGISTER §5`).

---

## 2. Phase 0 — Foundation & unblocking (`AEGIS_SPEC §10`)

- [ ] Kick off R1 on day zero (also a gate item above).
- [ ] **NestJS api layer** (`apps/api`) — REST/tRPC, request lifecycle, error model.
- [ ] **Real auth** — replace the demo persona cookie with OAuth + sessions;
      Organization / User / Membership wired to real sign-in.
- [ ] **Meta OAuth flow** — Authorization Code + `state` (+ PKCE where possible),
      server-side short→long-lived token exchange, `appsecret_proof` on every
      Graph call, system-user guided path for Agency/Scale (`AEGIS_OAUTH_SECURITY §4`).
- [ ] **Envelope encryption** for `Credential` — AES-256-GCM, per-record data key
      wrapped by a KMS master key, `keyVersion` rotation, plaintext never stored
      or logged (`AEGIS_OAUTH_SECURITY §5`).
- [ ] **`packages/connectors`** — rate-limit-aware Meta client honoring the
      `X-Business-Use-Case-Usage` header, backoff+jitter, egress allowlist
      (`AEGIS_OAUTH_SECURITY §8`). Our polling must never be a ban signal.
- [ ] **`packages/shared`** — crypto utils, config, shared types (single source).
- [ ] **Apply RLS** + tenant GUC + cross-tenant CI gate (see §5 — multi-tenancy).
- [ ] **CI** — lint/typecheck/test on every PR; Turbo remote cache (`AEGIS_INFRA §2.13`).

---

## 3. Phase 1 — Free audit MVP, Meta only (`AEGIS_SPEC §3.1, §10`)

- [ ] **Two-step audit** — email pre-assessment before OAuth (protects against
      connect friction, R5) (`AEGIS_GTM_SEO`, `AEGIS_SPEC §13`).
- [ ] One-click connect → point-in-time snapshot → score → green/amber/red
      verdict → hard upgrade CTA at the verdict moment.
- [ ] `AuditResult` capture (email-keyed, pre-signup) + conversion tracking.
- [ ] Begin `HealthSnapshot` capture with the full signal vector (the moat
      accrues from day one — `AEGIS_RISK_ENGINE_SPEC §7.1`).
- [ ] Engine explainability UI — render every signal, ordered by contribution,
      with explanation/severity/confidence/evidence + matched playbook;
      never summarize away the breakdown (`AEGIS_RISK_ENGINE_SPEC §5`).
- [ ] **Remediation playbooks v1** rendered in-app and as SEO pages, with the
      free/gated split (`AEGIS_REMEDIATION_PLAYBOOKS §6`). Re-verify each
      `lastVerified` path against live Meta docs before publish.
- [ ] **Marketing landing + SEO foundation** — suspension-intent queries.
- [ ] **Programmatic page factory** built from the risk taxonomy (one page per
      signal/cause), Vercel ISR (`AEGIS_GTM_SEO`, `AEGIS_INFRA §2.1`).
- [ ] Milestone: free audit live, capturing emails + audit results.

---

## 4. Phase 2 — Paid continuous monitoring (`AEGIS_SPEC §3.2, §8, §10`)

- [ ] **Webhook ingest** — Ad Account Trigger subscription, `hub.challenge`
      verify, `X-Hub-Signature-256` check, respond-200-then-enqueue, dedupe on
      event id (`AEGIS_INFRA §2.11`).
- [ ] **BullMQ workers** (`packages/workers`) — scheduled polling at tier cadence,
      webhook processing, alert fan-out, retries with backoff (`AEGIS_SPEC §6`).
- [ ] **Alerting** — diff consecutive snapshots; alert on bucket-worsening / new
      terminal-or-critical / `assessable`→false; recovery alerts; dedupe key
      `account+category+day`; email (Resend) + Slack (Agency+)
      (`AEGIS_RISK_ENGINE_SPEC §6`, `AEGIS_SPEC §8`).
- [ ] **Hybrid HealthSnapshot writes** — row on change + heartbeat; denormalize
      current state onto `ConnectedAccount` (`AEGIS_DATA_MODEL §1`).
- [ ] **Token lifecycle** — scheduled debug-endpoint validation, proactive
      long-lived refresh, failure (190/100/200) → reconnect prompt **and**
      `assessable=false` risk alert, revoke-and-purge on disconnect
      (`AEGIS_OAUTH_SECURITY §6`).
- [ ] **Stripe billing** — four tiers, account/seat quotas, per-account add-on
      metering for NRR, webhooks → subscription state, customer portal.
- [ ] Multi-account dashboard, team seats, historical risk tracking.
- [ ] **Dead-man's-switch** — worker heartbeat + per-account `lastSnapshotAt`
      freshness job (`AEGIS_INFRA §2.12`, `AEGIS_SPEC §9`).
- [ ] **HealthSnapshot partitioning** (monthly) + tiered retention/archival to R2,
      never touching `isOutcomeLabeled` rows (`AEGIS_DATA_MODEL §4`).
- [ ] **Outcome-labeling job** (the moat) — label snapshots ±7/14/30d around a
      confirmed disable; lock from archival (`AEGIS_DATA_MODEL §4.3`).
- [ ] Milestone: first revenue (~100 paying accounts / ~$180K ARR end-Y1).

---

## 5. Cross-cutting · Security & Multi-tenancy (priority, runs alongside all phases)

> Called out explicitly. Storing other businesses' tokens makes this existential
> (`AEGIS_RISK_REGISTER R7`, `AEGIS_OAUTH_SECURITY`). Treat the CI gates as
> non-negotiable, not aspirational.

### 5.1 Multi-tenant correctness (RLS-first)
- [ ] Apply RLS policies on every tenant table; tenant GUC set per request
      transaction (`SELECT set_config('app.current_org_id', …)`) (`AEGIS_DATA_MODEL §3`).
- [ ] API role has **no** `BYPASSRLS`; only the background scheduler role does,
      and it sets the GUC when operating on one tenant.
- [ ] **Cross-tenant RLS test suite as a CI gate** — for every tenant table,
      attempt a cross-tenant read/write and assert denial (`AEGIS_RISK_REGISTER R7`).
- [ ] Tenant-context middleware in the api; verify every query path (including
      denormalized reads and worker jobs) carries `orgId` and respects RLS.
- [ ] Soft-delete default filter + hard-purge path, tested per tenant
      (`AEGIS_DATA_MODEL §5`).
- [ ] De-identified `TrainingSample` offboarding job — extract feature vector +
      label, drop `rawPayload`/identifiers, then hard-purge tenant rows; verify
      irreversibility against the platform developer terms (`AEGIS_DATA_MODEL §5.1`).
- [ ] Multi-tenant load/isolation test — N tenants, concurrent jobs, assert no
      leakage and bounded query cost.

### 5.2 Full vulnerability scan (CI + pre-launch)
- [ ] **Dependency scanning** — `pnpm audit` / OSV / Snyk on every PR + nightly.
- [ ] **SAST** — CodeQL or Semgrep on every PR.
- [ ] **Secret scanning** — gitleaks/trufflehog pre-commit + CI; block on hit.
- [ ] **Token-redaction lint + log scanning** — prove no token ever appears in
      logs across web/api/workers (`AEGIS_OAUTH_SECURITY §11`, R7).
- [ ] **Envelope-encryption correctness test** (round-trip, tamper → auth-tag
      failure, key-version rotation) (R7).
- [ ] **Container/image scan** for deployed services.
- [ ] **DAST** against a staging deploy.
- [ ] **Threat-model review** against `AEGIS_OAUTH_SECURITY §1` (DB compromise,
      log leakage, token misuse, over-scope, insider over-access, key compromise,
      our-own-activity-as-ban-signal) — confirm each mitigation is implemented.
- [ ] **Scope audit** — never request/use `ads_management` or any write scope.
- [ ] **`appsecret_proof` on every Graph call** + egress restricted to platform
      API domains.
- [ ] **Append-only audit log** on every credential decrypt/access (app role:
      INSERT+SELECT only, no UPDATE/DELETE) (`AEGIS_DATA_MODEL §3`).
- [ ] **KMS key management** — rotation runbook, key versioning, master key never
      in env/secret-manager/logs.
- [ ] **Third-party pen test / security review before public launch** (R7) —
      low cost vs the risk it retires.
- [ ] SOC-2-shaped controls inventory assembled for the exit data room
      (`AEGIS_OAUTH_SECURITY §9`).

### 5.3 Observability (monitor-the-monitor)
- [ ] Sentry across web/api/workers; token-redaction filter on all log paths.
- [ ] Heartbeat monitor (Healthchecks.io/Cronitor) on each polling cycle.
- [ ] Per-account freshness alerting (the cardinal-failure guard) (`AEGIS_INFRA §2.12`).

---

## 6. Demo → production hardening (retire the deliberate shortcuts)

The `/demo` app cut these corners on purpose; each maps to real Phase-0 work above.

- [~] **Auth** — cookie persona switch → real OAuth + sessions (§2).
- [~] **Data access boundary** — web hits Prisma directly; decide and build the
      api boundary (web → NestJS api, not Prisma in server components) (`CLAUDE.md`).
      *(Architecture decision — human sign-off.)*
- [~] **RLS** — app-level `orgId` filtering → enforced Postgres RLS (§5.1).
- [~] **Real data** — seeded `RawMetaPull`s → live Meta connector pulls (§2).
- [ ] **Secrets** — local `.env` → Doppler/Infisical; KMS master key separate (`AEGIS_INFRA §2.7`).

---

## 7. Later phases (`AEGIS_SPEC §10`)

### Phase 3 — Google Ads + agency depth (Months 6–12)
- [ ] Google Ads connector (`AccountStatus`, `PolicySummary`, `approval_status`,
      `policy_topic_entries`) + risk-engine Google adapter via the `PlatformAdapter`
      interface — core scoring unchanged (`AEGIS_RISK_ENGINE_SPEC §8`).
- [ ] Per-client views, white-label reports, Scale tier, API access.
- [ ] Expansion prompts to add client accounts (drives NRR).
- [ ] SEO content engine scaled. Milestone ~$1.2M ARR, NRR >100%.

### Phase 4 — Breadth + the moat activates (Y2–Y3)
- [ ] TikTok connector + adapter.
- [ ] **Risk engine v2** — interpretable learned model (regularized logistic /
      GBT, not deep nets) over accumulated outcomes; mandatory calibration;
      shadow mode first; versioned promotion only on beating rules on held-out
      recall+calibration; terminal rules always override (`AEGIS_RISK_ENGINE_SPEC §7`).
- [ ] Historical analytics + category benchmarking.
- [ ] Retention/NRR instrumentation, churn-cause analysis, win-back (R9).
- [ ] (Deferred decision) MCP server as a Scale-tier feature (`AEGIS_SPEC §13.4`).

### Phase 5 — Exit prep (Y3→Y4)
- [ ] Founder-light runbooks, offshore on-call, support deflection via playbooks.
- [ ] Diligence-ready metrics (cohort retention, NRR, gross margin, CAC payback).
- [ ] Data room: architecture, security controls, clean IP assignment.
- [ ] Run the sale process while growth is still steep (~$2.5–3M ARR).

---

## 8. Infra setup checklist (ordered — `AEGIS_INFRA §4`)

- [ ] Domain + Cloudflare DNS.
- [ ] Vercel project (`apps/web`, ISR, preview deploys).
- [ ] Railway project — api, workers, managed Postgres, managed Redis.
- [ ] Secrets manager (Doppler/Infisical) synced to Vercel/Railway/Actions.
- [ ] KMS master key provisioned + envelope path wired.
- [ ] Apply Prisma migrations + RLS + GUC + monthly partition job.
- [ ] R2 bucket + archival lifecycle rules.
- [ ] Resend domain (SPF/DKIM/DMARC), transactional vs lifecycle streams.
- [ ] Stripe products/prices/metering/portal/webhooks.
- [ ] API domain HTTPS live → configure Meta OAuth redirect + webhook URLs
      (**required live to unblock App Review** — sequence early).
- [ ] Observability (Sentry + heartbeat + freshness job).
- [ ] GitHub Actions + Turbo remote cache + auto-deploy both platforms.
