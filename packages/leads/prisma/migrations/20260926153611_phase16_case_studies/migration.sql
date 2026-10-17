-- CreateTable
CREATE TABLE "CaseStudy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "title" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "slotNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "metrics" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'IN_PRODUCTION',
    "createdById" TEXT NOT NULL,
    CONSTRAINT "CaseStudy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CaseStudy_status_slotNumber_idx" ON "CaseStudy"("status", "slotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CaseStudy_slotNumber_key" ON "CaseStudy"("slotNumber");
