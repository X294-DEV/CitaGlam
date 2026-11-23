BEGIN;
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Appointment" ADD CONSTRAINT "appointment_positive_interval" CHECK ("endTime" > "startTime");
ALTER TABLE "Appointment" ADD CONSTRAINT "appointment_no_overlap"
EXCLUDE USING gist (
  "branchId" WITH =,
  tstzrange("startTime", "endTime", '[)') WITH &&
) WHERE (status IN ('PENDING_PAYMENT', 'WAITING_APPROVAL', 'AUTHORIZED'));
-- Los intervalos históricos se preservan; traslapes preexistentes deben resolverse con el humano.
COMMIT;
