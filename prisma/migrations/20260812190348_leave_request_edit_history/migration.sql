-- CreateTable
CREATE TABLE "LeaveRequestEdit" (
    "id" TEXT NOT NULL,
    "leaveRequestId" TEXT NOT NULL,
    "editedById" TEXT NOT NULL,
    "editedByRole" "Role" NOT NULL,
    "note" TEXT,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveRequestEdit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaveRequestEdit_leaveRequestId_idx" ON "LeaveRequestEdit"("leaveRequestId");

-- CreateIndex
CREATE INDEX "LeaveRequestEdit_editedById_idx" ON "LeaveRequestEdit"("editedById");

-- AddForeignKey
ALTER TABLE "LeaveRequestEdit" ADD CONSTRAINT "LeaveRequestEdit_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequestEdit" ADD CONSTRAINT "LeaveRequestEdit_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
