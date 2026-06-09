// Marketing content, single source. The cause guides ARE the SEO content map and
// they mirror the risk-engine signal catalog (AEGIS_GTM_SEO §1, §3.3): one page per
// Meta cause, each targeting a high-intent query, embedding the audit, and matching
// a remediation playbook. Positioned as compliance/account-health, not adversarial
// (AEGIS_GTM_SEO §12).

export const SITE = {
  name: 'Aegis',
  tagline: 'Catch an ad-account flag before it becomes a suspension.',
  description:
    'Aegis monitors your Meta ad accounts for the signals that precede a suspension — disapprovals, payment issues, risk-review states — and warns you early, with a clear fix for each.',
  url: 'https://aegis.example.com', // set to the real domain at deploy
};

export interface Tier {
  name: string;
  price: string;
  cadence: string;
  accounts: string;
  highlight?: boolean;
  features: string[];
  cta: string;
}

export const TIERS: Tier[] = [
  {
    name: 'Free',
    price: '$0',
    cadence: '',
    accounts: '1 account',
    features: ['One-click point-in-time health audit', 'Risk score + flagged issues', 'Manual re-run', 'No continuous monitoring'],
    cta: 'Run a free audit',
  },
  {
    name: 'Solo',
    price: '$39',
    cadence: '/mo',
    accounts: 'up to 3 accounts',
    features: ['Continuous monitoring', 'Email alerts before a flag escalates', 'Remediation playbooks', 'Historical risk score'],
    cta: 'Start monitoring',
  },
  {
    name: 'Agency',
    price: '$149',
    cadence: '/mo',
    accounts: 'up to 20 accounts',
    highlight: true,
    features: ['Everything in Solo', 'Slack alerts', 'Multi-account dashboard', 'Team seats', 'Historical risk tracking'],
    cta: 'Start monitoring',
  },
  {
    name: 'Scale',
    price: '$449',
    cadence: '/mo',
    accounts: 'up to 75 accounts',
    features: ['Everything in Agency', 'Priority polling cadence', 'API access', 'White-label reports'],
    cta: 'Talk to us',
  },
];

export interface Guide {
  slug: string;
  signalId: string; // the risk-engine signal this guide maps to
  query: string; // the high-intent search query it targets
  title: string;
  metaDescription: string;
  severity: 'critical' | 'warning' | 'info';
  whatItMeans: string;
  whyItHappens: string[];
  howToFix: string[];
  faqs: { q: string; a: string }[];
}

// Seed batch: the highest-intent Meta panic/recovery + prevention queries
// (AEGIS_GTM_SEO §3.2). Extend toward the top 30–50 by adding entries here — the
// factory, sitemap, and internal links pick them up automatically.
export const GUIDES: Guide[] = [
  {
    slug: 'meta-ad-account-disabled',
    signalId: 'meta.account_disabled',
    query: 'facebook ad account disabled how to fix',
    title: 'Meta ad account disabled: what it means and how to recover it',
    metaDescription:
      'Your Meta ad account is disabled. Here is exactly what that means, the most common reasons, and the step-by-step path to request a review and recover it.',
    severity: 'critical',
    whatItMeans:
      'A disabled ad account has its active ads paused and billing stopped. It is the most severe routine enforcement state — but disabled is not always permanent, and a well-prepared review request is your fastest path back.',
    whyItHappens: [
      'A pattern of policy violations or disapprovals that crossed an account-level threshold',
      'Payment problems left unresolved (failed charges, disputed payments)',
      'Links to another account that was previously disabled (shared payment method or identity)',
      'Business-integrity or circumvention flags',
    ],
    howToFix: [
      'Open Account Quality and read the stated reason — do not guess.',
      'Fix the underlying cause first (resolve payments, remove the offending ads, complete verification).',
      'Submit a single, specific review request that references the resolved cause; avoid repeated low-quality appeals.',
      'If you run multiple accounts, check them for the same cause before it spreads.',
    ],
    faqs: [
      { q: 'Is a disabled Meta ad account permanent?', a: 'Not always. Many disables are reversible through the review process, especially when the underlying cause is fixed before you appeal.' },
      { q: 'How long does a Meta review take?', a: 'It varies from hours to weeks. A clear, single request that addresses the stated reason tends to resolve faster than repeated appeals.' },
    ],
  },
  {
    slug: 'meta-ad-account-pending-review',
    signalId: 'meta.account_pending_review',
    query: 'facebook ad account in review',
    title: 'Meta ad account in risk review: the warning window before a disable',
    metaDescription:
      'A risk-review state is the window before a possible disable — and the best moment to act. Here is what it means and what to do in the next 24 hours.',
    severity: 'critical',
    whatItMeans:
      'Your account is under risk review. This is a leading indicator: the account is still alive, but Meta has flagged it for scrutiny. Acting now, before a decision lands, is far easier than recovering a disable.',
    whyItHappens: [
      'A recent spike in disapprovals or a policy-sensitive change',
      'Unusual account activity that the risk system reads as elevated',
      'Incomplete verification combined with another risk factor',
    ],
    howToFix: [
      'Pause anything risky immediately — disapproved ads, restricted-category creative, aggressive automation.',
      'Complete business verification if it is incomplete.',
      'Do not make large, rapid changes during review; that can read as further risk.',
      'Monitor the account daily — a review state can flip quickly in either direction.',
    ],
    faqs: [
      { q: 'Does "in review" mean my account will be banned?', a: 'No. It is a heightened-scrutiny state, not a decision. It is the best time to remove risk and improve your standing.' },
    ],
  },
  {
    slug: 'facebook-ads-disapproved',
    signalId: 'meta.ad_disapprovals_major',
    query: 'facebook ads disapproved account risk',
    title: 'Facebook ad disapprovals: when a cluster becomes an account risk',
    metaDescription:
      'A few disapprovals are routine; a rising cluster signals account-level standing risk. Here is how to tell the difference and clear them safely.',
    severity: 'critical',
    whatItMeans:
      'Individual ad disapprovals are normal. But a cluster of active disapproved ads is read at the account level — it raises your suspension risk, not just the risk to those ads.',
    whyItHappens: [
      'Creative or landing pages that cross a policy line (claims, prohibited content)',
      'Restricted-category content without the right authorization',
      'Repeated re-submission of the same disapproved ad',
    ],
    howToFix: [
      'Turn off disapproved ads rather than repeatedly re-submitting them.',
      'Read each disapproval reason and fix the specific policy issue before relaunching.',
      'Keep your active disapproval count low — it is an account-health signal, not just per-ad.',
    ],
    faqs: [
      { q: 'How many disapprovals are dangerous?', a: 'There is no public threshold, but a rising count of active disapprovals correlates with account-level enforcement. Keep it near zero.' },
    ],
  },
  {
    slug: 'meta-ad-account-payment-failed',
    signalId: 'meta.payment_failure',
    query: 'facebook ads payment failed account',
    title: 'Meta ads payment failure: how a billing issue becomes an account hold',
    metaDescription:
      'A failed payment pauses delivery and, left unresolved, can trigger account holds. Here is how to clear it before it escalates.',
    severity: 'warning',
    whatItMeans:
      'A declined or failed payment pauses your delivery. On its own it is recoverable, but unresolved billing problems are a common path to account holds.',
    whyItHappens: ['An expired or declined card', 'A disputed or reversed charge', 'A high-risk-region or mismatched billing method'],
    howToFix: [
      'Settle the outstanding balance and update the payment method promptly.',
      'Use a stable, verified payment method that matches your business region.',
      'Avoid disputing legitimate Meta charges — chargebacks are a strong negative signal.',
    ],
    faqs: [
      { q: 'Can a payment failure get my account banned?', a: 'Not immediately, but repeated or unresolved billing problems are a documented contributor to account holds and disables.' },
    ],
  },
  {
    slug: 'meta-restricted-category-ads',
    signalId: 'meta.restricted_category_active',
    query: 'meta restricted category ads rules',
    title: 'Restricted-category ads on Meta: rules and how to stay compliant',
    metaDescription:
      'Running crypto, supplements, gambling, or other restricted verticals on Meta without authorization carries elevated suspension risk. Here is how to stay within policy.',
    severity: 'warning',
    whatItMeans:
      'Some verticals (crypto, supplements, gambling, dropshipping, adult) are restricted. Running them without the right authorization is a standing risk even if individual ads pass review.',
    whyItHappens: ['Advertising a restricted vertical without applying for the required authorization', 'Creative that implies a restricted product or claim'],
    howToFix: [
      'Apply for the authorization your vertical requires before scaling spend.',
      'Keep creative within the documented rules for your category.',
      'Separate restricted-category activity so a flag does not pull in unrelated accounts.',
    ],
    faqs: [
      { q: 'Can I run restricted-category ads on Meta at all?', a: 'Often yes, but only with the correct authorization and within category-specific rules. Without authorization the risk is high.' },
    ],
  },
  {
    slug: 'meta-business-verification-incomplete',
    signalId: 'meta.business_verification_incomplete',
    query: 'facebook business verification ad account',
    title: 'Incomplete business verification: a quiet risk multiplier',
    metaDescription:
      'Incomplete or inconsistent business verification lengthens suspensions and raises your baseline risk. Here is how to complete it cleanly.',
    severity: 'info',
    whatItMeans:
      'Verification is a trust signal. Incomplete or inconsistent verification raises your baseline risk and tends to make any suspension longer and harder to resolve.',
    whyItHappens: ['Verification never completed', 'Mismatched business name, address, or documents', 'A pending verification left unfinished'],
    howToFix: [
      'Complete business verification in Business Settings with consistent, accurate details.',
      'Make sure your legal name, address, and documents match across your business assets.',
      'Resolve any pending verification rather than leaving it open.',
    ],
    faqs: [
      { q: 'Does verification really affect suspension risk?', a: 'Yes. A fully verified, consistent business is treated as lower-risk and recovers from enforcement faster.' },
    ],
  },
  {
    slug: 'meta-circumventing-systems',
    signalId: 'meta.circumventing_systems',
    query: 'circumventing systems meta',
    title: 'Circumventing systems on Meta: the most severe enforcement flag',
    metaDescription:
      'A circumventing-systems or Business-Manager-level restriction is one of Meta’s most severe actions. Here is what it means and the narrow path forward.',
    severity: 'critical',
    whatItMeans:
      'Circumventing-systems is among Meta’s most serious enforcement categories — it implies an attempt to evade their review or enforcement. It is often applied at the Business Manager level and is difficult to reverse.',
    whyItHappens: [
      'Cloaking or misrepresenting the destination or content of ads',
      'Recreating assets to evade a prior enforcement',
      'Patterns the integrity system reads as deliberate evasion',
    ],
    howToFix: [
      'Stop any activity that could be read as evasion immediately.',
      'Do not spin up new accounts to get around the restriction — that compounds the flag.',
      'Submit a careful, honest review request; this category has a high bar.',
    ],
    faqs: [
      { q: 'Can a circumventing-systems restriction be lifted?', a: 'It is among the hardest to reverse. The priority is to stop the triggering behavior and avoid creating linked accounts, which makes it worse.' },
    ],
  },
];

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
