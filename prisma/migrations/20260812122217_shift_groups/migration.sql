-- AlterTable
ALTER TABLE "User" ADD COLUMN     "shiftGroupId" TEXT;

-- CreateTable
CREATE TABLE "ShiftGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShiftGroup_name_key" ON "ShiftGroup"("name");

-- CreateIndex
CREATE INDEX "ShiftGroup_isDefault_idx" ON "ShiftGroup"("isDefault");

-- CreateIndex
CREATE INDEX "User_shiftGroupId_idx" ON "User"("shiftGroupId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_shiftGroupId_fkey" FOREIGN KEY ("shiftGroupId") REFERENCES "ShiftGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
