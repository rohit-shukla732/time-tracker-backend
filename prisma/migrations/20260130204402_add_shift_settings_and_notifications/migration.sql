-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LATE_ARRIVAL', 'TASK_ASSIGNED', 'TASK_COMPLETED', 'TICKET_ASSIGNED', 'TICKET_UPDATED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'GENERAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lateThresholdMins" INTEGER DEFAULT 15,
ADD COLUMN     "shiftStartTime" TEXT;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
