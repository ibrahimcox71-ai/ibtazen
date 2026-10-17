CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "bio" TEXT,
    "photoUrl" TEXT,
    "linkedinUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "TeamMember_published_sortOrder_idx" ON "TeamMember"("published", "sortOrder");

INSERT INTO "TeamMember" ("id", "name", "role", "linkedinUrl", "published", "sortOrder", "updatedAt")
VALUES ('cteamibhk2026101100000000000', 'Ibrahim Khan', 'Founder', 'https://www.linkedin.com/in/imibrahimkhan/', false, 0, CURRENT_TIMESTAMP);
