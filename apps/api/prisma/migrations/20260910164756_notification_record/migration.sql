-- CreateTable
CREATE TABLE "NotificationRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationRecord_userId_isRead_idx" ON "NotificationRecord"("userId", "isRead");

-- CreateIndex
CREATE INDEX "NotificationRecord_userId_createdAt_idx" ON "NotificationRecord"("userId", "createdAt");
