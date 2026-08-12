-- CreateTable
CREATE TABLE "NotificationSetting" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "notifyEmployee" BOOLEAN NOT NULL DEFAULT true,
    "notifyManager" BOOLEAN NOT NULL DEFAULT true,
    "notifyHR" BOOLEAN NOT NULL DEFAULT true,
    "extraEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSetting_eventType_key" ON "NotificationSetting"("eventType");

-- CreateIndex
CREATE INDEX "NotificationSetting_eventType_idx" ON "NotificationSetting"("eventType");
