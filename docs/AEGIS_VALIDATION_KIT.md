# Aegis Validation Kit

> Runnable materials for the two build-gating experiments in AEGIS_RISK_REGISTER.md. Part A is the Meta App Review submission package (R1). Part B is the early-warning premise toolkit (R2). These are drafts to tailor, not guarantees; the point is to make both experiments executable this week.

---

# Part A. R1, Meta App Review submission package

## A1. Pre-submission checklist
Do not submit until all are true:
- [ ] Privacy policy URL is live and describes what data is read, why, how it is stored, and how it is deleted.
- [ ] Data deletion instructions URL is live (how a user disconnects and purges their data).
- [ ] Business Verification is complete (legal name, tax id, address, consistent documentation).
- [ ] App is configured with the Marketing API product added.
- [ ] Valid HTTPS OAuth redirect URI is live (needs the API domain from AEGIS_INFRA.md).
- [ ] The demo build visibly exercises every requested scope (reviewers reproduce this).
- [ ] Requested scopes are the minimal set only: `ads_read`, `business_management`, `pages_read_engagement`, `pages_show_list`. No `ads_management`.

## A2. App configuration summary
- App type: Business.
- Products: Marketing API.
- Permissions requested: `ads_read`, `business_management`, `pages_read_engagement`, `pages_show_list`.
- Access pattern: read-only. The app never creates, edits, pauses, or deletes any ad, campaign, asset, or business setting.

## A3. Scope justifications (draft, submit per permission)

**ads_read.** The app reads the advertiser's ad account status, ad delivery and review status, and account-level standing indicators in order to detect compliance and account-health risks and surface them to the account's own owner. Access is strictly read-only. The app does not create, modify, pause, or delete any ads or campaigns.

**business_management.** The app reads Business-Manager-level account status and asset relationships to detect business-level restrictions and account-linkage risks that affect the advertiser's standing. Access is read-only. The app does not modify business settings, users, or assets.

**pages_read_engagement and pages_show_list.** The app reads the status of Pages connected to the advertiser's ad account to detect Page-level restrictions that can propagate to the ad account's standing. Access is read-only.

## A4. Use-case narrative (draft)
Aegis helps advertisers and agencies monitor the health and compliance standing of their own Meta ad accounts. It reads account status, ad review status, payment and verification signals, and connected-Page status to identify issues that put an account at risk, and it notifies the account owner so they can correct issues and remain compliant with Meta's advertising policies. The product is read-only and operates only on accounts the user explicitly connects and owns or manages. Data is encrypted at rest, never shared, and deleted on disconnect. The goal is healthier, more policy-compliant advertisers who maintain good standing.

## A5. Framing guardrail (important)
Frame everything as helping advertisers maintain compliance and good standing. This aligns with Meta's own interest in compliant advertisers. Never frame the product, in the narrative, the screencast, or marketing visible to reviewers, as helping advertisers evade, bypass, circumvent, or get around enforcement. That framing risks immediate rejection and can flag the app negatively. The honest and approvable position is compliance and health monitoring, not evasion.

## A6. Screencast shot list
Meta reviewers require a screen recording that visibly demonstrates each requested permission in use. Keep it short and clear, every scope exercised on camera:
1. Landing page, click Connect Meta account.
2. The OAuth dialog showing the requested permissions; log in as the provided test user; grant.
3. The app reads and displays the connected ad account's status and health, demonstrating `ads_read`.
4. The app displays business-level status and linkage, demonstrating `business_management`.
5. The app displays connected-Page status, demonstrating the Page scopes.
6. The resulting value: the health score, the flagged issues, an example alert.
7. The disconnect and data-deletion flow.

## A7. Reviewer test instructions (draft)
Provide step-by-step reproduction with a working test login: where to click to connect, the test credentials, and what the reviewer will see at each step, mapped to each permission. Make it trivial for the reviewer to see every scope doing exactly what the justification claims.

## A8. Common rejection reasons to pre-empt
- Justification too vague or generic. Be specific about what each scope reads and why.
- A permission is requested but not demonstrably used in the screencast. Every scope must appear in the demo.
- Missing or weak privacy policy or data-deletion URL.
- Data use or storage unclear. State encryption, no sharing, deletion on disconnect.
- Any hint of evasion framing (see A5).

---

# Part B. R2, early-warning premise validation

## B1. What we are learning and the thresholds
The single question: what share of Meta ad account disables show an API-visible leading signal (pending review, spend limit, disapproval cluster, payment flag, verification request, Page restriction) before the disable, versus arriving with no observable precursor.

- 40 percent or more with a leading signal: proceed, the early-warning thesis holds.
- 20 to 40 percent: proceed but reposition toward detection and recovery.
- Under 20 percent: pivot the thesis before building the funnel.

Run all three sources below, then combine into one verdict (B5).

## B2. Agency interviews (8 to 12)

### Who and where
Agency owners and media buyers who actively manage Meta ad accounts, ideally any who have had suspensions. Find them in r/PPC and r/FacebookAds, paid-media Slack and Discord communities, LinkedIn, and your own network.

### Outreach message (template)
"I am researching how Meta ad account suspensions actually happen, not selling anything. If you manage Meta ads, could I ask you 15 minutes about your experience with account suspensions and what you saw before they happened? Happy to share what I learn across everyone I talk to."

### Interview script
Use past, specific behavior, not hypotheticals. Do not lead toward the answer you want.

1. How many Meta ad accounts do you manage, and for how long?
2. In the last 12 months, how many suspensions or disables have you dealt with across those accounts?
3. Think about the most recent one. Walk me through what happened, from before it to after. (Let them talk. Do not prompt for warning signs yet.)
4. Before the account was disabled, was there anything different about it at all? (Open. Still do not list signals.)
5. Only after they answer 4, probe specific signals one at a time: Did you ever see it go into a review or pending state? A spending limit? A cluster of ad disapprovals? A payment or billing problem? A request to verify the business? Any issue on a connected Page?
6. If yes to any: how long before the disable did that appear? Where did you see it (Account Quality, an email, the dashboard)?
7. If no: did it feel instant and out of nowhere?
8. What did the suspension cost you, in lost revenue, time, or a client relationship?
9. What do you currently do or use to watch for this, if anything?

Avoid: "Would you pay for early warning?" and "Wouldn't it be useful if...". These bias toward yes. Question 8 and 9 measure real pain and current behavior, which is stronger evidence than stated willingness to pay.

### Capture per suspension
For each suspension recounted, record: leading signal present (yes / no / unsure), which signal, time-to-disable, where observed, cost, current tooling.

## B3. Community post-mortem coding

### Sources and search terms
r/PPC, r/FacebookAds, r/PPCMarketing, and paid-media Facebook groups. Search: "account suspended", "account disabled", "ad account banned", "business manager restricted", "circumventing systems".

### Sample
50 to 100 recent suspension post-mortems where the author describes what happened.

### What counts as a leading signal
A leading signal is something observable through the API catalog before the disable: a pending or review status, a spend limit, a disapproval cluster, a payment flag, a verification request, or a Page restriction. "Sudden" means no observable precursor was described. Be strict: if the post is ambiguous, code it "unsure," do not inflate the leading-signal rate.

### Coding table (one row per post)
| source_url | platform | suspension_type | leading_signal (none/pending/spend_limit/disapprovals/payment/verification/page/other) | api_visible (yes/no/unsure) | time_to_disable | restricted_category (y/n) | notes |
|---|---|---|---|---|---|---|---|

### Analysis
Count rows where `api_visible = yes` over the total coded. That ratio is the community estimate of the leading-signal rate. Map to the B1 thresholds.

## B4. Self-monitoring probe
Connect your own and a few friendly accounts and log the status fields daily (account status, pending review, disapprovals, payment, verification, connected-Page status). Record any state transitions and whether a disable followed. This is slower but gives direct, unbiased evidence over the following weeks and doubles as the first real test of the connector.

## B5. Combining into one R2 verdict
You will have three estimates of the leading-signal rate: interviews, community coding, and (later) self-monitoring. Weight interviews and community coding for the initial go/no-go since self-monitoring needs time. If interviews and community coding both land in the same band, that is your verdict. If they conflict, widen the sample on the cheaper source (community coding) until it stabilizes, and treat the more conservative number as the decision input. Then apply the B1 thresholds.

---

## Cross-references
- The risks, thresholds, and sprint timeline: AEGIS_RISK_REGISTER.md
- Scopes and token model behind the App Review: AEGIS_OAUTH_SECURITY.md
- The signal catalog the leading signals map to: AEGIS_RISK_ENGINE_SPEC.md
- The domain and webhook URLs the App Review needs live: AEGIS_INFRA.md
