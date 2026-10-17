-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CaseStudy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "title" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "slug" TEXT NOT NULL DEFAULT '',
    "slotNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "metrics" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'IN_PRODUCTION',
    "imagePath" TEXT,
    "imageAlt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "CaseStudy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CaseStudy" ("clientName", "createdAt", "createdById", "description", "id", "metrics", "slotNumber", "slug", "status", "title", "updatedAt") SELECT "clientName", "createdAt", "createdById", "description", "id", "metrics", "slotNumber", "slug", "status", "title", "updatedAt" FROM "CaseStudy";
DROP TABLE "CaseStudy";
ALTER TABLE "new_CaseStudy" RENAME TO "CaseStudy";
CREATE INDEX "CaseStudy_status_slotNumber_idx" ON "CaseStudy"("status", "slotNumber");
CREATE INDEX "CaseStudy_status_sortOrder_idx" ON "CaseStudy"("status", "sortOrder");
CREATE UNIQUE INDEX "CaseStudy_slug_key" ON "CaseStudy"("slug");
CREATE UNIQUE INDEX "CaseStudy_slotNumber_key" ON "CaseStudy"("slotNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
