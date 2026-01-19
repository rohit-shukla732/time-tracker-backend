-- CreateTable
CREATE TABLE "late_coming_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "lateCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "late_coming_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "late_coming_records_userId_idx" ON "late_coming_records"("userId");

-- CreateIndex
CREATE INDEX "late_coming_records_year_month_idx" ON "late_coming_records"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "late_coming_records_userId_year_month_key" ON "late_coming_records"("userId", "year", "month");

-- AddForeignKey
ALTER TABLE "late_coming_records" ADD CONSTRAINT "late_coming_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
