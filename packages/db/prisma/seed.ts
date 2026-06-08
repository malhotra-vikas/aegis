// Local demo seed. Creates the three personas (admin / sales / customer), a
// sales pipeline of Leads (some converted into customer Organizations), a
// couple of self-serve / PLG signups, and — for every connected account —
// runs the REAL @aegis/risk-engine over a seeded Meta pull and persists the
// resulting HealthSnapshot + RiskSignal rows, denormalizing current state onto
// ConnectedAccount exactly as the hybrid-write strategy prescribes.
//
// Idempotent: wipes the relevant tables and reseeds on every run.

import 'dotenv/config';
import { assessRaw, META_V1_CATALOG, metaAdapter, type RawMetaPull } from '@aegis/risk-engine';
import { createPrismaClient } from '../src/index.js';
import { LeadStatus, PlatformRole, Role, SnapshotReason, SubscriptionTier } from '../src/generated/prisma/enums.js';

const db = createPrismaClient();

// Catalog lookup for weight + remediationId when persisting RiskSignal rows.
const catalogById = new Map(META_V1_CATALOG.map((d) => [d.id, d]));

const upper = <T extends string>(s: T) => s.toUpperCase() as Uppercase<T>;

interface SeedAccount {
  externalId: string;
  displayName: string;
  raw: RawMetaPull;
}

async function wipe() {
  // FK-safe order.
  await db.riskSignal.deleteMany();
  await db.healthSnapshot.deleteMany();
  await db.alert.deleteMany();
  await db.alertChannel.deleteMany();
  await db.credential.deleteMany();
  await db.connectedAccount.deleteMany();
  await db.subscription.deleteMany();
  await db.membership.deleteMany();
  await db.lead.deleteMany();
  await db.auditResult.deleteMany();
  await db.auditLog.deleteMany();
  await db.trainingSample.deleteMany();
  await db.organization.deleteMany();
  await db.user.deleteMany();
}

/** Run the real engine over a seeded pull and persist snapshot + signals + denorm. */
async function snapshotAccount(orgId: string, accountId: string, raw: RawMetaPull) {
  const result = assessRaw(metaAdapter, raw);

  const snapshot = await db.healthSnapshot.create({
    data: {
      orgId,
      connectedAccountId: accountId,
      reason: SnapshotReason.INITIAL,
      score: result.score,
      bucket: upper(result.bucket),
      assessable: result.assessable,
      modelVersion: result.modelVersion,
      rawPayload: raw as object,
      signals: {
        create: result.signals.map((s) => {
          const def = catalogById.get(s.definitionId)!;
          return {
            orgId,
            definitionId: s.definitionId,
            category: upper(s.category),
            severity: upper(s.severity),
            weight: def.weight,
            confidence: s.confidence,
            contribution: s.contribution,
            evidence: s.evidence as object,
            explanation: s.explanation,
            remediationId: def.remediationId,
          };
        }),
      },
    },
  });

  const disabled = result.signals.some((s) => s.definitionId === 'meta.account_disabled');
  await db.connectedAccount.update({
    where: { id: accountId },
    data: {
      currentScore: result.score,
      currentBucket: upper(result.bucket),
      assessable: result.assessable,
      lastSnapshotAt: snapshot.createdAt,
      lastAssessableAt: result.assessable ? snapshot.createdAt : undefined,
      disabledAt: disabled ? snapshot.createdAt : undefined,
    },
  });

  return result;
}

/** Create a customer Organization with an owner user, subscription, and accounts. */
async function createCustomer(opts: {
  orgName: string;
  tier: SubscriptionTier;
  accountQuota: number;
  ownerEmail: string;
  ownerName: string;
  accounts: SeedAccount[];
}) {
  const org = await db.organization.create({ data: { name: opts.orgName } });

  const owner = await db.user.create({
    data: { email: opts.ownerEmail, name: opts.ownerName, platformRole: PlatformRole.CUSTOMER },
  });
  await db.membership.create({ data: { userId: owner.id, orgId: org.id, role: Role.OWNER } });

  await db.subscription.create({
    data: { orgId: org.id, tier: opts.tier, accountQuota: opts.accountQuota, seatQuota: 3 },
  });

  for (const acct of opts.accounts) {
    const account = await db.connectedAccount.create({
      data: { orgId: org.id, platform: 'META', externalId: acct.externalId, displayName: acct.displayName },
    });
    await snapshotAccount(org.id, account.id, acct.raw);
  }

  return org;
}

async function main() {
  await wipe();

  // ---- Internal staff ----
  const admin = await db.user.create({
    data: { email: 'admin@aegis.dev', name: 'Aegis Admin', platformRole: PlatformRole.ADMIN },
  });
  const dana = await db.user.create({
    data: { email: 'dana@aegis.dev', name: 'Dana Reed', platformRole: PlatformRole.SALES },
  });
  const marco = await db.user.create({
    data: { email: 'marco@aegis.dev', name: 'Marco Ruiz', platformRole: PlatformRole.SALES },
  });

  // ---- Customers converted from sales leads ----
  const acme = await createCustomer({
    orgName: 'Acme Performance',
    tier: SubscriptionTier.AGENCY,
    accountQuota: 20,
    ownerEmail: 'acme@customer.com',
    ownerName: 'Acme Ops',
    accounts: [
      {
        externalId: 'act_1001',
        displayName: 'Acme — Prospecting',
        // payment failure + minor disapprovals + verification gap => amber
        raw: { account_status: 1, payment_failure: true, disapproved_active_ad_count: 1, business_verification_incomplete: true },
      },
      {
        externalId: 'act_1002',
        displayName: 'Acme — Retargeting',
        // pending risk review => terminal red, the key leading indicator
        raw: { account_status: 7 },
      },
    ],
  });

  const northbeam = await createCustomer({
    orgName: 'Northbeam Media',
    tier: SubscriptionTier.SCALE,
    accountQuota: 75,
    ownerEmail: 'ops@northbeam.com',
    ownerName: 'Priya N.',
    accounts: [
      { externalId: 'act_2001', displayName: 'Northbeam — Client A', raw: { account_status: 1 } }, // clean green
      {
        externalId: 'act_2002',
        displayName: 'Northbeam — Client B',
        raw: { account_status: 2, disable_reason: 'AD_POLICY' }, // disabled => terminal 100
      },
      {
        externalId: 'act_2003',
        displayName: 'Northbeam — Client C',
        raw: { account_status: 1, disapproved_active_ad_count: 4, restricted_category_active: true }, // major + restricted
      },
    ],
  });

  const lumen = await createCustomer({
    orgName: 'Lumen Growth',
    tier: SubscriptionTier.SOLO,
    accountQuota: 3,
    ownerEmail: 'hi@lumengrowth.com',
    ownerName: 'Sam Lumen',
    accounts: [
      {
        externalId: 'act_3001',
        displayName: 'Lumen — Main',
        raw: { account_status: 9, automation_risk: { detected: true, confidence: 0.7 } }, // grace + automation
      },
    ],
  });

  // ---- Self-serve / PLG customer (no Lead) ----
  await createCustomer({
    orgName: 'Solo Founder Co',
    tier: SubscriptionTier.SOLO,
    accountQuota: 3,
    ownerEmail: 'founder@soloco.com',
    ownerName: 'Jess Founder',
    accounts: [
      { externalId: 'act_4001', displayName: 'SoloCo — Main', raw: { account_status: 1 } }, // clean green
    ],
  });

  // ---- Sales pipeline (converted leads link to their Organization) ----
  await db.lead.createMany({
    data: [
      { company: 'Acme Performance', contactName: 'Acme Ops', contactEmail: 'acme@customer.com', status: LeadStatus.CONVERTED, mrr: 149, tier: SubscriptionTier.AGENCY, salesRepId: dana.id, organizationId: acme.id },
      { company: 'Northbeam Media', contactName: 'Priya N.', contactEmail: 'ops@northbeam.com', status: LeadStatus.CONVERTED, mrr: 449, tier: SubscriptionTier.SCALE, salesRepId: dana.id, organizationId: northbeam.id },
      { company: 'Lumen Growth', contactName: 'Sam Lumen', contactEmail: 'hi@lumengrowth.com', status: LeadStatus.CONVERTED, mrr: 39, tier: SubscriptionTier.SOLO, salesRepId: marco.id, organizationId: lumen.id },
      { company: 'BrightLeaf DTC', contactName: 'Robin Vale', contactEmail: 'robin@brightleaf.co', status: LeadStatus.QUALIFIED, mrr: 39, tier: SubscriptionTier.SOLO, salesRepId: marco.id },
      { company: 'Vertex Ads', contactName: 'Lee Park', contactEmail: 'lee@vertexads.io', status: LeadStatus.CONTACTED, mrr: 149, tier: SubscriptionTier.AGENCY, salesRepId: marco.id },
      { company: 'Pixel & Co', contactName: 'Avery Stone', contactEmail: 'avery@pixelco.com', status: LeadStatus.NEW, mrr: 39, tier: SubscriptionTier.SOLO, salesRepId: dana.id },
      { company: 'Harbor Digital', contactName: 'Quinn Ho', contactEmail: 'quinn@harbor.digital', status: LeadStatus.LOST, mrr: 149, tier: SubscriptionTier.AGENCY, salesRepId: dana.id },
      { company: 'Skyward Labs', contactName: 'Noor Aziz', contactEmail: 'noor@skyward.dev', status: LeadStatus.NEW, mrr: 449, tier: SubscriptionTier.SCALE, salesRepId: marco.id },
    ],
  });

  // ---- Top-of-funnel free audits (anonymous, email-keyed, pre-signup) ----
  await db.auditResult.createMany({
    data: [
      { email: 'growth@dtcbrand.com', platform: 'META', externalId: 'act_9001', score: 72.5, bucket: 'RED', assessable: true, signals: [{ definitionId: 'meta.ad_disapprovals_major' }], modelVersion: metaAdapter.modelVersion },
      { email: 'me@indiehacker.com', platform: 'META', externalId: 'act_9002', score: 0, bucket: 'GREEN', assessable: true, signals: [], modelVersion: metaAdapter.modelVersion },
    ],
  });

  const counts = {
    users: await db.user.count(),
    leads: await db.lead.count(),
    orgs: await db.organization.count(),
    accounts: await db.connectedAccount.count(),
    snapshots: await db.healthSnapshot.count(),
    signals: await db.riskSignal.count(),
  };
  console.log('Seed complete:', counts);
  console.log('Personas: admin@aegis.dev (ADMIN), dana@aegis.dev / marco@aegis.dev (SALES),');
  console.log('          acme@customer.com / ops@northbeam.com / hi@lumengrowth.com / founder@soloco.com (CUSTOMER)');
  void admin;
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
