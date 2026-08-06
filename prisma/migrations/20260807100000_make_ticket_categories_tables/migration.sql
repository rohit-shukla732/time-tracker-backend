-- Make ticket categories/subcategories manageable as tables.
-- Converts the fixed enums TicketCategory / ITSupportSubcategory into
-- TicketCategory / TicketSubcategory tables with admin CRUD support.

-- Rename the old enums first so the new tables can take their names
-- (PostgreSQL tables and types share one namespace).
ALTER TYPE "TicketCategory" RENAME TO "TicketCategoryOld";
ALTER TYPE "ITSupportSubcategory" RENAME TO "ITSupportSubcategoryOld";

-- CreateTable
CREATE TABLE "TicketCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketSubcategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketSubcategory_pkey" PRIMARY KEY ("id")
);

-- Backfill categories from existing ticket data
INSERT INTO "TicketCategory" ("id", "name", "active", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid(), t."category", true, 0, now(), now()
FROM (SELECT DISTINCT "category" FROM "Ticket" WHERE "category" IS NOT NULL) t;

-- Ensure the standard IT_SUPPORT category exists even with no tickets
INSERT INTO "TicketCategory" ("id", "name", "active", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'IT_SUPPORT', true, 0, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "TicketCategory" WHERE "name" = 'IT_SUPPORT');

-- Backfill subcategories from existing ticket data (paired with their category)
INSERT INTO "TicketSubcategory" ("id", "categoryId", "name", "active", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid(), c.id, t."subcategory", true, 0, now(), now()
FROM (SELECT DISTINCT "subcategory", "category" FROM "Ticket" WHERE "subcategory" IS NOT NULL) t
JOIN "TicketCategory" c ON c.name = t."category"::text;

-- Insert the standard subcategories for IT_SUPPORT (missing ones only)
INSERT INTO "TicketSubcategory" ("id", "categoryId", "name", "active", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid(), c.id, d.name, true, d.sortOrder, now(), now()
FROM (VALUES
    ('HARDWARE', 1),
    ('SOFTWARE', 2),
    ('NETWORK', 3),
    ('EMAIL', 4),
    ('ACCESS', 5),
    ('PRINTER', 6),
    ('PHONE', 7),
    ('OTHER', 8)
) AS d(name, sortOrder)
JOIN "TicketCategory" c ON c.name = 'IT_SUPPORT'
WHERE NOT EXISTS (SELECT 1 FROM "TicketSubcategory" s WHERE s.name = d.name);

-- AlterTable (Ticket)
ALTER TABLE "Ticket" ADD COLUMN "categoryId" TEXT,
ADD COLUMN "subcategoryId" TEXT;

UPDATE "Ticket" t
SET "categoryId" = c.id
FROM "TicketCategory" c
WHERE c.name = t."category"::text;

UPDATE "Ticket" t
SET "subcategoryId" = s.id
FROM "TicketSubcategory" s
WHERE s.name = t."subcategory"::text;

-- Any ticket without a category falls back to IT_SUPPORT
UPDATE "Ticket"
SET "categoryId" = (SELECT id FROM "TicketCategory" WHERE "name" = 'IT_SUPPORT' LIMIT 1)
WHERE "categoryId" IS NULL;

-- Drop old enum columns and the (renamed) enum types
ALTER TABLE "Ticket" DROP COLUMN "category",
DROP COLUMN "subcategory";

DROP TYPE "TicketCategoryOld";
DROP TYPE "ITSupportSubcategoryOld";

-- CreateIndex
CREATE UNIQUE INDEX "TicketCategory_name_key" ON "TicketCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TicketSubcategory_name_key" ON "TicketSubcategory"("name");

-- CreateIndex
CREATE INDEX "TicketSubcategory_categoryId_idx" ON "TicketSubcategory"("categoryId");

-- CreateIndex
CREATE INDEX "Ticket_categoryId_idx" ON "Ticket"("categoryId");

-- CreateIndex
CREATE INDEX "Ticket_subcategoryId_idx" ON "Ticket"("subcategoryId");

-- AddForeignKey
ALTER TABLE "TicketSubcategory" ADD CONSTRAINT "TicketSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TicketCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TicketCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "TicketSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
