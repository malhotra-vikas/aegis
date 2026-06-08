# Aegis: Master Document Index

> **Working codename: Aegis.** Naming and domain are still open. This is the entry point for the document set. Read this first, then the documents in the order below. It also records the decisions already locked, so they are not relitigated mid-build.

---

## Thesis in one line

Aegis is the ad account survival layer, Meta-first. It monitors ad account health and suspension risk, warns before a flag becomes a suspension, and tells the advertiser exactly how to fix it. It is built PLG, founder-light, and to be sold in roughly three to four years.

It is deliberately NOT a performance-optimization dashboard. That category is crowded, commoditized, and given away free by the platforms. Aegis competes where the platform is the threat, not a free first-party competitor, which is why the wedge is defensible.

---

## The document set

| # | File | What it is | Primary audience |
|---|------|-----------|------------------|
| 1 | AEGIS_SPEC.md | Product definition, tiers, architecture, data model, full build roadmap | Founder + dev team |
| 2 | AEGIS_RISK_ENGINE_SPEC.md | The scoring model, Meta signal catalog, learned-scoring path. The core IP | Dev team (backend / ML) |
| 3 | AEGIS_GTM_SEO.md | Acquisition and conversion engine: PLG funnel, programmatic SEO, channels | Founder + growth |
| 4 | AEGIS_REMEDIATION_PLAYBOOKS.md | The structured fix-it content keyed to engine signals. Connective tissue | Dev + content + growth |
| 5 | AEGIS_OAUTH_SECURITY.md | OAuth flow, token strategy, encryption, and credential-security hardening | Dev team (backend / security) |
| 6 | AEGIS_DATA_MODEL.md | Executable Prisma schema plus RLS, partitioning, retention, and outcome-labeling SQL | Dev team (backend) |
| 7 | AEGIS_INFRA.md | Hosting topology, component setup, the platform decision, and an ordered setup checklist | Founder + dev team |
| 8 | AEGIS_RISK_REGISTER.md | **Read first.** The risks to success, with low-cost experiments and the validation sprint that gates the build | Founder |
| 9 | AEGIS_VALIDATION_KIT.md | Runnable materials for the two build gates: the Meta App Review package and the early-warning validation toolkit | Founder |

---

## What each document covers

**1. AEGIS_SPEC.md (product and roadmap).**
The canonical product spec. Positioning and what the product is and is not. The PLG value loop (free audit to verdict to upgrade to expansion). The four tiers and their feature split. The system architecture on the house stack (pnpm/Turborepo, TypeScript strict, NestJS API and BullMQ workers, Next.js, PostgreSQL/Prisma, Redis, AES-256-GCM credential encryption, Stripe, Resend, Railway). The core data model. Non-functional requirements including the COGS and margin targets. The phased roadmap from foundation through exit prep, tied to the ARR model. Start here; it frames everything else.

**2. AEGIS_RISK_ENGINE_SPEC.md (the IP).**
The engine that turns raw account data into an explainable risk score. Specifies the noisy-OR scoring math with a worked arithmetic example, the severity and confidence model, the terminal-override logic, and the green/amber/red bucketing. Contains the full Meta v1 signal catalog with weights and sources. Defines the explainability contract, the fail-closed rule (never report green on incomplete data), the outcome-capture path to v2 learned scoring, the adapter interface for Google and TikTok, and the test strategy. This is the defensible asset and the most detailed document.

**3. AEGIS_GTM_SEO.md (distribution).**
How customers are acquired and converted without the founder selling. The full PLG funnel with stage metrics and organic-traffic targets derived from the ARR model. The SEO engine: intent thesis, keyword clusters, and the programmatic page factory built from the risk taxonomy. The content-product flywheel. Community, Slack-directory, and affiliate channels. Conversion mechanics (the verdict moment, lifecycle email, the two-step audit that protects against OAuth-connect friction) and expansion mechanics for NRR. The phased content calendar and the proprietary-data content moat.

**4. AEGIS_REMEDIATION_PLAYBOOKS.md (connective tissue).**
The fix-it guidance for every risk signal. Each playbook does three jobs: it renders in-app and in alerts, it publishes as an SEO recovery guide, and it is the page the free audit converts on. Contains the playbook schema, the content principles, and the full Meta v1 library, one playbook per engine signal, with a coverage table proving every alert is actionable.

**5. AEGIS_OAUTH_SECURITY.md (credential hardening).**
How customer ad-account tokens are obtained, scoped, stored, used, and retired. The token store is the product's single biggest security liability, so this document is written SOC-2-shaped from day one. Covers the threat model, the Meta token strategy (system user tokens preferred for agencies so monitoring does not break during a team change), least-privilege scopes (read-only, never `ads_management`), the OAuth flow with `appsecret_proof`, envelope encryption at rest, token lifecycle and failure handling (a lost token raises a risk alert, it is not a silent no-op), runtime access controls, rate-limit safety, and the implementation checklist.

**6. AEGIS_DATA_MODEL.md (executable schema).**
The data model as a full Prisma schema, plus the raw SQL Prisma cannot express. Reflects the locked decisions: shared schema with Postgres Row-Level Security, hybrid HealthSnapshot writes (a row on change and on a periodic heartbeat, with current state denormalized onto the account), and tiered retention that archives cold data but never touches outcome-labeled rows. Includes the RLS policies and tenant-context GUC, monthly partitioning of the snapshot table, the outcome-labeling job that turns monitoring history into v2 training data, the de-identified TrainingSample store that survives offboarding, soft-delete with a hard-purge path, and the index strategy.

**7. AEGIS_INFRA.md (hosting and setup).**
Where and how to run Aegis. Recommends splitting the SEO-critical Next.js frontend onto Vercel from the persistent backend (NestJS API, BullMQ workers, Postgres, Redis) on Railway, with the encryption master key in a managed KMS, cold archive on Cloudflare R2, DNS on Cloudflare, secrets in Doppler or Infisical, email on Resend, and observability via Sentry plus a heartbeat monitor for the dead-man's-switch. Includes the rationale for the split over all-Railway or a full cloud, an ordered setup checklist, the cost shape, the scaling path, and the security touchpoints.

**8. AEGIS_RISK_REGISTER.md (read this first).**
The number-one focus area, ahead of building. The risks to success, ranked, each with a cheap time-boxed experiment and an explicit kill-or-proceed threshold. Two risks are existential and gate the build: whether Meta will grant the scopes (App Review), and whether suspensions actually have detectable leading signals (the early-warning premise). Defines a two-week validation sprint to resolve both before any significant build spend, and a go/no-go framework. The asymmetry is the argument: two weeks of validation versus up to a year building on a false premise.

**9. AEGIS_VALIDATION_KIT.md (run the sprint).**
The executable materials behind the two build gates. For App Review: the pre-submission checklist, the minimal-scope justifications, the use-case narrative, the compliance-not-evasion framing guardrail, the screencast shot list, reviewer instructions, and the rejection-avoidance checklist. For the early-warning premise: who to recruit and an outreach template, a non-leading interview script with per-suspension capture, the community post-mortem coding rubric and table, a self-monitoring probe, and how to combine the three sources into one verdict against the thresholds.

---

## How the documents interlock

The system has one shared taxonomy running through three documents. This convergence is the central design idea and the reason the whole thing is cheap to run and hard to copy.

```
                        AEGIS_RISK_ENGINE_SPEC
                        (defines the signals)
                                 |
              signal.remediationId points to a playbook
                                 |
                                 v
                     AEGIS_REMEDIATION_PLAYBOOKS
                     (one playbook per signal)
                          /            \
            published as SEO page       linked from the alert
                    |                          |
                    v                          v
            AEGIS_GTM_SEO              AEGIS_SPEC (alerting)
        (programmatic pages built     (engine + workers fire
         from the same taxonomy)       alerts that link out)
```

Add one signal to the engine and you get, at near-zero marginal cost, a new alert, a new playbook, and a new SEO page targeting that exact problem. The risk catalog, the content map, and the fix-it library are the same list.

---

## Recommended reading order

1. This index.
2. AEGIS_RISK_REGISTER.md, because two existential risks gate the build and should be resolved before reading the rest as a plan to execute.
3. AEGIS_SPEC.md, for the full picture and the roadmap.
4. AEGIS_RISK_ENGINE_SPEC.md, for the core.
5. AEGIS_REMEDIATION_PLAYBOOKS.md, to see what the engine points at.
6. AEGIS_GTM_SEO.md, for how it all reaches customers.

---

## Build sequence (where to actually start)

1. **Run the two-week validation sprint first (AEGIS_RISK_REGISTER.md).** Resolve the two existential gates, App Review and the early-warning premise, before committing build spend. Submitting App Review here also starts that clock.
2. **Kick off Meta App Review and Business Verification on day zero** (this is part of the sprint). Multi-week, gates all public auth, and is the critical-path dependency for the entire product.
3. Foundation: monorepo, auth, Meta OAuth, encrypted credentials (AEGIS_SPEC Phase 0).
4. Free audit MVP with risk engine v1, Meta only (Phase 1). The thin SEO and audit test here also validates risks R3, R4, and R5.
5. Paid continuous monitoring, alerting, billing (Phase 2).
6. SEO and playbook content shipping in parallel from Phase 1 onward.

---

## Decisions already locked (do not relitigate)

- **Positioning:** survival and account-health, never performance optimization.
- **Platform order:** Meta first, Google in Phase 3, TikTok in Phase 4.
- **Free tier:** point-in-time only, near-zero cost to serve, email-gated, anonymous until upgrade. Two-step audit with an email pre-assessment before OAuth.
- **Slack alerts:** Agency tier and above, to preserve an upgrade reason.
- **Pricing:** per-account tiers, because expansion to NRR above 100 percent is the single biggest lever on the exit multiple.
- **Detection:** webhook-first, polling as fallback, to protect the 90 percent margin.
- **Engine:** fail closed (never green on incomplete data), explainable always, interpretable models only in v2 (no opaque deep nets).
- **Data:** capture HealthSnapshot with the full signal vector from launch, even though v2 scoring is a year out. The labeled outcome dataset is the long-term moat and only accrues with time.
- **Credentials:** read-only scopes only, never `ads_management`. System user tokens preferred for Agency and Scale so monitoring survives a team change. Envelope encryption at rest, tokens never logged, lost-token equals a risk alert not a silent failure.
- **Data model:** shared schema with Postgres RLS for tenant isolation. Hybrid HealthSnapshot writes (change plus heartbeat) with current state denormalized onto the account. Tiered retention that never archives or downsamples outcome-labeled rows.
- **Churn-proof training set:** outcome-labeled snapshots are retained in de-identified form after a customer offboards. The offboarding job extracts the feature vector and label into a no-identifier `TrainingSample` store (dropping rawPayload and all identifiers), then hard-purges the tenant rows. De-identification must be genuinely irreversible and verified against the platform developer terms.
- **Infra:** split hosting. Vercel for the Next.js SEO surface, Railway for the API, workers, Postgres, and Redis. Encryption master key in a managed KMS, not a secret manager. Cloudflare DNS and R2 archive, Resend email, Sentry plus a heartbeat monitor. Keep everything portable, no cloud lock-in.
- **Validation gates the build:** no significant build spend until the two existential risks pass the two-week validation sprint, App Review approval and the early-warning premise (AEGIS_RISK_REGISTER.md). Either failing outright is a stop.
- **Exit:** run the sale process in Year 3 at roughly 2.5M to 3M ARR while growth is still steep, not at maximum absolute ARR.

---

## Gaps not yet documented

These are known and intentional, not oversights. Next candidates to write:

1. **Meta App Review submission package.** The clock starts here. This is the highest-priority gap because it gates everything else.

---

## Naming

Aegis is a placeholder. Final naming and domain are an open decision in AEGIS_SPEC.md.
