-- CreateTable
CREATE TABLE "Attachment" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storedFilename" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "isRemoved" BOOLEAN NOT NULL DEFAULT false,
    "removedAt" TIMESTAMP(3),
    "removalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attachment_ticketId_idx" ON "Attachment"("ticketId");

-- CreateIndex
CREATE INDEX "Attachment_isRemoved_idx" ON "Attachment"("isRemoved");

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
