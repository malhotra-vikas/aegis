// Provision a customer tenant: Organization + owner login + subscription +
// connected accounts, scoring each account with the REAL @aegis/risk-engine and
// persisting the HealthSnapshot + RiskSignal rows (denormalizing current state
// onto the account, per the hybrid-write strategy). Used when an admin converts
// a sales Lead into a customer. Mirrors the seed's persistence path.

import {
  assessRaw,
  META_V1_CATALOG,
  metaAdapter,
  type RawMetaPull,
} from "@aegis/risk-engine";
import { Role, SnapshotReason, SubscriptionTier } from "@aegis/db";
import { db } from "./db";

const catalogById = new Map(META_V1_CATALOG.map((d) => [d.id, d]));
const upper = <T extends string>(s: T) => s.toUpperCase() as Uppercase<T>;

export const QUOTA_BY_TIER: Record<SubscriptionTier, number> = {
  FREE: 1,
  SOLO: 3,
  AGENCY: 20,
  SCALE: 75,
};

interface ProvisionAccount {
  externalId: string;
  displayName: string;
  raw: RawMetaPull;
}

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

  const disabled = result.signals.some((s) => s.definitionId === "meta.account_disabled");
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
}

export async function provisionCustomer(opts: {
  orgName: string;
  ownerEmail: string;
  ownerName: string;
  tier: SubscriptionTier;
  accounts: ProvisionAccount[];
}) {
  const org = await db.organization.create({ data: { name: opts.orgName } });

  // Reuse an existing login if the email is already a user, else create one.
  const owner = await db.user.upsert({
    where: { email: opts.ownerEmail },
    update: {},
    create: { email: opts.ownerEmail, name: opts.ownerName },
  });
  await db.membership.create({ data: { userId: owner.id, orgId: org.id, role: Role.OWNER } });

  await db.subscription.create({
    data: { orgId: org.id, tier: opts.tier, accountQuota: QUOTA_BY_TIER[opts.tier], seatQuota: 3 },
  });

  for (const acct of opts.accounts) {
    const account = await db.connectedAccount.create({
      data: { orgId: org.id, platform: "META", externalId: acct.externalId, displayName: acct.displayName },
    });
    await snapshotAccount(org.id, account.id, acct.raw);
  }

  return org;
}
