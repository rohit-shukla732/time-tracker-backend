-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isProbation" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BiometricConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "sourceUrl" TEXT,
    "sourceToken" TEXT,
    "pollIntervalMinutes" INTEGER NOT NULL DEFAULT 15,
    "shiftStart" TEXT NOT NULL DEFAULT '10:00',
    "shiftEnd" TEXT NOT NULL DEFAULT '19:00',
    "halfDayThresholdMin" INTEGER NOT NULL DEFAULT 60,
    "lateGraceMinutes" INTEGER NOT NULL DEFAULT 60,
    "probationLateGraceMinutes" INTEGER NOT NULL DEFAULT 45,
    "autoApply" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "lastRunStatus" TEXT,
    "lastRunMessage" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BiometricConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricMapping" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BiometricMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricPunch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "firstIn" TIMESTAMP(3),
    "lastOut" TIMESTAMP(3),
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "earlyOutMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BiometricPunch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BiometricMapping_userId_idx" ON "BiometricMapping"("userId");

-- CreateIndex
CREATE INDEX "BiometricPunch_date_idx" ON "BiometricPunch"("date");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricPunch_userId_date_key" ON "BiometricPunch"("userId", "date");

-- AddForeignKey
ALTER TABLE "BiometricMapping" ADD CONSTRAINT "BiometricMapping_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricPunch" ADD CONSTRAINT "BiometricPunch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
