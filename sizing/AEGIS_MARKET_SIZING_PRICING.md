# Aegis Market Sizing and Pricing

> Sizes the opportunity across the two core segments, solo advertisers and agencies, and sets pricing against the value of a prevented suspension rather than against competitors. Numbers are directional estimates built on cited public data with assumptions flagged; the assumptions are the levers to refine, not the market size, which is not the constraint.

---

## 1. Segments

- **Solo:** individual advertisers, single in-house marketers, and small businesses managing 1 to 3 of their own ad accounts. Largest by count, lowest value per customer, highest churn.
- **Agency:** firms managing many client ad accounts. A client suspension is a churned client, so willingness to pay is high and scales with account count. This is the wedge.
- **Mid-market in-house** (high-spend brands, DTC) sits between the two on price sensitivity and is folded into the agency-style tiers by account count. Secondary target.

---

## 2. Market inputs (grounded)

- Meta has over 10 million active advertisers and ran about $200.97 billion in ad revenue in 2025. Most advertisers are small businesses or solos.
- Promethean Research counts over 50,000 digital agencies in the US and Canada and over 179,000 worldwide, with 88 percent under 50 full-time employees and the average under 10. Other estimates of US digital marketing agencies range from 40,000 to 60,000-plus.
- The narrower NAICS "advertising agencies" definition is about 15,000 firms in the US.
- Competitor monitoring and reporting tools price roughly $69 (Swydo) to $299-plus (Optmyzr) per month, focused on performance, not survival.

The tiny-shop skew (most agencies under 10 people) means pricing must work for small agencies, not just enterprises. That shapes the tier design below.

---

## 3. TAM (directional, not a decision input)

All Meta, Google, and TikTok advertisers who could pay for account-health monitoring: tens of millions globally. At a plausible $500 to $1,800 per account per year, TAM is in the multiple billions. It is too broad to act on. Ignore it for decisions.

---

## 4. SAM by segment (bottom-up)

### 4.1 Agency SAM
Initial reachable market is English-speaking agencies that actively run paid media (US, Canada, UK, Australia).

- Start from about 50,000 US and Canada digital agencies, add UK and Australia: roughly 65,000 English-speaking core.
- Share actively managing paid social or PPC (the ones who feel suspension pain): assume about 50 percent, so roughly 32,500 agencies.
- Agency blended ACV: a 70/30 mix of Agency tier ($1,788/yr) and Scale tier ($5,388/yr):
  - 0.70 x 1,788 = 1,251.60
  - 0.30 x 5,388 = 1,616.40
  - 1,251.60 + 1,616.40 = 2,868.00, call it about $2,900/yr.
- **Agency SAM (English core):** 32,500 x 2,900 = $94,250,000, about $94M per year.
- **Agency SAM (global):** about 90,000 paid-media agencies worldwide x $2,900 = about $261M per year.

### 4.2 Solo SAM
- Of 10M-plus Meta advertisers, the share serious enough to pay to protect an account: assume about 3 percent, roughly 300,000 to 350,000.
- Solo ACV: $39/mo with a blend of monthly and annual, about $430/yr.
- **Solo SAM:** 350,000 x 430 = $150,500,000, about $150M per year (global, directional).
- Heavy caveat: solo is low ACV, high churn, high support load. It is real money on paper but the wrong place to start.

### 4.3 Combined SAM
On the order of $250M to $400M per year reachable across both segments. Ample relative to the goal.

---

## 5. SOM (the number that matters)

What is realistically capturable in the 3 to 4 year flip window, weighted toward agencies, per the ARR model in AEGIS_SPEC.md and AEGIS_GTM_SEO.md:

- End Year 3: about 1,700 paying accounts at a blended $150/mo, roughly $3.0M ARR.
- End Year 4: roughly $5.5M ARR.

That Year 3 figure is well under 0.2 percent of the reachable agency-plus-solo base. The constraint is distribution and retention, never market size. This is the whole point of the sizing exercise: the market is large enough that execution, not TAM, decides the outcome.

---

## 6. Segment attractiveness

| Dimension | Solo | Agency |
|-----------|------|--------|
| Value per customer (ACV) | Low (~$430/yr) | High (~$2,900/yr) |
| Willingness to pay | Moderate | High (a ban is a lost client) |
| Churn | High | Lower, stickier |
| Support load | High | Moderate |
| Discoverability / self-serve | Good (search) | Good (search + communities) |
| Expansion / NRR potential | Low | High (add client accounts) |
| Priority | Secondary | **Primary wedge** |

Lead with agencies. Serve solos because they convert from the same free-audit funnel, but do not optimize for them.

---

## 7. Pricing recommendations

### 7.1 Price against the value of a prevented suspension, not against competitors
A Meta suspension freezes an advertiser's entire spend and, for an agency, can lose a client whose lifetime value is in the thousands to tens of thousands. The Agency tier at $1,788 per year protects the whole client roster. One prevented churned client pays for years of subscription. That asymmetry, not competitor price, sets the ceiling. The product is priced low relative to the value it protects, which is the right posture early and leaves room to raise.

### 7.2 Recommended tiers
| Tier | Price | Accounts | Target | Notes |
|------|-------|----------|--------|-------|
| Free | $0 | 1 | Funnel | Point-in-time audit, email-gated |
| Solo | $39/mo | up to 3 | Solo, SMB | Continuous monitoring, email alerts |
| Agency | $149/mo | up to 20 | Small and mid agencies | Slack alerts, multi-account, team seats. The core tier |
| Scale | $449/mo | up to 75 | Larger agencies | Priority cadence, API, white-label reports |
| Enterprise | Custom | 75+ | Large agencies, holding cos | White-label, SSO, custom terms |

The Enterprise tier is new versus the earlier four and exists to capture large agencies and holding companies without leaving money on the table at the top.

### 7.3 Per-account model and NRR
Price by account count on purpose. It is the expansion engine: agencies add client accounts over time, pushing net revenue retention above 100 percent even with logo churn. NRR is the single biggest lever on the exit multiple, so the pricing model must reward expansion. Add per-account overage within tiers so growth is automatic, not a manual upsell.

### 7.4 Annual billing
Offer annual at roughly two months free (about 17 percent off). Annual plans churn materially less and pull cash forward, both of which improve the metrics a buyer underwrites.

### 7.5 Competitor anchoring
Aegis sits mid-band against the $69 to $299-plus monitoring tools, but on a different value axis (survival, not performance optimization), which carries higher willingness to pay. $149 for the Agency tier is defensible and arguably underpriced for the value. Hold pricing power in reserve.

### 7.6 What not to do
- Do not price by ROAS or performance metrics. That re-enters the commoditized optimization category.
- Do not race to the bottom to win solos. Cheap pricing attracts the churny, high-support segment and depresses the margin a buyer cares about.
- Do not bundle a free continuous-monitoring tier. Keep free point-in-time only, so the painkiller stays paid.

---

## 8. How pricing produces the model

The tier mix yields the blended ARPA the ARR model assumes. With a paying mix of about 40 percent Solo, 45 percent Agency, 15 percent Scale:
- 0.40 x 39 = 15.60
- 0.45 x 149 = 67.05
- 0.15 x 449 = 67.35
- 15.60 + 67.05 + 67.35 = 150.00

Blended ARPA = $150.00/mo = $1,800/yr per paying account, which is the figure used throughout the ARR projections. As the mix shifts toward agencies over time, blended ARPA rises, which is upside to the model.

---

## 9. Open decisions

1. Exact Free-to-Solo boundary: whether Free allows 1 account or a one-time multi-account audit. Recommendation: 1 account continuous-equivalent is too generous; keep Free strictly point-in-time.
2. Enterprise threshold and whether white-label starts at Scale or Enterprise. Recommendation: white-label reports at Scale, full white-label and SSO at Enterprise.
3. Whether to add a spend-tiered axis for very high-spend single accounts. Defer; per-account is simpler and predictable. Revisit if large single-account advertisers ask.

---

## 10. Cross-references
- ARR model and blended ARPA: AEGIS_SPEC.md
- Funnel and conversion mechanics: AEGIS_GTM_SEO.md
- The problem severity behind willingness to pay: AEGIS_RISK_REGISTER.md (R2, R4)
