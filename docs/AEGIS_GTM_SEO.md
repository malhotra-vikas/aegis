# Aegis: GTM and SEO Funnel

> The distribution engine for a PLG, founder-light, build-to-sell SaaS. The entire motion is self-serve and must not depend on the founder selling. Near-zero paid CAC is a design constraint, not an aspiration, because it is what keeps the margin and the exit math intact.

---

## 1. Strategy in one page

- **Primary channel: SEO**, specifically high-intent, panic-driven suspension and recovery search. Incumbents chase performance keywords (ROAS, PPC, budget) and leave the survival queries underserved. That gap is the wedge.
- **Conversion engine: the free audit.** Every channel routes to it. It ends on a risk verdict, which is the moment of intent.
- **The flywheel: one taxonomy, three jobs.** The risk-engine signal catalog, the SEO content map, and the remediation playbooks are the same list. Write a recovery guide for `meta.account_pending_review` once: it ranks in search, it is the page the audit converts on, and it is the playbook the alert links to. This convergence is the reason the funnel is cheap and defensible.
- **Secondary channels:** value-first community presence, the Slack app directory, and an affiliate/referral loop. All low-touch.
- **Paid: surgical only.** Retargeting and the highest-intent transactional terms as a test lever, never the engine.

---

## 2. The funnel and its targets

Stages, tied to the ARR model (free signups: Y1 3,000, Y2 18,000, Y3 36,000, Y4 54,000; free-to-paid 4 percent; blended ARPA $150/mo).

```
Organic session
   -> audit started
   -> audit completed = email captured + account connected = "free signup"
   -> paid conversion (4%)
   -> account expansion (NRR > 100%)
```

### 2.1 Assumed funnel rates (to validate, not forecast)
- session -> audit start: 10 percent
- audit start -> audit complete: 50 percent (OAuth connect is the friction point)
- So session -> free signup: 0.10 * 0.50 = 0.05, i.e. 5 percent

### 2.2 Organic traffic required (arithmetic)
- Y2: 18,000 / 0.05 = 360,000 sessions/year = 30,000/month
- Y3: 36,000 / 0.05 = 720,000 sessions/year = 60,000/month
- Y4: 54,000 / 0.05 = 1,080,000 sessions/year = 90,000/month

These are realistic organic targets for a programmatic-SEO site in a high-intent niche on a two-to-three-year ramp. They are the leading indicators that matter in Y1, well before revenue.

### 2.3 Friction reducer
OAuth connect is the biggest drop point. Add a two-step audit: an email-gated educational pre-assessment (no connect, a few self-reported questions plus account-id lookup where possible) that captures the email first, then the full OAuth-based audit. This captures the lead even when the user hesitates to connect, and lets lifecycle email pull them back to complete it.

---

## 3. SEO engine (the core)

### 3.1 Intent thesis
Suspension searches are transactional and emotional. Someone searching "meta ad account suspended" at 11pm is losing money right now and wants a fix immediately. That intent converts far better than informational performance queries, and the incumbents are not seriously contesting it.

### 3.2 Keyword clusters
**Panic / recovery (highest priority, ship first):**
- "meta ad account suspended", "facebook ad account disabled how to fix", "google ads account suspended", "why was my ad account banned", "facebook business manager restricted", "circumventing systems meta", "ad account disabled appeal", "facebook ads account disabled no reason"

**Prevention:**
- "how to avoid facebook ad account ban", "meta ad account health check", "prevent google ads suspension", "facebook ad account safety"

**Tool / diagnostic intent (closest to purchase):**
- "ad account monitoring tool", "facebook ad account health checker", "meta account quality monitor", "ad account suspension alert"

**Comparison / category:**
- "best ad account monitoring tool", versus-incumbent pages, "[competitor] alternative"

### 3.3 Programmatic SEO (the scalable layer)
Templated pages generated from the risk-engine taxonomy. One page per (platform x cause x error/reason). The signal catalog literally is the content map.

- "Meta ad account disabled: [disable_reason]" for each documented disable reason
- "Facebook ads [policy topic] violation: what it means and how to fix it"
- "[restricted category] ads on Meta: rules and how to stay compliant" (crypto, supplements, gambling, dropshipping, adult)
- "Google Ads disapproved: [policy_topic_entry]" (Phase 3)

Each programmatic page embeds the free audit as its conversion unit and links to the matching remediation playbook. Hundreds to low thousands of long-tail pages, each targeting a specific high-intent query the incumbents ignore.

### 3.4 Pillar / editorial
Deep, genuinely useful guides per platform: enforcement explained, the appeal process step by step, recovery playbooks. These are the remediation playbooks the risk engine references, published as content. Write once, serve product and SEO simultaneously.

### 3.5 Tool-led SEO
The free audit is itself a rankable, linkable asset. Target "free facebook ad account health check" and similar. Free tools attract backlinks, which lift the whole domain.

### 3.6 Technical SEO
- Next.js SSG/SSR, fast Core Web Vitals, programmatic sitemap.
- Structured data: FAQ, HowTo, SoftwareApplication schema on the relevant page types.
- Clean internal linking: programmatic pages link up to pillars and across to the audit.

---

## 4. The content-product flywheel

```
Risk-engine signal  ->  remediation playbook  ->  published recovery guide (SEO)  ->  ranks for the cause query
        ^                                                                                      |
        |                                                                                      v
   alert links to it  <-  free audit converts on it  <-  user lands from search on the exact problem they have
```

Every new signal added to the engine creates a new page and a new playbook at near-zero marginal cost. The product's knowledge graph is the content factory. No competitor focused on performance dashboards has this asset.

---

## 5. Community and distribution (non-SEO, still low-touch)

- **Reddit:** r/PPC, r/FacebookAds, r/PPCMarketing, r/agency, r/digital_marketing. Value-first answers to "my account got banned" posts, with the free audit as a natural assist. Never spam.
- **Facebook groups and media-buyer Discord/Slack communities:** where paid-social operators live and where suspension panic surfaces daily.
- **X paid-media circles and LinkedIn agency owners:** authority-building, not direct response.

Mechanic: be the most useful answer to suspension posts. The free audit is inherently shareable in that exact context. This needs a light human touch early, then can be partly systematized with saved responses and a community-monitoring workflow.

---

## 6. Integrations and partnerships

- **Slack app directory:** the alerting integration doubles as a discovery channel. Listing in the directory is passive acquisition.
- **Affiliate / referral loop:** agencies refer agencies. Low-touch, compounds, fits founder-light. Launch in Phase 3 once conversion is proven.
- **Agency tool marketplaces and partner directories:** passive listings where buyers already browse.

---

## 7. Conversion mechanics (free to paid)

- The **verdict is the conversion event.** Amber or red ends on "this is a snapshot, accounts change daily, turn on continuous monitoring to catch a flag before it becomes a suspension."
- **Email-gated anonymous audit** (resolved spec decision): account creation happens at upgrade, email captured at audit.
- **Lifecycle email (Resend):** audit result, then "your standing can change overnight" nudge, then re-audit prompt showing drift, then upgrade. Re-audit drift is the strongest paid trigger because it makes the ongoing risk concrete.
- **In-product teaser:** free users see continuous-monitoring value gated behind upgrade.
- Self-serve Stripe checkout, clear pricing page, no demo required.

---

## 8. Expansion mechanics (NRR, highest leverage)

- Per-account pricing makes expansion the default growth path.
- Agency onboarding flow nudges connecting the full client roster, not one account.
- In-product prompts when an agency is near a tier ceiling.
- Account-add is one click and billed automatically. NRR above 100 percent is the single biggest lever on the exit multiple, so the entire onboarding should bias toward connecting more accounts.

---

## 9. Content calendar by phase

**Phase 1 (free audit launch, Meta):**
- 5 to 8 pillar pages (Meta enforcement, appeals, recovery, prevention, the free health-check tool page).
- First programmatic batch: the top 30 to 50 highest-intent Meta cause/reason pages.
- Get indexed, set up Search Console, baseline rankings.

**Phase 2 (paid monitoring live):**
- Scale programmatic Meta pages into the hundreds.
- Publish the full remediation playbook library as recovery guides (product and content converge here).
- Start community presence and the saved-response workflow.

**Phase 3 (Google Ads added):**
- Replicate the entire SEO engine for Google Ads keywords and causes.
- Comparison and alternative pages versus incumbents.
- Launch the affiliate program.

**Phase 4 (TikTok + data moat):**
- TikTok keyword and cause expansion.
- Proprietary-data content (see section 10).

---

## 10. The data-content moat (Phase 4 onward)

Once HealthSnapshot outcome data accrues, publish aggregate insights no competitor can write: real disable-rate data by signal and category, "the annual ad account suspension report," "accounts with [signal X] are N percent more likely to be suspended within 14 days." This is uniquely defensible, highly linkable, press-worthy content that cements Aegis as the authority on account survival and feeds backlinks into the whole SEO engine. It is the same outcome dataset that powers v2 scoring, doing double duty as a marketing asset.

---

## 11. Metrics and instrumentation

Track per stage, weekly:
- Leading (Y1, pre-revenue): indexed pages, ranking keywords, organic sessions, audit starts, audit completion rate, email captures.
- Mid-funnel: free signups, free-to-paid conversion, time-to-convert.
- Revenue: paying accounts, blended ARPA, MRR/ARR, logo churn, NRR, CAC payback (should be near-immediate given organic acquisition).
- Channel attribution: which page types and which communities drive conversions, so effort concentrates on what works.

The Y1 scoreboard is organic traffic and audit completions, not revenue. Hold the line on that, because revenue is a lagging output of the funnel filling.

---

## 12. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| SEO concentration / Google algorithm dependence | Build community, Slack directory, affiliate, and email as real secondary channels so the business is not single-threaded on organic |
| Platform brand sensitivity (Meta dislikes a product positioned around surviving Meta) | Position as compliance and account-health, not adversarial; frame as helping advertisers stay within policy |
| Community spam backlash | Strict value-first rule, never lead with the product, contribute genuinely useful answers |
| OAuth-connect friction caps the funnel | Two-step audit with email-gated pre-assessment before the connect step |
| Programmatic pages flagged as thin content | Each page must carry genuine, specific remediation value; the playbook content prevents thinness |

---

## 13. Open decisions

1. Two-step audit (email pre-assessment then OAuth) vs single-step OAuth audit. Recommendation: two-step, to protect the funnel from connect-friction drop.
2. Whether to gate the free audit result behind email or show result then ask for email to enable monitoring. Recommendation: show a partial verdict, gate the full issue list and remediation behind email. Captures the lead at peak intent.
3. Affiliate commission structure and timing. Defer specifics to Phase 3, launch only after conversion is proven.
