-- Bind lifecycle tickets to a related employee (existing user or new-joiner free text)
ALTER TABLE "Ticket" ADD COLUMN "relatedEmployeeId" TEXT;
ALTER TABLE "Ticket" ADD COLUMN "relatedName" TEXT;
ALTER TABLE "Ticket" ADD COLUMN "relatedEmail" TEXT;

-- Equipment changes may target a user that does not exist yet (new joiner).
-- userId stays populated once the account exists; subjectName/subjectEmail are
-- the fallback while the account is pending, and are backfilled on link.
ALTER TABLE "EquipmentChange" DROP CONSTRAINT "EquipmentChange_userId_fkey";
ALTER TABLE "EquipmentChange" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "EquipmentChange" ADD CONSTRAINT "EquipmentChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EquipmentChange" ADD COLUMN "subjectName" TEXT;
ALTER TABLE "EquipmentChange" ADD COLUMN "subjectEmail" TEXT;

-- Explicit equipment mapping on checklist template items and per-ticket items
ALTER TABLE "ChecklistTemplateItem" ADD COLUMN "equipmentCategory" "EquipmentCategory";
ALTER TABLE "ChecklistTemplateItem" ADD COLUMN "equipmentAction" "EquipmentAction";
ALTER TABLE "ChecklistItem" ADD COLUMN "equipmentCategory" "EquipmentCategory";
ALTER TABLE "ChecklistItem" ADD COLUMN "equipmentAction" "EquipmentAction";

CREATE INDEX "Ticket_relatedEmployeeId_idx" ON "Ticket"("relatedEmployeeId");
CREATE INDEX "EquipmentChange_subjectEmail_idx" ON "EquipmentChange"("subjectEmail");

-- Infer the subject identity on existing equipment rows so the global ledger
-- resolves them even before the account is linked.
UPDATE "EquipmentChange" e
SET "subjectEmail" = u."email",
    "subjectName"  = u."name"
FROM "User" u
WHERE e."userId" = u."id";

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_relatedEmployeeId_fkey" FOREIGN KEY ("relatedEmployeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;