BEGIN;
-- Aioria confirmó America/Mexico_City para todas las sucursales preexistentes.
ALTER TABLE "Branch" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City';
CREATE FUNCTION cgbg_migration_branch_timezone(TEXT) RETURNS TEXT LANGUAGE SQL STABLE AS
  'SELECT timezone FROM "Branch" WHERE id = $1';
-- Solo inicio/fin representaban hora local como UTC. paymentExpiry ya es instante del reloj.
ALTER TABLE "Appointment"
  ALTER COLUMN "startTime" TYPE TIMESTAMPTZ(3) USING "startTime" AT TIME ZONE cgbg_migration_branch_timezone("branchId"),
  ALTER COLUMN "endTime" TYPE TIMESTAMPTZ(3) USING "endTime" AT TIME ZONE cgbg_migration_branch_timezone("branchId");
DROP FUNCTION cgbg_migration_branch_timezone(TEXT);
COMMIT;
