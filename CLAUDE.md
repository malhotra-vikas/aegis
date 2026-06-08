# CLAUDE.md

Operating guide for working in the Aegis repo. Read this before writing code. The detailed specs live in the doc set (AEGIS_README.md is the index); this file is the contract for how to work here.

Aegis is an ad-account survival and health-monitoring SaaS, Meta-first, read-only, PLG, built to be sold. It is not a performance-optimization tool.

---

## How to work here

- Implement within the architecture and bounds that are already decided. Do not invent architecture mid-implementation.
- For any non-trivial feature, expect a short design doc (goal, constraints, explicit non-goals). Build to it. If one does not exist for what you are asked to do, ask for it rather than guessing the shape.
- When a tradeoff has real consequences (data model, security, public API, money, irreversible migration), stop and surface it. Do not pick silently.
- Architecture decisions and final merge approval are human. Never self-approve, never assume sign-off.

---

## Hard rules (these exist because of known failure modes)

1. **Build only what was asked.** No speculative features, no "while I was here" additions. Respect stated non-goals as hard boundaries. Scope creep is a bug.
2. **No premature abstraction.** Write for the case in front of you. Do not add generalization, config, or extension points for hypothetical future needs. Two concrete uses before an abstraction, not zero.
3. **Match the existing codebase.** Use the patterns, naming, file shapes, and libraries already present. Do not introduce a new pattern, library, or style when one already exists. If the existing pattern is genuinely wrong, flag it, do not silently fork.
4. **Comments explain why, not what.** The code says what. Comment only non-obvious reasoning, tradeoffs, or gotchas. Delete narration.
5. **Error handling proportional to context.** Handle the failures that can actually happen here. No defensive try/catch around everything, no catch-and-rethrow noise, no swallowing errors. In this product, a swallowed monitoring failure is worse than a crash: fail loud, fail closed.
6. **Keep it lean.** Prefer the smaller, plainer solution. Fewer files, fewer layers, fewer dependencies. Verbosity is not safety.
7. **Ask when unsure.** A clarifying question is cheaper than a wrong implementation built confidently.

---

## Stack

- Monorepo: pnpm (10.x) workspaces + Turborepo (2.x, `tasks` key). TypeScript strict everywhere (extends `tsconfig.base.json`).
- `apps/web`: Next.js App Router, React 19, Tailwind. Marketing, programmatic SEO, free audit, dashboard. Hosted on Vercel.
- `apps/api`: NestJS. REST/tRPC, OAuth, webhooks. Hosted on Railway.
- `packages/workers`: NestJS standalone + BullMQ. Polling, webhook ingest, alert fan-out, scheduled jobs. Railway.
- `packages/risk-engine`: pure TypeScript scoring library. No I/O, no network, deterministic.
- `packages/connectors`: Meta/Google/TikTok API clients, rate-limit-aware.
- `packages/db`: Prisma (7.x). Schema in `packages/db/prisma/schema.prisma` is the source of truth.
- `packages/shared`: shared types, config, crypto utils.
- Data: PostgreSQL 16, Redis 7. Local via `docker compose up -d`.

---

## Conventions

- Module boundaries are real: the `risk-engine` is pure and imports no I/O. Connectors do I/O and no scoring. Keep them separate.
- The `risk-engine` returns everything the UI needs to explain a score. Never collapse the per-signal breakdown.
- Shared types live in `packages/shared`. Do not redefine the same type in two places.
- Prisma is the only path to the database. No raw SQL in app code except the RLS/partition migrations in `packages/db`.
- Secrets come from the environment (Doppler/Infisical locally and in CI). The KMS master key is never in env or code.

---

## Testing and verification (harness comes first)

- Every package has `lint`, `typecheck`, and `test`. CI runs all three on every PR; they must pass before review.
- `risk-engine` is tested with golden fixtures (the worked example in AEGIS_RISK_ENGINE_SPEC.md section 3.5 is the first). Property tests: adding a signal never lowers the score; score in [0,100]; terminal forces red; incomplete data never yields green.
- A cross-tenant RLS isolation test is a required CI gate: attempt a cross-tenant read, assert it is denied.
- Write the test with the code, not after. A feature without a test is not done.

---

## Locked decisions (do not drift from these)

These are settled. Implement consistent with them; do not relitigate in code. Full rationale in AEGIS_README.md.

- Meta-first. Google in Phase 3, TikTok in Phase 4.
- Read-only only. Never request or use `ads_management` or any write scope.
- Risk engine fails closed: incomplete data is never scored green; it sets `assessable = false` and surfaces the gap.
- Risk engine is explainable; v2 uses interpretable models only, never opaque deep nets.
- Tenant isolation is Postgres RLS on a shared schema. Every tenant table carries `orgId`. The API role never has BYPASSRLS.
- HealthSnapshots are hybrid writes: a row on change and on a periodic heartbeat. Current state is denormalized onto `ConnectedAccount`; read state from there, not by scanning snapshots.
- Tiered retention archives cold data but never archives or deletes `isOutcomeLabeled` rows.
- Outcome-labeled snapshots are retained de-identified after offboarding via the `TrainingSample` store (no orgId, no rawPayload, no identifiers). De-identification must be irreversible.
- Detection is webhook-first (Meta Ad Account Trigger), polling as fallback. Polling is rate-limit-aware and must never become a ban signal for monitored accounts.
- System user tokens preferred for Agency/Scale; long-lived user tokens for the quick path.
- Pricing is per-account (drives NRR). Slack alerts are Agency tier and up.
- Free audit is point-in-time, email-gated, anonymous until upgrade.

---

## Security non-negotiables

- OAuth tokens are encrypted at rest with envelope encryption (see AEGIS_OAUTH_SECURITY.md). Never store plaintext.
- Tokens never appear in logs or error messages. A redaction filter is on all log paths.
- Least-privilege scopes only.
- A lost or invalid token is a risk event: mark the account `assessable = false` and alert, do not silently no-op.
- Append-only audit log on credential access.

---

## Commands

```
docker compose up -d     # local Postgres + Redis
pnpm install             # link the workspace
pnpm dev                 # all apps
pnpm lint                # all packages
pnpm typecheck
pnpm test
```

Prisma (from `packages/db`):
```
pnpm dlx prisma migrate dev --name <name>
pnpm dlx prisma generate
```

---

## What stays human

Architecture, the decision of whether to build something at all, tradeoffs with real consequences, security and data-model choices, and final merge approval. When a task touches these, propose and wait, do not commit the decision in code.

---

## Maintenance

Re-baseline this file as the codebase teaches you things: when a zone turns out to be fragile, when a hard-won decision is made, when a pattern becomes the standard, write it down here. A stale CLAUDE.md drifts the code with it.