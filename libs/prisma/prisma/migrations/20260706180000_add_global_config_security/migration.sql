-- Keep the database aligned with the GlobalConfig Prisma model.
ALTER TABLE "GlobalConfig" ADD COLUMN IF NOT EXISTS "security" JSONB;
