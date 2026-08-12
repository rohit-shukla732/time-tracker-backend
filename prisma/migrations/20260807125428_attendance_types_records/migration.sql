-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "isWithoutPay" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AttendanceType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "color" TEXT NOT NULL DEFAULT '#10b981',
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "isWorking" BOOLEAN NOT NULL DEFAULT false,
    "mapsLeaveStatus" TEXT,
    "mapsHalfDay" TEXT,
    "mapsWithoutPay" BOOLEAN,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "typeId" TEXT NOT NULL,
    "isOverride" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "leaveRequestId" TEXT,
    "markedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceType_name_key" ON "AttendanceType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceType_code_key" ON "AttendanceType"("code");

-- CreateIndex
CREATE INDEX "AttendanceType_active_idx" ON "AttendanceType"("active");

-- CreateIndex
CREATE INDEX "AttendanceType_category_idx" ON "AttendanceType"("category");

-- CreateIndex
CREATE INDEX "AttendanceRecord_date_idx" ON "AttendanceRecord"("date");

-- CreateIndex
CREATE INDEX "AttendanceRecord_typeId_idx" ON "AttendanceRecord"("typeId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_leaveRequestId_idx" ON "AttendanceRecord"("leaveRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_userId_date_key" ON "AttendanceRecord"("userId", "date");

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "AttendanceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Seed default attendance types (idempotent; HR can configure these in settings).
INSERT INTO "AttendanceType" ("id", "name", "code", "description", "category", "color", "isPaid", "isWorking", "mapsLeaveStatus", "mapsHalfDay", "mapsWithoutPay", "active", "isSystem", "sortOrder", "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Present', 'PRESENT', NULL, 'PRESENT', '#10b981', true, true, NULL, NULL, NULL, true, true, 0, NOW(), NOW()),
(gen_random_uuid(), 'Approved Leave', 'APPROVED_LEAVE', NULL, 'LEAVE', '#3b82f6', true, false, 'APPROVED', 'FULL', false, true, false, 10, NOW(), NOW()),
(gen_random_uuid(), 'Approved Half-day Leave', 'APPROVED_HALFDAY_LEAVE', NULL, 'LEAVE', '#60a5fa', true, false, 'APPROVED', 'HALF', false, true, false, 11, NOW(), NOW()),
(gen_random_uuid(), 'Unapproved Leave', 'UNAPPROVED_LEAVE', NULL, 'LEAVE', '#f59e0b', true, false, 'PENDING', 'FULL', false, true, false, 20, NOW(), NOW()),
(gen_random_uuid(), 'Unapproved Half-day Leave', 'UNAPPROVED_HALFDAY_LEAVE', NULL, 'LEAVE', '#fbbf24', true, false, 'PENDING', 'HALF', false, true, false, 21, NOW(), NOW()),
(gen_random_uuid(), 'Approved Leave Without Pay', 'APPROVED_LEAVE_WITHOUT_PAY', NULL, 'LEAVE', '#f97316', false, false, 'APPROVED', 'FULL', true, true, false, 30, NOW(), NOW()),
(gen_random_uuid(), 'Approved Half-day Leave Without Pay', 'APPROVED_HALFDAY_LEAVE_WITHOUT_PAY', NULL, 'LEAVE', '#fdba74', false, false, 'APPROVED', 'HALF', true, true, false, 31, NOW(), NOW()),
(gen_random_uuid(), 'Unapproved Leave Without Pay', 'UNAPPROVED_LEAVE_WITHOUT_PAY', NULL, 'LEAVE', '#fb923c', false, false, 'PENDING', 'FULL', true, true, false, 40, NOW(), NOW()),
(gen_random_uuid(), 'Unapproved Half-day Leave Without Pay', 'UNAPPROVED_HALFDAY_LEAVE_WITHOUT_PAY', NULL, 'LEAVE', '#fed7aa', false, false, 'PENDING', 'HALF', true, true, false, 41, NOW(), NOW()),
(gen_random_uuid(), 'Holiday', 'HOLIDAY', NULL, 'HOLIDAY', '#8b5cf6', true, false, NULL, NULL, NULL, true, true, 50, NOW(), NOW()),
(gen_random_uuid(), 'Weekend', 'WEEKEND', NULL, 'WEEKEND', '#a1a1aa', true, false, NULL, NULL, NULL, true, true, 60, NOW(), NOW()),
(gen_random_uuid(), 'Double Pay', 'DOUBLE_PAY', NULL, 'PRESENT', '#ec4899', true, true, NULL, NULL, NULL, true, true, 70, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;
