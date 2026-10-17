-- AlterTable
ALTER TABLE "CaseStudy" ADD COLUMN "slug" TEXT NOT NULL DEFAULT '';

-- Backfill: every row keeps a usable, guaranteed-unique URL segment so the
-- public detail route never 404s on legacy data (slotNumber is unique).
UPDATE "CaseStudy" SET "slug" = 'case-study-' || "slotNumber" WHERE "slug" = '';

-- CreateIndex
CREATE UNIQUE INDEX "CaseStudy_slug_key" ON "CaseStudy"("slug");
