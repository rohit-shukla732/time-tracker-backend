/*
  Warnings:

  - You are about to drop the column `lateThresholdMins` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `shiftStartTime` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `AddressInfo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AppSwitchEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Asset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AssetAssignment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AssetMaintenance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BankDetails` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Branch` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Company` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ContactInfo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Department` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Designation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DeviceControl` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmploymentInfo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Event` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FamilyInfo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GovernmentID` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LeaveBalance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LeaveRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PersonalInfo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Project` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SessionAppUsage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SessionSummary` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SessionWebsiteUsage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TaskSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WebsiteVisit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `hr_settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `late_coming_records` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `leave_settings` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Role' AND e.enumlabel = 'SENIOR_MANAGER'
  ) THEN
    ALTER TYPE "Role" ADD VALUE 'SENIOR_MANAGER';
  END IF;
END $$;

-- DropForeignKey
ALTER TABLE "AppSwitchEvent" DROP CONSTRAINT "AppSwitchEvent_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "AppSwitchEvent" DROP CONSTRAINT "AppSwitchEvent_userId_fkey";

-- DropForeignKey
ALTER TABLE "AssetAssignment" DROP CONSTRAINT "AssetAssignment_assetId_fkey";

-- DropForeignKey
ALTER TABLE "AssetAssignment" DROP CONSTRAINT "AssetAssignment_assignedBy_fkey";

-- DropForeignKey
ALTER TABLE "AssetAssignment" DROP CONSTRAINT "AssetAssignment_userId_fkey";

-- DropForeignKey
ALTER TABLE "AssetMaintenance" DROP CONSTRAINT "AssetMaintenance_assetId_fkey";

-- DropForeignKey
ALTER TABLE "Branch" DROP CONSTRAINT "Branch_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Department" DROP CONSTRAINT "Department_managerId_fkey";

-- DropForeignKey
ALTER TABLE "DeviceControl" DROP CONSTRAINT "DeviceControl_userId_fkey";

-- DropForeignKey
ALTER TABLE "EmploymentInfo" DROP CONSTRAINT "EmploymentInfo_branchId_fkey";

-- DropForeignKey
ALTER TABLE "EmploymentInfo" DROP CONSTRAINT "EmploymentInfo_companyId_fkey";

-- DropForeignKey
ALTER TABLE "EmploymentInfo" DROP CONSTRAINT "EmploymentInfo_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "EmploymentInfo" DROP CONSTRAINT "EmploymentInfo_designationId_fkey";

-- DropForeignKey
ALTER TABLE "EmploymentInfo" DROP CONSTRAINT "EmploymentInfo_userId_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_userId_fkey";

-- DropForeignKey
ALTER TABLE "LeaveBalance" DROP CONSTRAINT "LeaveBalance_userId_fkey";

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_approvedById_fkey";

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_userId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropForeignKey
ALTER TABLE "SessionAppUsage" DROP CONSTRAINT "SessionAppUsage_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "SessionAppUsage" DROP CONSTRAINT "SessionAppUsage_userId_fkey";

-- DropForeignKey
ALTER TABLE "SessionSummary" DROP CONSTRAINT "SessionSummary_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "SessionSummary" DROP CONSTRAINT "SessionSummary_userId_fkey";

-- DropForeignKey
ALTER TABLE "SessionWebsiteUsage" DROP CONSTRAINT "SessionWebsiteUsage_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "SessionWebsiteUsage" DROP CONSTRAINT "SessionWebsiteUsage_userId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_approvedById_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_assignedTo_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_projectId_fkey";

-- DropForeignKey
ALTER TABLE "TaskSession" DROP CONSTRAINT "TaskSession_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "TaskSession" DROP CONSTRAINT "TaskSession_taskId_fkey";

-- DropForeignKey
ALTER TABLE "TaskSession" DROP CONSTRAINT "TaskSession_userId_fkey";

-- DropForeignKey
ALTER TABLE "WebsiteVisit" DROP CONSTRAINT "WebsiteVisit_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "WebsiteVisit" DROP CONSTRAINT "WebsiteVisit_userId_fkey";

-- DropForeignKey
ALTER TABLE "late_coming_records" DROP CONSTRAINT "late_coming_records_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "lateThresholdMins",
DROP COLUMN "shiftStartTime";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'isArchived'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- DropTable
DROP TABLE IF EXISTS "AddressInfo";

-- DropTable
DROP TABLE "AppSwitchEvent";

-- DropTable
DROP TABLE "Asset";

-- DropTable
DROP TABLE "AssetAssignment";

-- DropTable
DROP TABLE "AssetMaintenance";

-- DropTable
DROP TABLE IF EXISTS "BankDetails";

-- DropTable
DROP TABLE "Branch";

-- DropTable
DROP TABLE "Company";

-- DropTable
DROP TABLE IF EXISTS "ContactInfo";

-- DropTable
DROP TABLE "Department";

-- DropTable
DROP TABLE "Designation";

-- DropTable
DROP TABLE "DeviceControl";

-- DropTable
DROP TABLE "EmploymentInfo";

-- DropTable
DROP TABLE "Event";

-- DropTable
DROP TABLE IF EXISTS "FamilyInfo";

-- DropTable
DROP TABLE IF EXISTS "GovernmentID";

-- DropTable
DROP TABLE "LeaveBalance";

-- DropTable
DROP TABLE "LeaveRequest";

-- DropTable
DROP TABLE "Notification";

-- DropTable
DROP TABLE IF EXISTS "PersonalInfo";

-- DropTable
DROP TABLE "Project";

-- DropTable
DROP TABLE "Session";

-- DropTable
DROP TABLE "SessionAppUsage";

-- DropTable
DROP TABLE "SessionSummary";

-- DropTable
DROP TABLE "SessionWebsiteUsage";

-- DropTable
DROP TABLE "Task";

-- DropTable
DROP TABLE "TaskSession";

-- DropTable
DROP TABLE "WebsiteVisit";

-- DropTable
DROP TABLE "hr_settings";

-- DropTable
DROP TABLE "late_coming_records";

-- DropTable
DROP TABLE "leave_settings";

-- DropEnum
DROP TYPE "AccountBase";

-- DropEnum
DROP TYPE "AccountType";

-- DropEnum
DROP TYPE "AssetCategory";

-- DropEnum
DROP TYPE "AssetCondition";

-- DropEnum
DROP TYPE "AssetStatus";

-- DropEnum
DROP TYPE "AssetType";

-- DropEnum
DROP TYPE "AssignmentStatus";

-- DropEnum
DROP TYPE "EmployeeStatus";

-- DropEnum
DROP TYPE "Gender";

-- DropEnum
DROP TYPE "JobType";

-- DropEnum
DROP TYPE "LeaveStatus";

-- DropEnum
DROP TYPE "LeaveType";

-- DropEnum
DROP TYPE "MaintenanceStatus";

-- DropEnum
DROP TYPE "MaintenanceType";

-- DropEnum
DROP TYPE "MaritalStatus";

-- DropEnum
DROP TYPE "NotificationType";

-- DropEnum
DROP TYPE "Pronoun";

-- DropEnum
DROP TYPE "TaskPriority";

-- DropEnum
DROP TYPE "TaskStatus";

-- DropEnum
DROP TYPE "TransferType";
