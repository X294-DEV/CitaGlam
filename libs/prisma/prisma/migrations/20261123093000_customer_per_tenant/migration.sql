BEGIN;
LOCK TABLE "User", "Profile", "Appointment" IN SHARE ROW EXCLUSIVE MODE;

-- Cada usuario puede ser cliente de varios negocios por sus citas históricas.
CREATE TEMP TABLE customer_candidates ON COMMIT DROP AS
SELECT u."id" AS "userId", u."tenantId" FROM "User" u
WHERE u.role = 'CLIENT' AND u."tenantId" IS NOT NULL
UNION
SELECT a."clientId", a."tenantId" FROM "Appointment" a;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM customer_candidates c JOIN "User" u ON u.id = c."userId"
    LEFT JOIN "Profile" p ON p."userId" = u.id
    WHERE u.role <> 'CLIENT' OR trim(u."firstName") = '' OR trim(u."lastName") = ''
      OR trim(u.email) = '' OR u.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      OR p.phone IS NULL OR regexp_replace(p.phone, '[[:space:]().-]', '', 'g') !~ '^\+[1-9][0-9]{1,14}$'
  ) THEN
    RAISE EXCEPTION 'Customer: corregir rol, nombre, apellido, correo o teléfono internacional de clientes con negocio/citas antes de migrar. Sin cambios aplicados.';
  END IF;
  IF EXISTS (
    SELECT c."tenantId", regexp_replace(p.phone, '[[:space:]().-]', '', 'g')
    FROM customer_candidates c JOIN "Profile" p ON p."userId" = c."userId"
    GROUP BY 1, 2 HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Customer: hay teléfonos duplicados en un negocio. Resolverlos explícitamente antes de migrar. Sin cambios aplicados.';
  END IF;
END $$;

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Customer_tenantId_phone_key" ON "Customer"("tenantId", "phone");
CREATE UNIQUE INDEX "Customer_tenantId_userId_key" ON "Customer"("tenantId", "userId");
INSERT INTO "Customer" ("id", "tenantId", "userId", "firstName", "lastName", "email", "phone", "createdAt", "updatedAt")
SELECT md5(c."tenantId" || ':' || u.id)::uuid::text, c."tenantId", u.id,
  trim(u."firstName"), trim(u."lastName"), trim(u.email),
  regexp_replace(p.phone, '[[:space:]().-]', '', 'g'), u."createdAt", u."updatedAt"
FROM customer_candidates c JOIN "User" u ON u.id = c."userId" JOIN "Profile" p ON p."userId" = u.id;

ALTER TABLE "Appointment" ADD COLUMN "customerId" TEXT;
UPDATE "Appointment" a SET "customerId" = c.id FROM "Customer" c
WHERE c."userId" = a."clientId" AND c."tenantId" = a."tenantId";
ALTER TABLE "Appointment" ALTER COLUMN "customerId" SET NOT NULL;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_clientId_fkey";
ALTER TABLE "Appointment" DROP COLUMN "clientId";
-- User/Profile y cuentas sin negocio/citas se conservan. No hay borrado de identidades.
COMMIT;
