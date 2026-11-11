-- AlterTable
ALTER TABLE "GlobalConfig" ADD COLUMN     "branding" JSONB,
ADD COLUMN     "emailConfig" JSONB,
ADD COLUMN     "emailTemplates" JSONB,
ADD COLUMN     "legal" JSONB,
ADD COLUMN     "localization" JSONB,
ADD COLUMN     "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "seo" JSONB;
