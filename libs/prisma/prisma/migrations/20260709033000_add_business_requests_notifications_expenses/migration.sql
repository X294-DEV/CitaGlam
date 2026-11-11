-- CreateEnum
CREATE TYPE "BusinessRequestStatus" AS ENUM ('PENDING', 'PROPOSAL_SENT', 'WAITING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "NotificationActionType" AS ENUM ('NONE', 'INTERNAL_NAV', 'EXTERNAL_LINK');

-- CreateTable
CREATE TABLE "SaaSExpense" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "monthlyCost" DECIMAL(10,2) NOT NULL,
    "dueDay" INTEGER,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaaSExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessRequest" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "selectedPackageId" TEXT,
    "monthsCount" INTEGER,
    "negotiatedPrice" DECIMAL(10,2),
    "status" "BusinessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "evidenceUrl" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessRequestProof" (
    "id" TEXT NOT NULL,
    "businessRequestId" TEXT NOT NULL,
    "evidenceUrl" TEXT NOT NULL,
    "adminNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessRequestProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "actionUrl" TEXT,
    "actionType" "NotificationActionType" NOT NULL DEFAULT 'NONE',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_tenantId_idx" ON "Notification"("tenantId");

-- AddForeignKey
ALTER TABLE "BusinessRequestProof" ADD CONSTRAINT "BusinessRequestProof_businessRequestId_fkey" FOREIGN KEY ("businessRequestId") REFERENCES "BusinessRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
