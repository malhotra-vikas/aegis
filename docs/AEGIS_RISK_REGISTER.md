# Aegis Risk Register and Validation Plan

> **This is the number-one focus area, ahead of building.** Two of these risks could make the entire build wasted effort. The register's job is to gate the build, not to sit beside it. The rule: validate the two existential assumptions before committing real build months, with cheap, time-boxed experiments that produce a clear go or no-go.
>
> Honesty note: the goal of each experiment is to try to kill the idea cheaply. A passed experiment is earned confidence; a failed one is a year saved.

---

## 1. The gate

Two assumptions are load-bearing and unproven. If either is false, the rest of the plan changes or dies:

- **R1, App Review:** Meta must actually grant the scopes for an external-facing product that monitors Meta's own enforcement.
- **R2, the early-warning premise:** suspensions must have detectable, API-visible leading signals often enough for "we warn you before it happens" to be true.

**No significant build spend until R1 and R2 are resolved.** Everything else can validate in parallel or during early build.

---

## 2. Register summary

| ID | Risk | Category | Likelihood | Impact | Owner | Gates build? |
|----|------|----------|-----------|--------|-------|--------------|
| R1 | Platform dependency, immediate form is App Review | Existential | Medium | Fatal | Founder | Yes |
| R2 | Early-warning premise may be partly false | Existential | Medium | Fatal | Founder | Yes |
| R3 | SEO channel eroding under AI search | Existential | Medium-High | Severe | Founder | Partial |
| R4 | Audit converts on fear; most accounts are green | Serious | High | Severe | Founder | No |
| R5 | Onboarding trust paradox | Serious | Medium-High | Moderate | Founder | No |
| R6 | Moat is back-loaded; early product is copyable | Serious | High | Moderate | Founder | No |
| R7 | Security execution through a distributed team | Serious | Medium | Fatal | Eng lead | No |
| R8 | Founder focus across the portfolio | Standard | Medium | Severe | Founder | No |
| R9 | Churn | Standard | Medium | Moderate | Founder | No |

---

## 3. Risk detail, experiments, and thresholds

### R1. Platform dependency (App Review is the immediate form)
**Risk:** the whole company is gated on Meta approving an app whose purpose is to monitor Meta's own enforcement, requesting `business_management` and page scopes for external businesses. Meta may refuse, attach conditions, or later narrow the readable fields.

**Experiment (cost: time, about 1 to 2 weeks elapsed):**
1. Before review, confirm the data is even readable: with `ads_read` on your own ad account, pull `account_status`, `disable_reason`, and ad `effective_status`. Verify the v1 signal fields exist and return.
2. Create the Meta app, complete Business Verification, request the minimal scope set (`ads_read`, `business_management`, page-read), and submit for review with a clear, honest use-case description and a screencast of read-only health monitoring.

**Proceed if:** the scopes are granted for external businesses. **Pivot if:** `business_management` is denied (operate on the reduced `ads_read`-only signal set and reposition). **No-go if:** Meta refuses ad-account read access for third-party monitoring outright.

**Mitigation:** multi-platform early so no single approval is fatal; connector abstraction; a documented reduced-scope fallback product.

---

### R2. The early-warning premise
**Risk:** the core promise is "we catch the flag before the suspension," but many Meta disables are sudden and AI-driven with no prior reviewable signal. If most disables have no detectable leading indicator, the promise is hollow and the product degrades into "tells you what you could have checked yourself."

**Experiment (cost: low; 1 to 2 weeks, runs in parallel with R1):**
1. **Agency interviews (8 to 12):** for their last several suspensions, was there any prior signal (pending review, spend limit, disapproval cluster, payment or verification flag), or was it instant? Quantify the share with a leading signal.
2. **Community post-mortem mining:** read 50 to 100 recent suspension threads on r/PPC and r/FacebookAds, classify each as "sudden" versus "preceded by a detectable signal."
3. **Self-monitoring:** instrument your own and a few friendly accounts now, logging status daily, to catch real transitions over the following weeks.

**Proceed if:** roughly 40 percent or more of disables show an API-visible leading signal within the catalog. The product is valuable. **Reframe if:** between 20 and 40 percent; keep early warning as one feature but lead positioning with fastest detection plus recovery. **Pivot hard if:** under 20 percent; the thesis shifts from prevention to recovery and prevention-hygiene, and messaging must change before build.

**Mitigation:** the playbooks and the recovery and hygiene value already exist independent of early warning, so even a reframe leaves a real product. The register's point is to learn the true mix before promising the wrong thing.

---

### R3. SEO channel erosion
**Risk:** the acquisition engine is SEO-first, and AI search is compressing click-through on exactly the informational and recovery queries targeted. SEO also takes 12 to 18 months to ramp, most of the runway to revenue.

**Experiment (cost: low; signal at 60 to 90 days, so start during early build):**
1. **SERP check now:** for the top target queries, observe whether AI overviews already dominate and whether tool and transactional queries still surface clickable results.
2. **Thin live test:** publish 2 to 3 pillar pages and 15 to 20 programmatic pages early, measure real click-through and audit-start rate over 60 to 90 days.
3. **Parallel channel test:** run a small community presence in parallel and compare audit signups from community versus SEO.

**Proceed if:** the live pages convert visits to audit starts at a rate consistent with the funnel math (about 5 percent session to free signup). **Rebalance if:** AI overviews eat the clicks; shift weighting toward community, integrations, affiliate, and paid on the highest-intent transactional terms.

**Mitigation:** do not single-thread on SEO; the GTM already lists secondary channels. Validate the mix early rather than assuming organic.

---

### R4. The audit converts on fear, and most accounts are green
**Risk:** a free audit that returns green to the majority has no conversion trigger. Monitoring is a painkiller sold to people not currently in pain.

**Experiment (cost: low; uses the R3 thin test traffic):**
1. Measure the distribution of audit verdicts (green / amber / red) and the conversion rate of each.
2. A/B the green-account verdict: a plain "you are safe" versus an insurance framing ("safe today, accounts change overnight, here is what protects you").
3. Measure re-audit drift conversion from the lifecycle email.

**Proceed if:** enough audits return non-green, or the insurance framing on green accounts converts at a viable rate. **Adjust if:** green accounts never convert; target higher-baseline-risk segments first (restricted verticals, high-velocity scalers, recently-flagged accounts) where amber and red are common.

**Mitigation:** segment targeting plus insurance framing plus the re-audit drift trigger.

---

### R5. Onboarding trust paradox
**Risk:** you ask a nervous advertiser to hand a token to an unknown tool whose pitch is that platforms are dangerous, and connecting an app is itself a ban-risk signal.

**Experiment (cost: low; same thin-test funnel):**
1. Measure the audit-start to OAuth-connect drop. That number is the trust tax.
2. A/B the two-step audit (email pre-assessment before OAuth) versus single-step; measure lift.
3. Test trust signals on the connect screen (read-only badge, "we never write," a security explainer, the system-user option); measure connect rate.

**Proceed if:** connect rate meets the funnel assumption (about 50 percent of audit starts). **Rework if:** below that; lead with read-only and least-privilege as the headline, and make the no-connect educational tier the primary capture.

**Mitigation:** read-only scope is a genuine trust asset, so lead with it; the two-step audit; the system-user framing.

---

### R6. The moat is back-loaded
**Risk:** the defensibility is the labeled outcome dataset, which does not exist for a year or two. Early on you are a rules engine over largely public knowledge, replicable by a funded team in roughly a quarter.

**Steps (analysis, not an experiment):**
1. Model the data-accrual curve: how many monitored account-months and disable events are needed for a useful v2 model, and when you hit that at projected growth.
2. Accept the clone risk honestly and name the interim moats: SEO and brand authority, distribution, the content library, integrations. Decide which compounds fastest and lean on it for years one and two.

**Mitigation:** race on execution, positioning, and brand early; capture labeled data from day one (already locked); treat the content and SEO authority as the interim moat.

---

### R7. Security execution through a distributed team
**Risk:** you store other businesses' access tokens. One leaked token, one misconfigured RLS policy, one key in a log, and the brand is finished with possible liability. The spec is sound; the risk is execution discipline across a distributed team.

**Steps (build into the process, not optional):**
1. Automated cross-tenant RLS test suite as a CI gate: attempt cross-tenant reads, assert denial on every tenant table.
2. Secret scanning and a token-redaction lint on every commit; log scanning to prove no token ever appears in logs.
3. Envelope-encryption correctness test.
4. A third-party security review or pen test before public launch. Low cost relative to the risk it retires.

**Mitigation:** the security-doc controls plus automated enforcement plus external review. Treat the CI gates as non-negotiable, not aspirational.

---

### R8. Founder focus (standard, tracked)
**Risk:** this needs consistent feeding before product-market fit and it is one of several things in the portfolio.
**Step:** decide honestly how much consistent weekly time this gets, and whether a partner or operator is needed. Underfunding attention is a quiet way to fail.

### R9. Churn (standard, tracked)
**Risk:** modeled, with about 40 percent annual logo churn as the weak point.
**Step:** instrument cohort retention and NRR from the first paying customer. The mitigation is the per-account expansion model pushing NRR above 100 percent; watch it from day one rather than discovering it late.

---

## 4. The validation sprint (two weeks, before build spend)

| Day range | Action | Resolves |
|-----------|--------|----------|
| 1 to 2 | Read your own account fields with `ads_read`; confirm signals are accessible | R1 (data accessibility) |
| 1 to 3 | Create app, Business Verification, submit App Review with minimal scopes | R1 (approval) |
| 1 to 10 | Run 8 to 12 agency interviews; mine 50 to 100 community post-mortems | R2 |
| 2 to 14 | Stand up self-monitoring on your own and friendly accounts | R2 (ongoing signal) |
| Throughout | SERP check on target queries | R3 (initial read) |

App Review may run longer than two weeks on Meta's side; submitting early starts that clock while R2 is being answered in parallel.

---

## 5. Go / no-go framework

- **Both R1 and R2 pass:** proceed to the full build with confidence. The remaining risks are execution and are managed during build.
- **R1 conditional (reduced scopes):** proceed only with the repositioned, reduced-scope product, and re-validate the value of the narrower signal set.
- **R2 reframes (20 to 40 percent):** proceed, but rewrite the positioning and the playbooks' emphasis toward detection and recovery before building the funnel.
- **Either R1 or R2 fails outright:** stop. Do not build. Reassess whether a different wedge (pure recovery service, prevention-hygiene tool, or a different platform) is worth pursuing.

The cost of this sprint is roughly two weeks and a handful of conversations. The cost of skipping it is up to a year of build on a false premise. That asymmetry is the entire argument for doing it first.

---

## 6. Cross-references

- Executable materials for this sprint (App Review package, interview script, coding rubric): AEGIS_VALIDATION_KIT.md
- App Review and scopes: AEGIS_OAUTH_SECURITY.md, AEGIS_SPEC.md
- The early-warning signals and `assessable`: AEGIS_RISK_ENGINE_SPEC.md
- SEO funnel math and channels: AEGIS_GTM_SEO.md
- RLS and security controls under test: AEGIS_DATA_MODEL.md, AEGIS_OAUTH_SECURITY.md
- NRR and churn model: AEGIS_GTM_SEO.md, AEGIS_SPEC.md
