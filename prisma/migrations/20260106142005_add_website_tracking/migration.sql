-- CreateTable
CREATE TABLE "WebsiteVisit" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "fromWebsite" TEXT,
    "toWebsite" TEXT,
    "durationMs" BIGINT,
    "browser" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "epochMs" BIGINT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionWebsiteUsage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "website" TEXT NOT NULL,
    "browser" TEXT,
    "timeMs" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionWebsiteUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebsiteVisit_sessionId_idx" ON "WebsiteVisit"("sessionId");

-- CreateIndex
CREATE INDEX "WebsiteVisit_userId_idx" ON "WebsiteVisit"("userId");

-- CreateIndex
CREATE INDEX "WebsiteVisit_toWebsite_idx" ON "WebsiteVisit"("toWebsite");

-- CreateIndex
CREATE INDEX "WebsiteVisit_browser_idx" ON "WebsiteVisit"("browser");

-- CreateIndex
CREATE INDEX "SessionWebsiteUsage_sessionId_idx" ON "SessionWebsiteUsage"("sessionId");

-- CreateIndex
CREATE INDEX "SessionWebsiteUsage_userId_idx" ON "SessionWebsiteUsage"("userId");

-- AddForeignKey
ALTER TABLE "WebsiteVisit" ADD CONSTRAINT "WebsiteVisit_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("sessionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteVisit" ADD CONSTRAINT "WebsiteVisit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionWebsiteUsage" ADD CONSTRAINT "SessionWebsiteUsage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("sessionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionWebsiteUsage" ADD CONSTRAINT "SessionWebsiteUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
