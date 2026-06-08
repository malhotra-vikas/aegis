-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('META', 'GOOGLE', 'TIKTOK');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'SOLO', 'AGENCY', 'SCALE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING');

-- CreateEnum
CREATE TYPE "MonitoringStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('USER_LONG_LIVED', 'SYSTEM_USER');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'INVALID', 'REVOKED');

-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('POLICY', 'PAYMENT', 'LINKAGE', 'AUTOMATION', 'VERIFICATION', 'PAGE', 'CIRCUMVENTION', 'STATUS');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RiskBucket" AS ENUM ('GREEN', 'AMBER', 'RED');

-- CreateEnum
CREATE TYPE "SnapshotReason" AS ENUM ('INITIAL', 'CHANGE', 'HEARTBEAT', 'MANUAL_AUDIT');

-- CreateEnum
CREATE TYPE "AlertState" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "AlertChannelType" AS ENUM ('EMAIL', 'SLACK');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('ADMIN', 'SALES', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "platformRole" "PlatformRole" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "mrr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tier" "SubscriptionTier",
    "notes" TEXT,
    "salesRepId" TEXT NOT NULL,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectedAccount" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "externalId" TEXT NOT NULL,
    "displayName" TEXT,
    "monitoringStatus" "MonitoringStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentScore" DOUBLE PRECISION,
    "currentBucket" "RiskBucket",
    "assessable" BOOLEAN NOT NULL DEFAULT true,
    "lastSnapshotAt" TIMESTAMP(3),
    "lastAssessableAt" TIMESTAMP(3),
    "disabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ConnectedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "connectedAccountId" TEXT NOT NULL,
    "tokenType" "TokenType" NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "iv" BYTEA NOT NULL,
    "authTag" BYTEA NOT NULL,
    "wrappedDataKey" BYTEA NOT NULL,
    "keyVersion" INTEGER NOT NULL,
    "scopes" TEXT[],
    "status" "CredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "dataAccessExpiresAt" TIMESTAMP(3),
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthSnapshot" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "connectedAccountId" TEXT NOT NULL,
    "reason" "SnapshotReason" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "bucket" "RiskBucket" NOT NULL,
    "assessable" BOOLEAN NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "isOutcomeLabeled" BOOLEAN NOT NULL DEFAULT false,
    "outcomeDisabled" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskSignal" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "category" "RiskCategory" NOT NULL,
    "severity" "Severity" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "contribution" DOUBLE PRECISION NOT NULL,
    "evidence" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "remediationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "connectedAccountId" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "bucketFrom" "RiskBucket",
    "bucketTo" "RiskBucket" NOT NULL,
    "signalCategories" "RiskCategory"[],
    "playbookRefs" JSONB NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "state" "AlertState" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertChannel" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "connectedAccountId" TEXT,
    "type" "AlertChannelType" NOT NULL,
    "config" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "accountQuota" INTEGER NOT NULL DEFAULT 1,
    "seatQuota" INTEGER NOT NULL DEFAULT 1,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditResult" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "externalId" TEXT,
    "score" DOUBLE PRECISION NOT NULL,
    "bucket" "RiskBucket" NOT NULL,
    "assessable" BOOLEAN NOT NULL,
    "signals" JSONB NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "convertedOrgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingSample" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "bucket" "RiskBucket" NOT NULL,
    "features" JSONB NOT NULL,
    "outcomeDisabled" BOOLEAN NOT NULL,
    "labelWindowDays" INTEGER NOT NULL,
    "observedMonth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "actorService" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "connectedAccountId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_organizationId_key" ON "Lead"("organizationId");

-- CreateIndex
CREATE INDEX "Lead_salesRepId_idx" ON "Lead"("salesRepId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Membership_orgId_idx" ON "Membership"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_orgId_key" ON "Membership"("userId", "orgId");

-- CreateIndex
CREATE INDEX "ConnectedAccount_orgId_idx" ON "ConnectedAccount"("orgId");

-- CreateIndex
CREATE INDEX "ConnectedAccount_monitoringStatus_idx" ON "ConnectedAccount"("monitoringStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_orgId_platform_externalId_key" ON "ConnectedAccount"("orgId", "platform", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_connectedAccountId_key" ON "Credential"("connectedAccountId");

-- CreateIndex
CREATE INDEX "Credential_orgId_idx" ON "Credential"("orgId");

-- CreateIndex
CREATE INDEX "Credential_status_idx" ON "Credential"("status");

-- CreateIndex
CREATE INDEX "HealthSnapshot_connectedAccountId_createdAt_idx" ON "HealthSnapshot"("connectedAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "HealthSnapshot_orgId_idx" ON "HealthSnapshot"("orgId");

-- CreateIndex
CREATE INDEX "HealthSnapshot_isOutcomeLabeled_idx" ON "HealthSnapshot"("isOutcomeLabeled");

-- CreateIndex
CREATE INDEX "RiskSignal_snapshotId_idx" ON "RiskSignal"("snapshotId");

-- CreateIndex
CREATE INDEX "RiskSignal_definitionId_idx" ON "RiskSignal"("definitionId");

-- CreateIndex
CREATE INDEX "RiskSignal_orgId_idx" ON "RiskSignal"("orgId");

-- CreateIndex
CREATE INDEX "Alert_orgId_idx" ON "Alert"("orgId");

-- CreateIndex
CREATE INDEX "Alert_state_idx" ON "Alert"("state");

-- CreateIndex
CREATE UNIQUE INDEX "Alert_connectedAccountId_dedupeKey_key" ON "Alert"("connectedAccountId", "dedupeKey");

-- CreateIndex
CREATE INDEX "AlertChannel_orgId_idx" ON "AlertChannel"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_orgId_key" ON "Subscription"("orgId");

-- CreateIndex
CREATE INDEX "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "AuditResult_email_idx" ON "AuditResult"("email");

-- CreateIndex
CREATE INDEX "AuditResult_convertedOrgId_idx" ON "AuditResult"("convertedOrgId");

-- CreateIndex
CREATE INDEX "TrainingSample_platform_modelVersion_idx" ON "TrainingSample"("platform", "modelVersion");

-- CreateIndex
CREATE INDEX "TrainingSample_outcomeDisabled_idx" ON "TrainingSample"("outcomeDisabled");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_occurredAt_idx" ON "AuditLog"("orgId", "occurredAt");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectedAccount" ADD CONSTRAINT "ConnectedAccount_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "ConnectedAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthSnapshot" ADD CONSTRAINT "HealthSnapshot_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "ConnectedAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskSignal" ADD CONSTRAINT "RiskSignal_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "HealthSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "ConnectedAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertChannel" ADD CONSTRAINT "AlertChannel_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
