-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('SUPPORT', 'ONBOARDING', 'OFFBOARDING');

-- CreateEnum
CREATE TYPE "EquipmentCategory" AS ENUM ('LAPTOP', 'MONITOR', 'KEYBOARD', 'MOUSE', 'HEADSET', 'SEAT', 'OTHER');

-- CreateEnum
CREATE TYPE "EquipmentAction" AS ENUM ('ISSUED', 'REPLACED', 'RETURNED', 'RELOCATED');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "type" "TicketType" NOT NULL DEFAULT 'SUPPORT';

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneById" TEXT,
    "doneAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentChange" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketId" TEXT,
    "category" "EquipmentCategory" NOT NULL,
    "action" "EquipmentAction" NOT NULL,
    "label" TEXT,
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" TEXT NOT NULL,
    "type" "TicketType" NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ticket_type_idx" ON "Ticket"("type");

-- CreateIndex
CREATE INDEX "ChecklistItem_ticketId_idx" ON "ChecklistItem"("ticketId");

-- CreateIndex
CREATE INDEX "ChecklistItem_doneById_idx" ON "ChecklistItem"("doneById");

-- CreateIndex
CREATE INDEX "EquipmentChange_userId_idx" ON "EquipmentChange"("userId");

-- CreateIndex
CREATE INDEX "EquipmentChange_ticketId_idx" ON "EquipmentChange"("ticketId");

-- CreateIndex
CREATE INDEX "EquipmentChange_category_idx" ON "EquipmentChange"("category");

-- CreateIndex
CREATE INDEX "EquipmentChange_changedAt_idx" ON "EquipmentChange"("changedAt");

-- CreateIndex
CREATE INDEX "ChecklistTemplate_type_idx" ON "ChecklistTemplate"("type");

-- CreateIndex
CREATE INDEX "ChecklistTemplate_active_idx" ON "ChecklistTemplate"("active");

-- CreateIndex
CREATE INDEX "ChecklistTemplateItem_templateId_idx" ON "ChecklistTemplateItem"("templateId");

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_doneById_fkey" FOREIGN KEY ("doneById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentChange" ADD CONSTRAINT "EquipmentChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentChange" ADD CONSTRAINT "EquipmentChange_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentChange" ADD CONSTRAINT "EquipmentChange_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplateItem" ADD CONSTRAINT "ChecklistTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
