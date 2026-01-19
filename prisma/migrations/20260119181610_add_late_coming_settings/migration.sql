-- AlterTable
ALTER TABLE "leave_settings" ADD COLUMN     "lateComingCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lateThresholdMinutes" INTEGER NOT NULL DEFAULT 15;
