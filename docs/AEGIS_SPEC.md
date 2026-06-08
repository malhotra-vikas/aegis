# Aegis: Ad Account Survival Layer

> Working codename. Naming is TBD. This document is the product and technical spec plus the build roadmap. It is written to drop into the repo root as the canonical reference for the dev team.

---

## 1. Thesis and positioning

**One line:** Aegis keeps ad accounts alive. It is the survival and standing-monitoring layer for advertisers and agencies, Meta-first.

**What it is:** Continuous, automated monitoring of ad account health and suspension risk across Meta and Google, with early warning before a flag becomes a suspension, plus remediation guidance.

**What it is NOT:** A performance-optimization dashboard. We do not compete on ROAS, CPC, CTR, or budget pacing. Those are commoditized, owned by incumbents (Optmyzr, Swydo, Adzooma, Adriel, adAlert.io) and given away free by the platforms themselves. We deliberately stay out of that fight.

**Why it is defensible:** The platform is the threat, not a free first-party competitor. Meta and Google will never ship "we are about to suspend you, here is how to avoid it." That gap is structural and permanent. The risk taxonomy plus the historical signal data we accumulate becomes the moat.

**Primary customer:** Agencies managing multiple client accounts. A client suspension is a churned client, so willingness to pay is high, ACV scales with account count, and they self-discover through professional communities and high-intent search.

---

## 2. Core value loop (PLG)

```
Free one-click audit  ->  Risk score + flagged issues revealed  ->  "Your account is at risk"  ->  Upgrade to continuous protection  ->  Add more accounts (expansion / NRR)
```

The free tier manufactures demand for the paid tier. A point-in-time audit ends on a risk verdict, which is the exact moment of intent to convert. Performance monitoring would not create that craving, which is why it is excluded.

---

## 3. Tiers and feature spec

| Tier | Price | Accounts | Core capability |
|------|-------|----------|-----------------|
| Free | $0 | 1 | One-click point-in-time health audit, manual re-run, risk score + issue list |
| Solo | $39/mo | up to 3 | Continuous monitoring, email alerts, basic remediation playbooks |
| Agency | $149/mo | up to 20 | Slack alerts, multi-account dashboard, team seats, historical risk tracking |
| Scale | $449/mo | up to 75 | All of the above, priority polling cadence, API access, white-label reports |

Pricing is per-account-tier on purpose. It is the expansion mechanic: agencies add client accounts over time, which drives net revenue retention above 100% even with logo churn. NRR is the single highest-leverage number for the exit multiple, so the pricing model must protect it from day one.

### 3.1 Free audit (the wedge)

- One-click OAuth connect (Meta first).
- Pull a point-in-time snapshot: account_status, disable_reason, ad-level approval/effective_status counts, payment method risk signals, business verification state, page-restriction linkage, recent policy-flag history where exposed.
- Compute a 0 to 100 risk score with a small number of weighted, explainable factors.
- Render a verdict: green / amber / red, with the specific flagged issues listed.
- Hard CTA at the verdict: "This is a snapshot. Accounts change daily. Turn on continuous monitoring to catch a flag before it becomes a suspension."
- **Cost discipline:** point-in-time and manual re-run only. Near-zero cost to serve at rest. No background polling on free accounts. This is what keeps the free tier from poisoning the COGS and the exit margin.

### 3.2 Paid (continuous survival)

- Scheduled polling plus webhook subscriptions for real-time field-change detection.
- Flag detection before suspension: status transitions, new disapprovals, payment failures, verification lapses, automation/rate-limit risk patterns.
- Alerts to email and Slack, deduped and severity-ranked.
- Historical risk tracking and trend (improving vs degrading standing).
- Remediation playbooks mapped to each detected cause.
- Multi-account dashboard for agencies, team seats, per-client views.

---

## 4. Risk engine (core IP)

The risk engine is the product. Everything else is plumbing.

### 4.1 Signal categories (Meta)

Grounded in documented disable causes, in rough priority order:

1. **Policy violations.** Ad-level disapprovals, effective_status transitions, restricted-category exposure (crypto, supplements, gambling, dropshipping, adult).
2. **Payment risk.** Failed payments, expired cards, mismatched billing, high-risk-region payment methods.
3. **Linked-account risk.** Account associated with a previously disabled account, shared payment methods across accounts.
4. **Automation / rate-limit risk.** API call patterns Meta's risk system reads as abusive (rapid budget changes, bulk updates). This reuses MetaAdsSafe rate-limiting logic directly.
5. **Verification / trust signals.** Incomplete business verification, identity mismatches.
6. **Page-linkage risk.** Connected page restricted for organic violations, which pulls in the ad account.
7. **Circumventing-systems exposure.** The most severe class. Business-Manager-level restrictions, domain blacklisting.

### 4.2 Scoring

- Each signal carries a weight and a confidence.
- Risk score = weighted aggregation, normalized 0 to 100, bucketed into green / amber / red.
- Every score is **explainable**: the UI always shows which signals drove it. Black-box scores do not convert and do not build trust.
- v1 is rules + weights. v2 layers in learned weights once we have enough historical outcome data (accounts we monitored that did vs did not get suspended). That outcome dataset is the long-term moat and should be captured from day one even before it is used.

### 4.3 Detection strategy

- **Webhooks (preferred):** Subscribe to Ad Account field-change notifications for real-time detection. Lowest cost, fastest signal.
- **Polling (fallback + coverage):** Scheduled jobs for signals not covered by webhooks. Cadence by tier (Scale gets tighter intervals). Rate-limit-aware throttling is mandatory, both to respect API limits and because aggressive polling is itself a ban signal.

---

## 5. Data sources and integrations

| Platform | Phase | Key signals | Mechanism |
|----------|-------|-------------|-----------|
| Meta Marketing API | 1 | account_status, disable_reason, ad effective_status / approval, payment, verification, page linkage | Webhooks (Ad Account Trigger) + polling |
| Google Ads API | 3 | customer AccountStatus, ad PolicySummary (approval_status, policy_topic_entries) | Polling (Google change events where available) |
| TikTok Ads API | 4 | account status, ad review status | Polling |

**Meta prerequisites:** App Review and Business Verification are required before public users can authenticate, with `ads_read` / `ads_management` scopes. This is a multi-week gate and must start in Phase 0, not when the MVP is ready. It is the critical-path dependency for the entire product.

---

## 6. System architecture

Stack matches the established house stack for consistency with MetaAdsSafe and BookingBlues.

```
Monorepo (pnpm + Turborepo, TypeScript strict)
├── apps/
│   ├── web        Next.js (App Router) — marketing site + free audit + app dashboard
│   └── api        NestJS — REST/tRPC API, OAuth, auth, billing
├── packages/
│   ├── workers    NestJS standalone + BullMQ — polling, webhook ingest, scoring jobs
│   ├── risk-engine  Pure TS scoring library (platform-agnostic core + per-platform adapters)
│   ├── connectors   Meta / Google / TikTok API clients (rate-limit-aware)
│   ├── db         Prisma schema + client
│   └── shared     Types, config, crypto utils
```

**Infrastructure**

- **DB:** PostgreSQL (Prisma). pgvector available if we later embed policy text for similarity-based remediation matching, not required for v1.
- **Queue / cache:** Redis + BullMQ for scheduled polling, webhook processing, alert fan-out, retries with backoff.
- **Credential storage:** OAuth tokens encrypted at rest with AES-256-GCM, envelope encryption, key in platform secret manager. Tokens never logged. This is the single biggest security liability in the product; treat it accordingly.
- **Billing:** Stripe (per-tier subscriptions, metered seat/account add-ons for expansion).
- **Email:** Resend (alerts + transactional).
- **Hosting:** Railway (api, web, workers as separate services; managed Postgres + Redis).

**Why NestJS over FastAPI here:** BullMQ is a Node library and the worker layer is the heart of the system, so keeping API and workers in one TypeScript runtime avoids a language split and lets the risk-engine package be shared across api and workers without duplication.

---

## 7. Data model (core entities)

- **Organization** — billing entity, owns subscription and seats.
- **User** — belongs to org, role (owner/admin/member).
- **ConnectedAccount** — a platform ad account under monitoring. Holds platform, external id, display name, monitoring status, current risk score/bucket.
- **Credential** — encrypted OAuth token bundle, linked to ConnectedAccount, with refresh metadata.
- **HealthSnapshot** — time-series row per account per check. Raw pulled fields + computed score. This table is the outcome dataset; never prune aggressively.
- **RiskSignal** — individual detected signal on a snapshot (category, severity, weight, explanation, raw evidence).
- **Alert** — generated notification (account, severity, signals, dedupe key, channels, sent state).
- **AlertChannel** — org/account config (email addresses, Slack workspace/channel).
- **Subscription** — Stripe linkage, tier, account quota, seat count.
- **AuditResult** — free-tier point-in-time result (may exist before signup; keyed to email for conversion tracking).

---

## 8. Alerting

- Channels: email (Solo+), Slack (Agency+).
- Severity: info / warning / critical, mapped from risk bucket transitions and specific high-severity signals (e.g. any circumventing-systems signal is immediately critical).
- **Dedupe:** key on account + signal-category + day, so a persistent flag does not spam. Alert on transition (new flag, worsening bucket), not on steady state.
- **Actionability:** every alert links to the matching remediation playbook. An alert that says "you have a problem" without "here is what to do" does not retain.

---

## 9. Non-functional requirements

- **Security:** encrypted tokens, least-privilege scopes, no token logging, audit log on credential access. SOC 2 is not needed for MVP but the controls should be SOC-2-shaped from the start because a buyer at exit will diligence this hard.
- **COGS target:** $3 to $8 per paying account per month (API calls + storage + alert delivery) against $150 blended ARPA, i.e. 90%+ gross margin. Webhook-first detection is what protects this; polling everything would blow the margin.
- **Rate-limit safety:** all connectors throttle. Our own polling must never become a ban signal for the accounts we protect. This is non-negotiable and is the same discipline as MetaAdsSafe.
- **Reliability:** missed detection is the cardinal failure. Jobs must retry with backoff, webhook ingest must be idempotent, and there must be monitoring on the monitor (dead-man's-switch on polling freshness per account).

---

## 10. Roadmap

Tied to the ARR-to-flip model. Target: run a sale process in Year 3 at roughly $2.5M to $3M ARR with steep trailing growth and a clean single-thesis story.

### Phase 0 — Foundation and unblocking (Weeks 0 to 4)
- Start Meta App Review + Business Verification immediately. Critical path, multi-week, blocks everything.
- Monorepo scaffold, CI, TypeScript strict, lint/format.
- Auth, Organization/User model, Meta OAuth flow, AES-256-GCM credential storage.
- Connectors package skeleton with rate-limit-aware Meta client.

### Phase 1 — Free audit MVP, Meta only (Weeks 4 to 12)
- Risk engine v1 (rules + weights, explainable) for Meta.
- One-click audit flow: connect, snapshot, score, verdict, CTA.
- Marketing landing page + SEO foundation targeting suspension-intent queries ("meta ad account suspended," "facebook ad account disabled," "why was my ad account banned").
- HealthSnapshot capture begins (start accumulating the outcome dataset now).
- **Milestone:** free audit live, capturing emails and audit results. No revenue yet, this is the funnel.

### Phase 2 — Paid continuous monitoring, Meta (Months 3 to 6)
- Webhook subscriptions (Ad Account Trigger) + scheduled polling via BullMQ.
- Continuous flag detection, alerting (email + Slack), dedupe, severity.
- Stripe billing, Solo + Agency tiers, account quotas.
- Multi-account dashboard, team seats.
- Remediation playbooks v1.
- **Milestone:** first revenue. Target end-Y1 ~100 paying accounts, ~$180K ARR.

### Phase 3 — Google Ads + agency depth (Months 6 to 12)
- Google Ads connector (AccountStatus, PolicySummary, approval_status, policy_topic_entries).
- Risk engine Google adapter.
- Agency features: per-client views, white-label reports, Scale tier, API access.
- Expansion mechanics: in-product prompts to add more client accounts (drives NRR).
- SEO content engine scaled (programmatic pages per error/cause).
- **Milestone:** target end-Y2 ~$1.2M ARR, NRR trending above 100%.

### Phase 4 — Breadth and retention hardening (Year 2 to 3)
- TikTok connector.
- Risk engine v2: learned weights from accumulated suspension outcomes (the moat activates).
- Historical risk analytics, benchmarking ("your standing vs category").
- Retention/NRR instrumentation, churn-cause analysis, win-back flows.
- **Milestone:** target end-Y3 ~$3M ARR.

### Phase 5 — Exit prep (Year 3 into 4)
- Founder-light operations: documented runbooks, on-call rotation handled by the offshore team, support deflection via playbooks and self-serve.
- Metrics hygiene: clean cohort retention, NRR, gross margin, CAC payback, all diligence-ready.
- Data room: architecture docs, security controls, IP assignment clean (background IP carve-outs preserved per your standard).
- Run the sale process while growth is still steep. Do not wait to maximize absolute ARR.

---

## 11. Build sequencing rationale

Meta-first because the suspension pain is most acute there and the appeal process is the most opaque, so the willingness to pay is highest. Free audit first because it is the funnel and it is cheap to serve, so it can run wide open while paid monitoring is still being built. Webhooks before broad polling because the margin depends on it. Google after Meta because it widens TAM without changing the core thesis.

---

## 12. Key risks and mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Platform restricts API access or changes fields | High | Multi-platform early so no single channel sinks the business; webhook + polling redundancy; abstract connectors behind a stable internal interface |
| Storing OAuth tokens / ToS exposure | High | Encrypted at rest, least-privilege scopes, clear data-use disclosure, legal review of platform developer terms before public launch |
| Our polling itself triggers account flags | High | Strict rate-limit-aware throttling (MetaAdsSafe logic), webhook-first |
| Free-to-paid conversion underperforms | Medium | Engineer the free audit to reveal real risk, not a clean bill of health; hard CTA at the verdict moment |
| Logo churn high (the model's weak point) | Medium | Per-account pricing + expansion to push NRR over 100%; remediation playbooks to prove ongoing value |
| Crowded performance-monitoring category bleeds into our lane | Medium | Hold positioning discipline: survival, not optimization. Never broaden into ROAS |

---

## 13. Open decisions

1. Naming and domain.
2. Free audit: anonymous (email-gated, audit before signup) vs signup-required. Anonymous lowers funnel friction and captures more top-of-funnel; signup-required gives a cleaner account model. Recommendation: email-gated anonymous audit, account creation at upgrade.
3. Slack alerts at Solo vs Agency only. Recommendation: Agency+ to preserve a real upgrade reason.
4. Whether to expose an MCP server (per your MetaAdsSafe pattern) as a Scale-tier feature for advertisers who want programmatic access. Defer to Phase 4.
