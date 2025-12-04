-- CreateTable
CREATE TABLE "DeviceControl" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "forceStop" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "stoppedBy" TEXT,
    "stoppedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceControl_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceControl_userId_key" ON "DeviceControl"("userId");

-- AddForeignKey
ALTER TABLE "DeviceControl" ADD CONSTRAINT "DeviceControl_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
