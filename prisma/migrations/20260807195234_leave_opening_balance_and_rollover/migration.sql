-- AlterTable
ALTER TABLE "LeaveType" ADD COLUMN     "rolloverMonthly" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rolloverYearly" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "LeaveOpeningBalance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveOpeningBalance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaveOpeningBalance_userId_idx" ON "LeaveOpeningBalance"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveOpeningBalance_userId_leaveTypeId_year_key" ON "LeaveOpeningBalance"("userId", "leaveTypeId", "year");

-- AddForeignKey
ALTER TABLE "LeaveOpeningBalance" ADD CONSTRAINT "LeaveOpeningBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveOpeningBalance" ADD CONSTRAINT "LeaveOpeningBalance_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
