# Aegis Infrastructure

> How and where to host Aegis. The guiding constraints are founder-light (near-zero ops), high margin (the COGS target is $3 to $8 per paying account per month), SEO-grade frontend delivery (the entire GTM is organic search), secure credential handling, and a setup clean enough for an acquirer to diligence and take over without surprises.

---

## 1. Recommended topology

Do not host everything on one platform. Split the SEO-critical frontend from the stateful backend.

```
                         Cloudflare (DNS, CDN edge, R2)
                                   |
          +------------------------+-------------------------+
          |                                                  |
   Vercel (web)                                       Railway (backend)
   Next.js: marketing site,                           NestJS API (REST/tRPC, OAuth, webhooks)
   programmatic SEO pages (ISR),                      NestJS + BullMQ workers (polling, webhook
   free audit, dashboard                              ingest, alert fan-out, scheduled jobs)
          |                                           Managed PostgreSQL (Prisma, RLS, partitioned)
          |                                           Managed Redis (BullMQ + cache)
          +-------------------- HTTPS ----------------+
                                   |
        External services: AWS KMS (master key) · Cloudflare R2 (cold archive)
                           Resend (email) · Stripe (billing) · Sentry (errors)
                           Healthchecks/Cronitor (dead-man's-switch) · Doppler/Infisical (secrets)
```

---

## 2. Components, rationale, and what to set up

### 2.1 Frontend: Vercel
- **Why:** the GTM is SEO. The programmatic page factory produces hundreds to thousands of pages, which is exactly what Vercel ISR (incremental static regeneration) plus the edge CDN are built for. Best-in-class Core Web Vitals, preview deploys per PR, zero frontend ops. This is not a place to compromise.
- **Set up:** connect the monorepo, set the `apps/web` root, configure ISR for programmatic pages, environment variables, the custom domain, automatic preview deploys.

### 2.2 API and workers: Railway
- **Why:** the API and especially the BullMQ workers need persistent, long-running processes. Scheduled polling and queue consumers are a poor fit for serverless. Railway runs persistent services with minimal ops and is the house default.
- **Set up:** three services from the monorepo (`api`, `workers`, and optionally a separate webhook-ingest service), plus managed Postgres and managed Redis. Configure per-service env vars, health checks, and autoscaling where available. Workers run as a persistent process, not a cron-only container, since BullMQ needs a live consumer.

### 2.3 PostgreSQL
- **Start:** Railway managed Postgres for simplicity.
- **Plan a migration path** to a dedicated managed Postgres (Neon or similar) as the partitioned `HealthSnapshot` table grows, for autoscaling, branching, and clean separation. It is plain Postgres plus Prisma, so the move is low-risk and portable. Do not prematurely fragment vendors.
- **Set up:** enable automated backups and point-in-time recovery, apply the RLS migration and the GUC-based tenant context, set up monthly partition creation as a scheduled job, enable pgvector only if and when remediation similarity matching is built.

### 2.4 Redis
- Railway managed Redis for BullMQ queues and caching. Set up persistence appropriate to queue durability needs and separate logical databases or key prefixes for queues versus cache.

### 2.5 Encryption master key: a real KMS
- **Why separate:** the credential master key must not live in a secret manager next to app config. It belongs in a managed KMS with rotation and access audit.
- **Recommend:** AWS KMS or GCP KMS used standalone, even though the rest of the app is not on that cloud. KMS alone is cheap, standard, and diligence-friendly. Data keys are wrapped by the KMS master key per the envelope scheme in the security doc.
- **MVP fallback** (acceptable, per the security doc): master key in the platform secret manager with AES-256-GCM, upgrade to KMS before scale. Prefer KMS from the start if the time cost is small.

### 2.6 Cold archive: Cloudflare R2
- **Why:** tiered retention archives cold snapshot partitions to object storage. R2 has no egress fees, which matters for an archive that is read occasionally for retraining. The de-identified `TrainingSample` data and archived partitions land here.
- **Set up:** an R2 bucket, lifecycle rules, and the archival job's write path.

### 2.7 Secrets and config management
- **Recommend:** Doppler or Infisical as the single source of truth for config and API keys, synced to Vercel, Railway, and GitHub Actions. This keeps env parity across platforms and is a founder-light win.
- **Distinct from the KMS master key**, which stays in KMS and is never synced as a normal secret.

### 2.8 DNS, CDN, TLS
- Cloudflare for DNS and as the front for R2. Vercel handles TLS and edge for the web surface. Railway provides TLS for the API domain.

### 2.9 Email: Resend
- **Why deliverability matters:** lifecycle email is a core conversion mechanic, so inbox placement is revenue. Set up SPF, DKIM, and DMARC records on the sending domain, warm the domain, and separate transactional from lifecycle streams.

### 2.10 Billing: Stripe
- Products and prices for the four tiers, per-account add-on metering for expansion, webhooks into the API for subscription state, and the customer portal for self-serve management.

### 2.11 Meta webhook ingestion
- A public HTTPS endpoint on the API receives Ad Account Trigger events. Set up: verify the `X-Hub-Signature-256` header with the app secret, answer the `hub.challenge` verification on subscription, respond 200 quickly and enqueue to BullMQ rather than processing inline, and dedupe on event id for idempotency.
- The OAuth redirect URI and this webhook URL must be live HTTPS before Meta app configuration, so the API domain has to exist early in the build.

### 2.12 Observability and the dead-man's-switch
- **Errors:** Sentry across web, api, and workers.
- **The monitor-the-monitor requirement** (from the spec) has two layers:
  1. **Process liveness:** workers ping a heartbeat service (Healthchecks.io, Cronitor, or Better Stack) every polling cycle. A missed ping pages the team.
  2. **Per-account freshness:** a scheduled job checks `ConnectedAccount.lastSnapshotAt` and alerts on any account whose monitoring has gone stale, because a silently dead monitor on a paying account is the cardinal product failure.
- **Logs and metrics:** Railway and Vercel native, augmented by Sentry. Ensure the token-redaction filter is active on all log paths.

### 2.13 CI/CD
- GitHub Actions with Turborepo remote caching. Auto-deploy `apps/web` to Vercel and the backend services to Railway on merge. Preview environments on PRs (Vercel previews plus a Railway preview environment). This fits the existing Claude Code plus GitHub Actions review workflow.

---

## 3. The platform decision (why this split)

- **All-Railway** is the simpler single-vendor alternative and is acceptable, but Next.js on Railway gives up the ISR and edge sophistication that the programmatic SEO surface depends on. Since SEO is the whole acquisition engine, the frontend host is the wrong place to economize.
- **A full cloud (AWS or GCP)** is over-engineered for this stage: more ops, more to diligence, slower to move, and at odds with founder-light. Use the cloud only for KMS now, and revisit only if scale genuinely demands it.
- **The split (Vercel plus Railway)** gives SEO-grade frontend, persistent backend processes, managed data stores, and near-zero ops, while staying portable. It is the best fit for a bootstrapped, founder-light, build-to-sell SaaS.

---

## 4. Setup checklist (ordered)

1. Register the domain and put DNS on Cloudflare.
2. Create the Vercel project from the monorepo, wire the custom domain, enable previews.
3. Create the Railway project: `api`, `workers`, managed Postgres, managed Redis.
4. Stand up the secrets manager (Doppler or Infisical) and sync to Vercel, Railway, and GitHub Actions.
5. Provision the KMS master key (AWS or GCP KMS) and wire the envelope-encryption path.
6. Apply the Prisma migrations, the RLS policies and tenant GUC, and the monthly partition job.
7. Create the R2 bucket and the archival lifecycle rules.
8. Configure Resend: domain, SPF, DKIM, DMARC, transactional and lifecycle streams.
9. Configure Stripe: products, prices, metering, webhooks, customer portal.
10. Stand up the API domain with HTTPS, then configure the Meta OAuth redirect URI and webhook endpoint (required live for Meta app setup).
11. Wire observability: Sentry, the heartbeat monitor, and the per-account freshness job.
12. Set up GitHub Actions with Turborepo remote cache and auto-deploy to both platforms.

Note the dependency: the Meta App Review and Business Verification (the critical-path gate) needs the OAuth redirect and webhook URLs live, so steps 2, 3, and 10 should happen early enough to unblock the review submission.

---

## 5. Cost shape (directional, verify current pricing)

At MVP this is intentionally cheap and lands in the low hundreds of dollars per month: Vercel Pro, Railway usage for the services plus Postgres and Redis, Cloudflare mostly free, Resend cheap, Sentry free or low tier, KMS pennies, R2 minimal. Costs scale with monitored-account volume, driven mainly by Postgres storage and the polling compute, which is exactly what the webhook-first detection strategy keeps in check to protect the 90 percent margin. This topology comfortably supports the target COGS.

---

## 6. Scaling path

- **Postgres** is the first thing to outgrow Railway managed. Move to a dedicated managed Postgres (Neon or similar) for autoscaling and branching when the snapshot table volume warrants it.
- **Workers** scale horizontally by adding consumer instances behind BullMQ. The polling cadence and webhook-first design keep this efficient.
- **Archive and training data** grow steadily; R2 lifecycle rules and the `TrainingSample` store absorb that without touching the hot path.
- Keep everything portable: standard Postgres, standard Redis, standard Next.js and NestJS. No exotic lock-in, which also keeps the acquirer's takeover cheap.

---

## 7. Security and compliance touchpoints

- TLS everywhere; secrets in the manager, master key in KMS, never in code or logs.
- Token redaction filter active on all log paths (web, api, workers).
- Postgres backups and PITR enabled and encrypted; RLS enforced at the database.
- Append-only audit log on credential access.
- Egress from workers restricted to known platform API domains.
- This topology is SOC-2-shaped: managed KMS, access logging, least privilege, encrypted backups, documented data flows. The goal is a clean diligence at exit.

---

## 8. Cross-references

- Architecture and stack: AEGIS_SPEC.md
- Credential encryption, KMS, token handling: AEGIS_OAUTH_SECURITY.md
- RLS, partitioning, retention, TrainingSample, dead-man's-switch on freshness: AEGIS_DATA_MODEL.md and AEGIS_RISK_ENGINE_SPEC.md
- App Review critical path and webhook URLs: AEGIS_SPEC.md and AEGIS_README.md

---

## 9. Open decisions

1. KMS provider: AWS KMS versus GCP KMS. Recommendation: whichever the team is more comfortable operating; AWS KMS is the most common and diligence-familiar.
2. Postgres host at launch: Railway managed versus starting directly on Neon. Recommendation: Railway to start for simplicity, with Neon as the planned migration target; start on Neon only if branching is wanted from day one.
3. Heartbeat and uptime vendor (Healthchecks.io, Cronitor, Better Stack). Low-stakes, pick one and move on.
