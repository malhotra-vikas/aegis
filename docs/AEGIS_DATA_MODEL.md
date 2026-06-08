# Aegis Data Model (Prisma + DDL)

> The executable data model. The Prisma schema is the source of truth for application access. The raw SQL sections cover what Prisma cannot express on its own: row-level security, table partitioning, retention, and append-only enforcement. Consistent with AEGIS_SPEC.md (entities), AEGIS_RISK_ENGINE_SPEC.md (signals, scoring, assessable), and AEGIS_OAUTH_SECURITY.md (credential shape).

---

## 1. Locked decisions reflected here

- **Tenant isolation:** shared schema with Postgres Row-Level Security. Cheap to operate, but enforced at the database, which is defensible given the product stores other businesses' access tokens.
- **HealthSnapshot writes:** hybrid. A full row is written on a detected change and on a periodic heartbeat, not on every poll. Current state is denormalized onto `ConnectedAccount` so reads never scan the snapshot history.
- **Retention:** tiered. Recent snapshots stay hot, older ones are archived to cheaper storage, and any row marked `isOutcomeLabeled` is retained at full fidelity forever because it is the v2 training moat.
- **IDs:** cuid. **Deletes:** soft by default with a hard-purge path. **Raw payload:** stored as JSONB on each snapshot. **Signals:** normalized rows. **Versioning:** `modelVersion` on snapshots, `playbookVersion` on alerts. **Credentials:** ciphertext only, never plaintext.

---

## 2. Prisma schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ---------- Enums ----------

enum Platform { META GOOGLE TIKTOK }
enum Role { OWNER ADMIN MEMBER }
enum SubscriptionTier { FREE SOLO AGENCY SCALE }
enum SubscriptionStatus { ACTIVE PAST_DUE CANCELED TRIALING }
enum MonitoringStatus { ACTIVE PAUSED DISCONNECTED }
enum TokenType { USER_LONG_LIVED SYSTEM_USER }
enum CredentialStatus { ACTIVE EXPIRED INVALID REVOKED }
enum RiskCategory { POLICY PAYMENT LINKAGE AUTOMATION VERIFICATION PAGE CIRCUMVENTION STATUS }
enum Severity { INFO WARNING CRITICAL }
enum RiskBucket { GREEN AMBER RED }
enum SnapshotReason { INITIAL CHANGE HEARTBEAT MANUAL_AUDIT }
enum AlertState { PENDING SENT FAILED SUPPRESSED }
enum AlertChannelType { EMAIL SLACK }

// ---------- Tenancy and identity ----------

model Organization {
  id                String   @id @default(cuid())
  name              String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  deletedAt         DateTime?

  memberships       Membership[]
  connectedAccounts ConnectedAccount[]
  subscription      Subscription?
  alertChannels     AlertChannel[]
  auditLogs         AuditLog[]
}

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  name        String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  memberships Membership[]
}

model Membership {
  id        String   @id @default(cuid())
  userId    String
  orgId     String
  role      Role     @default(MEMBER)
  createdAt DateTime @default(now())

  user      User         @relation(fields: [userId], references: [id])
  org       Organization @relation(fields: [orgId], references: [id])

  @@unique([userId, orgId])
  @@index([orgId])
}

// ---------- Monitored accounts and credentials ----------

model ConnectedAccount {
  id               String   @id @default(cuid())
  orgId            String
  platform         Platform
  externalId       String   // e.g. act_1234567890
  displayName      String?
  monitoringStatus MonitoringStatus @default(ACTIVE)

  // denormalized current state (hybrid write strategy: read here, not from snapshots)
  currentScore     Float?
  currentBucket    RiskBucket?
  assessable       Boolean  @default(true)
  lastSnapshotAt   DateTime?
  lastAssessableAt DateTime?
  disabledAt       DateTime? // set when confirmed disabled; drives outcome labeling

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  deletedAt        DateTime?

  org              Organization @relation(fields: [orgId], references: [id])
  credential       Credential?
  snapshots        HealthSnapshot[]
  alerts           Alert[]

  @@unique([orgId, platform, externalId])
  @@index([orgId])
  @@index([monitoringStatus])
}

model Credential {
  id                  String   @id @default(cuid())
  orgId               String
  connectedAccountId  String   @unique
  tokenType           TokenType
  // envelope encryption fields (see AEGIS_OAUTH_SECURITY.md); never plaintext, never logged
  ciphertext          Bytes
  iv                  Bytes
  authTag             Bytes
  wrappedDataKey      Bytes
  keyVersion          Int
  scopes              String[]
  status              CredentialStatus @default(ACTIVE)
  expiresAt           DateTime?
  dataAccessExpiresAt DateTime?
  lastValidatedAt     DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  connectedAccount    ConnectedAccount @relation(fields: [connectedAccountId], references: [id])

  @@index([orgId])
  @@index([status])
}

// ---------- Time-series health data ----------

model HealthSnapshot {
  id                 String   @id @default(cuid())
  orgId              String
  connectedAccountId String
  reason             SnapshotReason
  score              Float
  bucket             RiskBucket
  assessable         Boolean
  modelVersion       String
  rawPayload         Json     // original platform pull, for replay and v2 retraining
  isOutcomeLabeled   Boolean  @default(false) // true = protected from archival/downsampling
  outcomeDisabled    Boolean? // label: did the account get disabled within the window
  createdAt          DateTime @default(now())

  connectedAccount   ConnectedAccount @relation(fields: [connectedAccountId], references: [id])
  signals            RiskSignal[]

  @@index([connectedAccountId, createdAt])
  @@index([orgId])
  @@index([isOutcomeLabeled])
}

model RiskSignal {
  id            String   @id @default(cuid())
  orgId         String   // carried for clean RLS without a join
  snapshotId    String
  definitionId  String   // e.g. meta.payment_failure
  category      RiskCategory
  severity      Severity
  weight        Float
  confidence    Float
  contribution  Float    // computed p_s, stored for analysis and v2 features
  evidence      Json
  explanation   String
  remediationId String   // links to the playbook in AEGIS_REMEDIATION_PLAYBOOKS.md
  createdAt     DateTime @default(now())

  snapshot      HealthSnapshot @relation(fields: [snapshotId], references: [id])

  @@index([snapshotId])
  @@index([definitionId])
  @@index([orgId])
}

// ---------- Alerting ----------

model Alert {
  id                 String   @id @default(cuid())
  orgId              String
  connectedAccountId String
  severity           Severity
  bucketFrom         RiskBucket?
  bucketTo           RiskBucket
  signalCategories   RiskCategory[]
  playbookRefs       Json     // [{ remediationId, playbookVersion }]
  dedupeKey          String   // connectedAccountId + category + day
  state              AlertState @default(PENDING)
  sentAt             DateTime?
  createdAt          DateTime @default(now())

  connectedAccount   ConnectedAccount @relation(fields: [connectedAccountId], references: [id])

  @@unique([connectedAccountId, dedupeKey])
  @@index([orgId])
  @@index([state])
}

model AlertChannel {
  id                 String   @id @default(cuid())
  orgId              String
  connectedAccountId String?  // null = applies org-wide
  type               AlertChannelType
  config             Json     // email addresses, or slack workspace + channel
  enabled            Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  org                Organization @relation(fields: [orgId], references: [id])

  @@index([orgId])
}

// ---------- Billing ----------

model Subscription {
  id                   String   @id @default(cuid())
  orgId                String   @unique
  stripeCustomerId     String?
  stripeSubscriptionId String?
  tier                 SubscriptionTier @default(FREE)
  accountQuota         Int      @default(1)
  seatQuota            Int      @default(1)
  status               SubscriptionStatus @default(ACTIVE)
  currentPeriodEnd     DateTime?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  org                  Organization @relation(fields: [orgId], references: [id])

  @@index([stripeCustomerId])
}

// ---------- Free audit (pre-signup, email-keyed, outside tenant scope) ----------

model AuditResult {
  id             String   @id @default(cuid())
  email          String
  platform       Platform
  externalId     String?
  score          Float
  bucket         RiskBucket
  assessable     Boolean
  signals        Json     // one-shot detected signals for the free audit
  modelVersion   String
  convertedOrgId String?  // set if this audit later converted to a paid org
  createdAt      DateTime @default(now())

  @@index([email])
  @@index([convertedOrgId])
}

// ---------- De-identified training store (survives customer offboarding) ----------
// No orgId, no account identifiers, no FK back to any tenant row. Not tenant-scoped.
// Populated by the de-identification job on offboarding; see section 5.

model TrainingSample {
  id            String   @id @default(cuid()) // synthetic, no link to the original snapshot
  platform      Platform
  modelVersion  String
  score         Float
  bucket        RiskBucket
  // feature vector: the normalized signals only, no rawPayload, no evidence free-text
  features      Json     // [{ definitionId, category, severity, weight, confidence, contribution }]
  outcomeDisabled Boolean
  labelWindowDays Int    // 7, 14, or 30
  observedMonth String   // coarse timestamp only, e.g. "2026-07", never an exact datetime
  createdAt     DateTime @default(now())

  @@index([platform, modelVersion])
  @@index([outcomeDisabled])
}

// ---------- Security audit log (append-only) ----------

model AuditLog {
  id                 String   @id @default(cuid())
  orgId              String
  actorService       String   // which worker/service performed the action
  action             String   // e.g. CREDENTIAL_DECRYPT, CREDENTIAL_VALIDATE
  connectedAccountId String?
  metadata           Json?
  occurredAt         DateTime @default(now())

  org                Organization @relation(fields: [orgId], references: [id])

  @@index([orgId, occurredAt])
}
```

---

## 3. Row-Level Security (raw SQL migration)

Prisma does not manage RLS, so apply this as a raw migration. Every tenant-scoped table carries `orgId` and is filtered by a session GUC.

```sql
-- enable RLS on all tenant-scoped tables
ALTER TABLE "ConnectedAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Credential"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HealthSnapshot"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RiskSignal"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Alert"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AlertChannel"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"         ENABLE ROW LEVEL SECURITY;

-- one policy per table; example shown, repeat for each
CREATE POLICY tenant_isolation ON "ConnectedAccount"
  USING ("orgId" = current_setting('app.current_org_id', true));
```

The application sets the tenant context at the start of each request transaction:

```sql
SELECT set_config('app.current_org_id', $1, true); -- $1 = the authenticated orgId
```

Notes:
- `AuditResult` is intentionally outside tenant scope. It exists before an org does and is keyed by email, so it is governed by app-level access only, not RLS.
- `User` is global (a user can belong to multiple orgs). Tenant scoping lives on `Membership`.
- The background scheduler runs under a role with `BYPASSRLS` for cross-tenant jobs (polling all accounts), but when it operates on one tenant it sets the GUC. The user-facing API role never has `BYPASSRLS`.
- `AuditLog` append-only is enforced by granting the app role INSERT and SELECT only, no UPDATE or DELETE.

---

## 4. Partitioning, retention, and archival (raw SQL + jobs)

### 4.1 Partition HealthSnapshot by month
`HealthSnapshot` is the high-volume table. Make it range-partitioned on `createdAt`, with partitions created a month ahead by a scheduled job. Prisma reads it as a normal table.

```sql
-- conceptual: HealthSnapshot is a partitioned parent; monthly children are created ahead
-- CREATE TABLE "HealthSnapshot_2026_07" PARTITION OF "HealthSnapshot"
--   FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
```

### 4.2 Tiered retention
A monthly job archives cold partitions (older than the hot window, for example 3 to 6 months) to cheaper storage, with one hard exception: rows where `isOutcomeLabeled = true` are never archived or downsampled. They are the labeled training set.

### 4.3 Outcome labeling (the moat job)
When a `ConnectedAccount.disabledAt` is set, or a circumventing-systems signal is confirmed, a job walks back over that account's snapshots within the label windows (7, 14, 30 days), sets `isOutcomeLabeled = true` and `outcomeDisabled = true`, and locks them from archival. Surviving accounts contribute negative labels by the same windowing. This is what turns raw monitoring history into v2 training data.

---

## 5. Soft delete, hard purge, and de-identified retention

- Soft-deletable models carry `deletedAt`. A Prisma client extension filters `deletedAt IS NULL` by default on reads.
- **Hard purge on offboarding** (per AEGIS_OAUTH_SECURITY.md): revoke the platform token, delete the `Credential` row, then purge the org's tenant-scoped data on a defined timeline.

### 5.1 De-identified retention (decided)

Outcome-labeled snapshots are retained in de-identified form after a customer offboards, so the training set survives churn. The mechanism, run as a step in the offboarding job before the hard purge:

1. For each outcome-labeled snapshot belonging to the departing org, extract the normalized feature vector from its `RiskSignal` rows (definitionId, category, severity, weight, confidence, contribution), plus score, bucket, modelVersion, platform, the outcome label, and a coarse `observedMonth` (month only, never the exact datetime).
2. Write that into `TrainingSample` with a fresh synthetic id and **no** orgId, connectedAccountId, externalId, displayName, evidence free-text, or `rawPayload`.
3. Then hard-purge the original tenant-scoped snapshot, signal, account, and credential rows.

**Why rawPayload is dropped, not carried.** The raw platform pull is the densest source of identifiers (account ids, business names) and cannot be reliably scrubbed of free-form PII, so it never enters the de-identified store. The cost is that retained samples cannot be re-featurized if the engine changes later. That is the deliberate privacy price. While a customer is active, `rawPayload` stays in their tenant-scoped snapshots and re-featurization is available there.

**Irreversibility requirement.** "De-identified" only holds up if it is genuinely non-reversible. The synthetic id must carry no mapping back to the original, the coarse timestamp must not enable re-identification by correlation, and the feature vector must contain no identifying free-text. This is also what keeps the retained data within the aggregated/de-identified carve-out of the platform developer terms, so the de-identification must be verified to satisfy those terms, not just privacy law.

---

## 6. Index and performance notes

- Reads of "current state" hit `ConnectedAccount` only, never the snapshot history, which is the point of the hybrid write strategy.
- `HealthSnapshot (connectedAccountId, createdAt)` supports per-account history queries; partitioning keeps each scan bounded.
- `Alert (connectedAccountId, dedupeKey)` is unique, enforcing dedupe at the database, not just in app logic.
- `RiskSignal (definitionId)` supports the v2 query "which signals preceded disables," the core training extract.

---

## 7. Cross-references

- Entity overview and architecture: AEGIS_SPEC.md
- `assessable`, `modelVersion`, signal fields, scoring: AEGIS_RISK_ENGINE_SPEC.md
- Credential field shape, token lifecycle, audit logging: AEGIS_OAUTH_SECURITY.md
- `remediationId` and `playbookVersion` targets: AEGIS_REMEDIATION_PLAYBOOKS.md

---

## 8. Open decisions

1. cuid v1 (Prisma `@default(cuid())`) versus cuid2 generated app-side. Recommendation: ship with `cuid()`, move to cuid2 only if the sortability or length matters.
2. Whether to extract v2 training data into a separate analytics store rather than querying production partitions directly. Defer until snapshot volume justifies it. Note that `TrainingSample` already lives outside tenant scope, so it is the natural seed for that store.
