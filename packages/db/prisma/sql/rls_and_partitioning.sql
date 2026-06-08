-- Raw SQL the Prisma schema cannot express: Row-Level Security, the tenant GUC,
-- append-only enforcement on the audit log, and HealthSnapshot partitioning.
-- Source of truth: AEGIS_DATA_MODEL.md sections 3-4.
--
-- APPLY ORDER: run this AFTER `prisma migrate` has created the base tables.
-- It is kept as a standalone script (not yet a tracked migration) because the
-- baseline migration is generated against a live database, which is not wired
-- up yet. When the DB exists, fold this into the migration that introduces it
-- (e.g. `prisma migrate dev --create-only`, then paste below the table DDL).

-- =====================================================================
-- 1. Row-Level Security (AEGIS_DATA_MODEL.md section 3)
-- =====================================================================
-- Every tenant-scoped table carries `orgId` and is filtered by a session GUC.
-- Organization and User are intentionally NOT in this list: Organization is the
-- tenant root, and User is global (tenant scoping lives on Membership).
-- AuditResult is intentionally outside tenant scope (it exists before an org).

ALTER TABLE "ConnectedAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Credential"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HealthSnapshot"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RiskSignal"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Alert"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AlertChannel"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"         ENABLE ROW LEVEL SECURITY;

-- One isolation policy per tenant table. The GUC is set per request/transaction
-- by the application: SELECT set_config('app.current_org_id', $orgId, true);
-- The `true` second arg to current_setting suppresses the error when unset, so
-- an unscoped connection simply matches nothing rather than throwing.

CREATE POLICY tenant_isolation ON "ConnectedAccount"
  USING ("orgId" = current_setting('app.current_org_id', true));
CREATE POLICY tenant_isolation ON "Credential"
  USING ("orgId" = current_setting('app.current_org_id', true));
CREATE POLICY tenant_isolation ON "HealthSnapshot"
  USING ("orgId" = current_setting('app.current_org_id', true));
CREATE POLICY tenant_isolation ON "RiskSignal"
  USING ("orgId" = current_setting('app.current_org_id', true));
CREATE POLICY tenant_isolation ON "Alert"
  USING ("orgId" = current_setting('app.current_org_id', true));
CREATE POLICY tenant_isolation ON "AlertChannel"
  USING ("orgId" = current_setting('app.current_org_id', true));
CREATE POLICY tenant_isolation ON "Subscription"
  USING ("orgId" = current_setting('app.current_org_id', true));
CREATE POLICY tenant_isolation ON "Membership"
  USING ("orgId" = current_setting('app.current_org_id', true));
CREATE POLICY tenant_isolation ON "AuditLog"
  USING ("orgId" = current_setting('app.current_org_id', true));

-- =====================================================================
-- 2. Append-only audit log (AEGIS_DATA_MODEL.md section 3)
-- =====================================================================
-- The app role gets INSERT and SELECT only on AuditLog — no UPDATE or DELETE —
-- so credential-access history is tamper-evident. Replace `aegis_app` with the
-- actual least-privilege application role.
--
-- REVOKE ALL ON "AuditLog" FROM aegis_app;
-- GRANT INSERT, SELECT ON "AuditLog" TO aegis_app;
--
-- The background scheduler runs under a role with BYPASSRLS for cross-tenant
-- jobs (polling all accounts); the user-facing API role NEVER has BYPASSRLS.

-- =====================================================================
-- 3. HealthSnapshot partitioning (AEGIS_DATA_MODEL.md section 4.1)
-- =====================================================================
-- HealthSnapshot is the high-volume table; range-partition it by month on
-- createdAt, creating next month's partition ahead of time via a scheduled job.
-- NOTE: a partitioned parent requires the partition key (createdAt) to be part
-- of the primary key, which Prisma's `@id` (id only) does not express. This is
-- handled at migration time by recreating the table as PARTITIONED BY RANGE
-- with PRIMARY KEY (id, createdAt). Prisma then reads it as a normal table.
--
-- Conceptual shape (the monthly-partition-creation job emits these):
--   CREATE TABLE "HealthSnapshot_2026_07" PARTITION OF "HealthSnapshot"
--     FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
--
-- Tiered retention (section 4.2): a monthly job archives cold partitions to R2,
-- with one hard exception — rows where "isOutcomeLabeled" = true are NEVER
-- archived or downsampled. They are the v2 training set.
