-- Raw SQL the Prisma schema cannot express: Row-Level Security, the tenant GUC,
-- the least-privilege application role, append-only enforcement on the audit log,
-- and HealthSnapshot partitioning. Source of truth: AEGIS_DATA_MODEL.md §3-4.
--
-- APPLY ORDER: run this AFTER `prisma migrate` has created the base tables.
-- Idempotent: safe to re-run (applied by `pnpm --filter @aegis/db rls`, and by
-- the cross-tenant isolation test). Fold into the baseline migration once the
-- production database is provisioned (AEGIS_INFRA §8).

-- =====================================================================
-- 1. Row-Level Security + tenant role (AEGIS_DATA_MODEL.md §3)
-- =====================================================================
-- Every tenant-scoped table carries `orgId` and is filtered by a session GUC set
-- per request/transaction: SELECT set_config('app.current_org_id', $orgId, true).
-- current_setting(..., true) returns '' when unset, so an unscoped connection
-- matches nothing (fail closed) rather than erroring.
--
-- USING filters reads; WITH CHECK filters writes — together they deny both
-- cross-tenant reads and cross-tenant inserts/updates.
--
-- Organization and User are intentionally NOT tenant-scoped: Organization is the
-- tenant root, User is global (tenant scoping lives on Membership). AuditResult
-- is outside tenant scope (it exists before an org).
--
-- The user-facing API connects AS aegis_app, which has NO BYPASSRLS. Only the
-- background scheduler runs under a BYPASSRLS role, and sets the GUC per tenant.

DO $rls$
DECLARE
  t text;
  tables text[] := ARRAY[
    'ConnectedAccount', 'Credential', 'HealthSnapshot', 'RiskSignal',
    'Alert', 'AlertChannel', 'Subscription', 'Membership', 'AuditLog'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aegis_app') THEN
    CREATE ROLE aegis_app NOLOGIN NOBYPASSRLS;
  END IF;

  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      'USING ("orgId" = current_setting(''app.current_org_id'', true)) '
      'WITH CHECK ("orgId" = current_setting(''app.current_org_id'', true))',
      t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO aegis_app', t);
  END LOOP;

  -- AuditLog is append-only for the app role: credential-access history must be
  -- tamper-evident (AEGIS_DATA_MODEL.md §3).
  REVOKE UPDATE, DELETE ON "AuditLog" FROM aegis_app;
END
$rls$;

-- Organization and User are NOT tenant-scoped (Organization is the tenant root,
-- User is global identity), so they carry no RLS policy. The API role still
-- provisions and reads them during auth, so grant it DML there; isolation is
-- app-level (always query by id), per AEGIS_DATA_MODEL.md §3. No DELETE — removal
-- goes through the soft-delete/purge path.
GRANT USAGE ON SCHEMA public TO aegis_app;
GRANT SELECT, INSERT, UPDATE ON "Organization" TO aegis_app;
GRANT SELECT, INSERT, UPDATE ON "User" TO aegis_app;

-- =====================================================================
-- 2. HealthSnapshot partitioning (AEGIS_DATA_MODEL.md §4.1) — NOT YET APPLIED
-- =====================================================================
-- HealthSnapshot is the high-volume table; range-partition it by month on
-- createdAt, creating next month's partition ahead of time via a scheduled job.
-- A partitioned parent requires the partition key (createdAt) in the primary key,
-- which Prisma's `@id` (id only) does not express; handled at migration time by
-- recreating the table as PARTITIONED BY RANGE with PRIMARY KEY (id, createdAt).
--
--   CREATE TABLE "HealthSnapshot_2026_07" PARTITION OF "HealthSnapshot"
--     FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
--
-- Tiered retention (§4.2): a monthly job archives cold partitions to R2, with one
-- hard exception — rows where "isOutcomeLabeled" = true are NEVER archived or
-- downsampled. They are the v2 training set.
