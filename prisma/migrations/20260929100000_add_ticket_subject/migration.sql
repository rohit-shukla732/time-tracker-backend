CREATE TABLE "TicketSubject" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "employeeId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketSubject_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ChecklistItem"
ADD COLUMN "subjectId" TEXT;

ALTER TABLE "EquipmentChange"
ADD COLUMN "subjectId" TEXT;

CREATE INDEX "TicketSubject_ticketId_idx"
ON "TicketSubject"("ticketId");

CREATE INDEX "TicketSubject_employeeId_idx"
ON "TicketSubject"("employeeId");

CREATE INDEX "TicketSubject_email_idx"
ON "TicketSubject"("email");

CREATE INDEX "ChecklistItem_subjectId_idx"
ON "ChecklistItem"("subjectId");

CREATE INDEX "EquipmentChange_subjectId_idx"
ON "EquipmentChange"("subjectId");

ALTER TABLE "TicketSubject"
ADD CONSTRAINT "TicketSubject_ticketId_fkey"
FOREIGN KEY ("ticketId")
REFERENCES "Ticket"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "TicketSubject"
ADD CONSTRAINT "TicketSubject_employeeId_fkey"
FOREIGN KEY ("employeeId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "ChecklistItem"
ADD CONSTRAINT "ChecklistItem_subjectId_fkey"
FOREIGN KEY ("subjectId")
REFERENCES "TicketSubject"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "EquipmentChange"
ADD CONSTRAINT "EquipmentChange_subjectId_fkey"
FOREIGN KEY ("subjectId")
REFERENCES "TicketSubject"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
