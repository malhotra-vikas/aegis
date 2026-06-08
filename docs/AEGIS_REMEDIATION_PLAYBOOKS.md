# Aegis Remediation Playbook Library

> The connective tissue across the system. Each playbook is referenced by `remediationId` in the risk engine, linked from alerts, and published as an SEO recovery guide that the free audit converts on. One artifact, three jobs.
>
> **Accuracy contract:** the steps below reflect Meta's current (2026) recovery, appeal, verification, and payment processes as verified during research. Exact UI paths and labels change. Every playbook carries a `lastVerified` field, and the team must re-verify paths against the live Meta Help Center and Account Quality dashboard before publishing each one. Never publish a stale path.

---

## 1. How playbooks are used

```
Risk engine detects signal  ->  signal.remediationId  ->  Playbook
                                                            |
                    +---------------------------------------+---------------------------------------+
                    |                                       |                                       |
            In-app / alert body                     Published SEO page                      Free-audit result panel
           (summary + immediate steps)         (full guide, ranks for targetQuery)        (gated full steps drive upgrade)
```

A playbook only earns its place if it is genuinely useful on its own. Thin or generic content fails all three jobs at once: it does not retain, does not rank, and does not convert.

---

## 2. Playbook schema

```ts
type Intent = 'recovery' | 'prevention';

interface PlaybookStep {
  order: number;
  action: string;        // imperative, concrete
  detail?: string;       // optional clarification
}

interface AppealGuidance {
  where: string;         // entry point, e.g. Account Quality dashboard
  how: string;           // what to submit
  tone: string;          // the appeal-writing guidance
  firstAttemptOdds?: string;
}

interface Playbook {
  id: string;            // matches risk-engine remediationId exactly
  title: string;
  linkedSignals: string[];
  platform: 'meta' | 'google' | 'tiktok';
  category: Category;
  intent: Intent;
  targetQuery: string;   // primary SEO query
  slug: string;          // URL slug
  summary: string;       // 1 to 2 sentences, shown in the alert body
  whatItMeans: string;
  commonCauses: string[];
  immediateSteps: PlaybookStep[];
  appeal?: AppealGuidance;
  expectedTimeline: string;
  prevention: string[];
  monitoringHook: string; // the conversion bridge to continuous monitoring
  lastVerified: string;   // ISO date checked against live Meta docs
}
```

---

## 3. Content principles

1. **Calm and factual.** The reader is often panicking. The tone that works mirrors the tone that wins appeals: factual, professional, concise, no emotional language, focused on compliance and corrective action.
2. **Actionable first.** Lead with what to do right now, then explain. The panic searcher wants steps, not theory.
3. **Never guarantee reinstatement.** State realistic odds and timelines. Overpromising destroys trust and creates liability. Use "increases the likelihood," never "will restore."
4. **Bridge to monitoring honestly.** The `monitoringHook` explains how continuous monitoring would have caught this earlier or prevents recurrence. It is a real benefit, stated plainly, not a hard sell.

---

## 4. Meta v1 playbook library

> Google and TikTok playbooks ship with their adapters in later phases. The schema is identical; only the catalog grows.

---

### 4.1 `recovery.meta.disabled`
- **Title:** Meta ad account disabled: how to recover it
- **Linked signals:** meta.account_disabled
- **Category:** status | **Intent:** recovery
- **Target query:** "meta ad account disabled how to fix"
- **Slug:** /meta/ad-account-disabled
- **Summary:** Your ad account has been disabled. Active campaigns are paused and billing is stopped. Recovery is possible through the appeal process, but acting carefully on the first attempt matters.

**What it means:** Meta has restricted the account's ability to run or manage ads. All active ads halt, billing stops, and editing is blocked. The disable notification usually cites a general cause.

**Common causes:** ad policy violations, suspicious payment activity, link to a previously disabled account, automation or rate-limit flags, page-level restriction pulling in the account.

**Immediate steps:**
1. Read the exact disable notification in Account Quality. It usually names the general cause.
2. Do not create a new account to get around it. That escalates enforcement and can trigger circumventing-systems action.
3. Audit every active ad, landing page, and payment method for the cited issue before appealing.
4. Confirm business verification is complete and documentation is consistent (legal name, tax ID, address).
5. File one careful appeal through Account Quality. A weak first appeal lowers the odds of every later one.

**Appeal:** submit via the Account Quality dashboard. Keep it factual, professional, and concise, focused on compliance and the corrective steps taken. Avoid emotional language. Many initial denials reverse on a well-documented second attempt, so a first denial is not the end.

**Expected timeline:** initial review commonly 24 to 72 hours, longer if verification is incomplete.

**Prevention:** monitor account status continuously so a flag is caught before it becomes a disable; keep verification current; never share payment methods across accounts.

**Monitoring hook:** Most disables are preceded by a reviewable state or a rising pattern of disapprovals. Continuous monitoring surfaces that earlier, when you can still act, instead of after billing has already stopped.

**lastVerified:** verify before publish.

---

### 4.2 `prevent.meta.pending_review`
- **Title:** Meta ad account under review: what to do before it becomes a suspension
- **Linked signals:** meta.account_pending_review
- **Category:** status | **Intent:** recovery
- **Target query:** "facebook ad account pending review"
- **Slug:** /meta/account-pending-review
- **Summary:** Your account is in a risk-review state. This is the window before a possible disable and the single best moment to act.

**What it means:** Meta's risk system has flagged the account for review. Spending may be limited or paused. This state often precedes a disable, which is exactly why catching it matters.

**Common causes:** sudden spend changes, login or device anomalies, recent ownership or team changes, payment-method risk, traffic to sensitive destinations.

**Immediate steps:**
1. Pause aggressive changes. Do not make rapid budget edits or bulk updates while under review.
2. Verify business verification is complete and documentation matches.
3. Review recent ads and landing pages against policy and correct anything borderline.
4. Confirm the payment method is valid and not linked to any restricted account.
5. Avoid logins from VPNs or unusual devices, which the security system can read as compromise.

**Expected timeline:** reviews vary; the account can resolve back to active or move to disabled, so the actions above are time-sensitive.

**Prevention:** keep change velocity reasonable, verification current, and destinations clean.

**Monitoring hook:** This state is the highest-value early warning the product detects. Continuous monitoring alerts you the moment the account enters review, turning a silent countdown into an actionable window.

**lastVerified:** verify before publish.

---

### 4.3 `prevent.meta.grace`
- **Title:** Meta ad account limited or in a grace state: how to stabilize it
- **Linked signals:** meta.account_grace_period
- **Category:** status | **Intent:** prevention
- **Target query:** "facebook ad account spending limited"
- **Slug:** /meta/account-limited
- **Summary:** Your account is in a limited or grace state. Spend or functionality is restricted. Resolve the underlying flag before it escalates.

**What it means:** The account is operational but constrained, often a soft enforcement step before harder action.

**Common causes:** unresolved policy issues, partial verification, payment irregularities.

**Immediate steps:**
1. Identify the constraint in Account Quality.
2. Resolve any outstanding policy disapprovals.
3. Complete verification if incomplete.
4. Confirm payment is current and valid.

**Expected timeline:** typically resolves once the underlying issue is fixed.

**Prevention:** clear disapprovals promptly, keep verification and payment in good standing.

**Monitoring hook:** A grace state is a clear signal that the account is on a downward track. Monitoring flags the transition so you act before the next step down.

**lastVerified:** verify before publish.

---

### 4.4 `policy.meta.disapproval`
- **Title:** Facebook ads disapproved: causes and how to fix them
- **Linked signals:** meta.ad_disapprovals_minor, meta.ad_disapprovals_major
- **Category:** policy | **Intent:** recovery
- **Target query:** "facebook ad disapproved how to fix"
- **Slug:** /meta/ads-disapproved
- **Summary:** One or more ads were disapproved. A few are normal; a cluster signals an account-level standing risk.

**What it means:** Specific ads failed policy review. Isolated disapprovals are routine, but a rising count raises the account's overall risk and can contribute to enforcement.

**Common causes:** misleading claims, prohibited or restricted content, personal-attribute targeting issues, low-quality or mismatched landing pages.

**Immediate steps:**
1. Open each disapproved ad and read the specific policy cited.
2. Fix the creative or landing page to match the policy, then resubmit.
3. For an editorial issue, a quick text change is often enough; for a category issue, the fix is structural.
4. If you believe the disapproval is wrong, request review, but only with a clear compliance rationale.

**Expected timeline:** ad-level reviews are commonly 24 to 48 hours.

**Prevention:** pre-check creatives and landing pages against policy before launch; ensure landing pages have SSL, a privacy policy, terms, real contact information, and an About page, and that the page matches the ad's promise.

**Monitoring hook:** A single disapproval is noise; a trend is a warning. Monitoring tracks disapproval velocity and alerts when it crosses from normal into account-risk territory.

**lastVerified:** verify before publish.

---

### 4.5 `policy.meta.restricted`
- **Title:** Advertising restricted categories on Meta: rules and how to stay compliant
- **Linked signals:** meta.restricted_category_active
- **Category:** policy | **Intent:** prevention
- **Target query:** "meta restricted category ads policy"
- **Slug:** /meta/restricted-categories
- **Summary:** You are running ads in a restricted category. These carry elevated suspension risk and increasingly require pre-approval.

**What it means:** Categories such as crypto, gambling, supplements, dropshipping, and adult content are restricted and often require pre-emptive whitelisting. Running them without approval is a high-probability ban path.

**Common causes:** running restricted products without the required authorization or whitelisting.

**Immediate steps:**
1. Confirm whether your category requires pre-approval or whitelisting and complete it before scaling.
2. Ensure creatives and landing pages meet the category-specific rules exactly.
3. If already flagged, pause the affected ads and resolve authorization before relaunching.

**Expected timeline:** authorization processes vary by category.

**Prevention:** treat restricted-category compliance as a prerequisite, not an afterthought; keep authorization current.

**Monitoring hook:** Monitoring flags restricted-category exposure as a standing risk so you address authorization before enforcement, not after.

**lastVerified:** verify before publish.

---

### 4.6 `payment.meta.failure`
- **Title:** Facebook ad account payment failed: how to fix it fast
- **Linked signals:** meta.payment_failure
- **Category:** payment | **Intent:** recovery
- **Target query:** "facebook ad account payment failed"
- **Slug:** /meta/payment-failed
- **Summary:** A payment failed. This pauses delivery and, left unresolved, can trigger account holds.

**What it means:** Meta could not charge the funding source. Campaigns pause and repeated failures escalate to account-level risk.

**Common causes:** insufficient funds, expired card, mismatched billing details, repeated failed attempts.

**Immediate steps:**
1. Update or replace the payment method in billing settings.
2. Clear any outstanding balance.
3. Confirm billing details match the card exactly.
4. Avoid adding a card previously linked to a disabled account, which can trigger immediate suspension.

**Expected timeline:** delivery typically resumes shortly after a successful charge.

**Prevention:** keep a valid backup payment method; monitor for failures so a lapse does not compound.

**Monitoring hook:** Payment failures often go unnoticed until campaigns stop. Monitoring alerts on the first failure, before it cascades into a hold.

**lastVerified:** verify before publish.

---

### 4.7 `payment.meta.method`
- **Title:** Facebook ads payment method risk: how to avoid a billing flag
- **Linked signals:** meta.payment_method_risk
- **Category:** payment | **Intent:** prevention
- **Target query:** "facebook ads payment method declined"
- **Slug:** /meta/payment-method-risk
- **Summary:** Your funding source carries risk signals that can contribute to enforcement.

**What it means:** A high-risk-region or mismatched payment method raises the account's overall risk profile even when it is currently charging successfully.

**Common causes:** billing details that do not match the business, payment instruments associated with high-risk patterns, cards previously tied to flagged accounts.

**Immediate steps:**
1. Use a payment method whose details match the verified business.
2. Remove any instrument linked to a previously disabled account.
3. Keep one valid backup method on file.

**Expected timeline:** not time-critical unless combined with other signals.

**Prevention:** maintain clean, matching, business-aligned payment details.

**Monitoring hook:** Monitoring surfaces payment-method risk as a standing factor so it can be cleaned up before it combines with other signals into enforcement.

**lastVerified:** verify before publish.

---

### 4.8 `linkage.meta.shared`
- **Title:** Ad account disabled because of a linked account: what to do
- **Linked signals:** meta.linked_disabled_account
- **Category:** linkage | **Intent:** recovery
- **Target query:** "facebook ad account disabled linked account"
- **Slug:** /meta/linked-account-risk
- **Summary:** Your account appears connected to a previously disabled account, one of the strongest enforcement triggers.

**What it means:** Meta tracks payment methods and identity across its platform. A shared link to a banned account can pull the current account down with it.

**Common causes:** reusing a payment method, identity, or business asset from a disabled account.

**Immediate steps:**
1. Identify and remove any shared payment method tied to a disabled account.
2. Separate business assets, pages, and identities from the flagged history.
3. If disabled, appeal through Account Quality with documentation establishing the account's independence and legitimacy.

**Expected timeline:** linkage cases can take longer to review than ad-level issues.

**Prevention:** never reuse payment methods or assets across accounts; keep clean separation.

**Monitoring hook:** Linkage risk is invisible from inside a single account view. Monitoring flags shared-asset exposure so you separate cleanly before it cascades.

**lastVerified:** verify before publish.

---

### 4.9 `automation.meta.throttle`
- **Title:** Ad account flagged for automation: how to pace API activity safely
- **Linked signals:** meta.api_rate_pattern_risk
- **Category:** automation | **Intent:** prevention
- **Target query:** "facebook ad account disabled too many changes"
- **Slug:** /meta/automation-risk
- **Summary:** Your account's change patterns look automated or abusive to Meta's risk system, even on the official API.

**What it means:** High-velocity changes (rapid budget edits, bulk updates, scripts without business logic) can read as abuse and trigger enforcement, including on the official Marketing API.

**Common causes:** a recent automation rollout, an agency takeover, or a script making many changes in a short window.

**Immediate steps:**
1. Pace API-driven changes; add rate-limit-aware throttling to any automation.
2. Smooth out change patterns so they resemble normal human cadence.
3. If flagged, appeal with documentation of the automation tool and the throttling fix applied.

**Expected timeline:** depends on enforcement level.

**Prevention:** throttle all automation; avoid bursts of changes; ensure any AI or scripted integration paces requests.

**Monitoring hook:** Monitoring tracks your change velocity and warns when it approaches patterns the risk system penalizes, before a flag lands.

**lastVerified:** verify before publish.

---

### 4.10 `verification.meta.incomplete`
- **Title:** Facebook business verification: why it matters and how to complete it
- **Linked signals:** meta.business_verification_incomplete
- **Category:** verification | **Intent:** prevention
- **Target query:** "facebook business verification"
- **Slug:** /meta/business-verification
- **Summary:** Your business verification is incomplete or inconsistent, which lengthens suspensions and raises baseline risk.

**What it means:** Accounts with missing or mismatched verification face longer suspension periods and lower reinstatement odds. Complete, matching documentation is a foundational trust signal.

**Common causes:** unverified business, mismatched legal name, tax ID, or address.

**Immediate steps:**
1. Complete business verification in Business Settings.
2. Ensure the legal name, tax ID, and address match official documentation exactly.
3. Resolve any inconsistencies between the business profile and the submitted documents.

**Expected timeline:** verification review varies.

**Prevention:** keep verification complete and documentation consistent at all times.

**Monitoring hook:** Incomplete verification is a silent baseline risk. Monitoring flags it before an enforcement event turns it into a prolonged outage.

**lastVerified:** verify before publish.

---

### 4.11 `page.meta.restricted`
- **Title:** Facebook page restricted and ad account affected: how to recover
- **Linked signals:** meta.linked_page_restricted
- **Category:** page | **Intent:** recovery
- **Target query:** "facebook page restricted ad account disabled"
- **Slug:** /meta/page-restricted
- **Summary:** A connected page was restricted for organic violations, and the restriction is affecting the ad account.

**What it means:** Page-level enforcement for community-standards or organic-content issues can pull a connected ad account into restriction.

**Common causes:** organic content violations, repeated user reports, community-standards issues on the page.

**Immediate steps:**
1. Appeal at the page level first; the page restriction is usually the root cause.
2. Review and remove organic content that violates community standards.
3. Once the page is restored, address any residual ad-account flags.

**Expected timeline:** depends on page-level review.

**Prevention:** keep connected pages compliant with community standards, not just ad policy.

**Monitoring hook:** Ad-account owners often miss page-level restrictions until ads stop. Monitoring connects the two so you see the real root cause immediately.

**lastVerified:** verify before publish.

---

### 4.12 `circumvention.meta`
- **Title:** Meta circumventing-systems suspension: what it means and how to address it
- **Linked signals:** meta.circumventing_systems
- **Category:** circumvention | **Intent:** recovery
- **Target query:** "meta circumventing systems suspension"
- **Slug:** /meta/circumventing-systems
- **Summary:** This is one of Meta's most severe enforcement actions, applied at the advertiser level rather than the ad level, often with limited explanation.

**What it means:** Meta has identified behavior it reads as bypassing ad review or evading enforcement. It frequently triggers Business-Manager-level restrictions, payment-method flags, and domain blacklisting that affect future attempts, and it can spread to related accounts.

**Common causes:** patterns Meta interprets as evading enforcement, including creating new accounts to bypass a prior action, or destination-experience issues the system treats as deceptive.

**Immediate steps:**
1. Do not create new accounts or assets to get around it; that is the exact behavior this enforcement targets and it escalates.
2. Address systemic issues, not individual ads, including the destination and landing experience.
3. Appeal through Account Quality, but expect a longer, less transparent process.
4. Document legitimacy and corrective measures thoroughly, since first appeals are rejected more often here.

**Appeal:** through Account Quality. Reviews commonly run 7 to 14 days rather than the 24 to 48 hours typical of ad-level reviews, with lower first-attempt success. Keep submissions factual and compliance-focused.

**Expected timeline:** longer than standard reviews, frequently 7 to 14 days or more.

**Prevention:** never attempt to circumvent a prior action; keep destinations and account behavior clean and consistent.

**Monitoring hook:** Circumventing-systems enforcement is holistic and hard to reverse. Monitoring the upstream signals that lead to it is the only practical defense, since recovery after the fact is slow and uncertain.

**lastVerified:** verify before publish.

---

## 5. Coverage check against the engine

Every Meta v1 signal has a playbook:

| Signal | Playbook |
|--------|----------|
| meta.account_disabled | recovery.meta.disabled |
| meta.account_pending_review | prevent.meta.pending_review |
| meta.account_grace_period | prevent.meta.grace |
| meta.ad_disapprovals_minor / _major | policy.meta.disapproval |
| meta.restricted_category_active | policy.meta.restricted |
| meta.payment_failure | payment.meta.failure |
| meta.payment_method_risk | payment.meta.method |
| meta.linked_disabled_account | linkage.meta.shared |
| meta.api_rate_pattern_risk | automation.meta.throttle |
| meta.business_verification_incomplete | verification.meta.incomplete |
| meta.linked_page_restricted | page.meta.restricted |
| meta.circumventing_systems | circumvention.meta |

No signal is left without an actionable playbook, which is the requirement for every alert to be actionable.

---

## 6. Open decisions

1. How much of each full playbook to gate behind the email/upgrade wall versus show free. Recommendation: show whatItMeans and the first one or two immediate steps free, gate the full step list, appeal guidance, and prevention. This serves SEO (enough content to rank and help) while preserving a conversion reason.
2. Whether to localize playbooks. Defer; English-first matches the GTM.
3. Versioning playbooks alongside the scoring model so historical alerts link to the guidance that was current when they fired. Recommendation: yes, version them.
