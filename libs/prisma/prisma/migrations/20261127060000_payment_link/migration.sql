-- No se importan tokens en claro de Redis ni se modifican citas históricas.
CREATE TABLE "PaymentLink" (
    "id" TEXT NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),
    CONSTRAINT "PaymentLink_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PaymentLink_hash_format" CHECK ("tokenHash" ~ '^[0-9a-f]{64}$')
);
CREATE UNIQUE INDEX "PaymentLink_tokenHash_key" ON "PaymentLink"("tokenHash");
CREATE INDEX "PaymentLink_appointmentId_idx" ON "PaymentLink"("appointmentId");
ALTER TABLE "PaymentLink" ADD CONSTRAINT "PaymentLink_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
